import {
    Client,
    CommandInteraction,
    Guild,
    GuildMember,
    Message,
    TextBasedChannel,
    TextChannel,
    VoiceChannel,
} from "discord.js";
import ytdlDiscord from "ytdl-core-discord";
import ytdl from "ytdl-core";
import {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    AudioResource,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    VoiceConnection,
    DiscordGatewayAdapterCreator,
    VoiceConnectionState,
    AudioPlayer,
    CreateAudioPlayerOptions,
} from "@discordjs/voice";
import { Logger } from "../utils/Logger.js";

interface Metadata extends ytdl.videoInfo {
    requester: GuildMember;
}

interface Track {
    url: string;
    metadata: Metadata;
}

export class MusicPlayer {
    private client: Client;
    private guild: Guild;
    private channel: TextBasedChannel;
    private queue: Track[];
    private queueLock: boolean;
    private readyLock: boolean;
    private np: Message;
    private volume: number;
    private current: AudioResource<Metadata>;
    private connection: VoiceConnection;
    private player: AudioPlayer;
    public destroyed: boolean;

    constructor(interaction: CommandInteraction) {
        this.client = interaction.client;
        this.guild = interaction.guild;
        this.channel = interaction.channel;

        this.queue = [];
        this.queueLock = false;
        this.readyLock = false;
        this.np = null;
        this.volume = 0.2;
        this.current = null;
        this.destroyed = false;
        // this.looping = false

        this.connection = joinVoiceChannel({
            channelId: (interaction.member as GuildMember).voice.channelId,
            guildId: this.guild.id,
            selfMute: false,
            selfDeaf: true,
            adapterCreator: this.guild.voiceAdapterCreator as any, // ¯\_(ツ)_/¯
        });

        this.connection.on("stateChange", async (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (
                    newState.reason ===
                        VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
                ) {
                    /*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
                    try {
                        await entersState(
                            this.connection,
                            VoiceConnectionStatus.Connecting,
                            5000
                        );
                        // Probably moved voice channel
                    } catch {
                        this.destroy();
                        // Probably removed from voice channel
                    }
                } else if (this.connection.rejoinAttempts < 5) {
                    /*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					*/
                    setTimeout(() => this.connection.rejoin(), 5000);
                } else {
                    /*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
                    this.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                /*
					Once destroyed, stop the subscription
				*/
                this.destroy();
            } else if (
                !this.readyLock &&
                (newState.status === VoiceConnectionStatus.Connecting ||
                    newState.status === VoiceConnectionStatus.Signalling)
            ) {
                /*
					In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					before destroying the voice connection. This stops the voice connection permanently existing in one of these
					states.
				*/
                this.readyLock = true;
                try {
                    await entersState(
                        this.connection,
                        VoiceConnectionStatus.Ready,
                        20000
                    );
                    this.readyLock = false;
                } catch {
                    if (
                        this.connection.state.status !==
                        VoiceConnectionStatus.Destroyed
                    )
                        this.destroy();
                }
            }
        });

        this.player = createAudioPlayer({
            behaviors: {
                maxMissedFrames: 99999999,
            },
            debug: Boolean(process.env.DEBUG),
        });
        // register event listener

        // Configure audio player
        this.player.on("stateChange", async (oldState, newState) => {
            if (
                newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle
            ) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                if (!this.np.deleted && this.np.deletable)
                    await this.np.delete();
                this.np = null;
                this.current = null;
                this.processQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
            }
        });

        this.player.on("error", async (error) => {
            await this.channel.send("嗯....似乎沒辦法唱下去的樣子...");
        });

        this.connection.subscribe(this.player);
    }
    /**
     * Create a youtube resource by url
     * @param  url youtube url
     * @param requester requester guild member object
     * @returns youtube resource contains metadata
     */
    public static async createResource(
        url: string,
        requester: GuildMember
    ): Promise<Track> {
        try {
            const metadata = { ...(await ytdl.getBasicInfo(url)), requester };
            return { url: url, metadata: metadata };
        } catch (err) {
            throw new Error("找不到指定的Youtube影片呢...");
        }
    }

    /**
     * Add a track to music player queue
     * @param youtube resource contains metadata
     */
    public add(resource: Track) {
        try {
            this.queue.push(resource);
            this.processQueue();
        } catch (err) {
            throw err;
        }
    }
    public addList(resources: Track[]) {
        try {
            resources.forEach((resource) => this.queue.push(resource));
            this.processQueue();
        } catch (err) {
            throw err;
        }
    }
    public skip() {
        this.player.stop();
    }
    public pause() {
        this.player.pause();
    }
    public resume() {
        this.player.unpause();
    }
    /**
     * Attempts to play a Track from the queue
     */
    private async processQueue() {
        if (
            this.destroyed ||
            this.queueLock ||
            this.player.state.status !== AudioPlayerStatus.Idle ||
            this.queue.length === 0
        ) {
            if (this.queue.length === 0) {
                await this.channel.send(
                    "清單中的歌曲都唱完啦! 那我就先去休息了!"
                );
                this.destroy();
            }
            return;
        }

        this.queueLock = true;

        const nextTrack = this.queue.shift();
        try {
            const stream = await ytdlDiscord(nextTrack.url);
            const resource = createAudioResource(stream, {
                metadata: nextTrack.metadata,
                inputType: StreamType.Opus,
            });
            this.current = resource;
            this.np = await this.channel.send(
                `**正在撥放:** \`${this.current.metadata.videoDetails.title}\` 點歌者: \`${this.current.metadata.requester.displayName}\``
            );
            this.player.play(resource);
            this.queueLock = false;
        } catch (err) {
            this.queueLock = false;
            return this.processQueue();
        }
    }

    /**
     * Disconnect and cleanup the player.
     */
    public destroy() {
        if (this.connection.state.status !== VoiceConnectionStatus.Destroyed)
            this.connection.destroy();
        this.player.stop(true);
        this.queue = null;
        this.destroyed = true;
    }
    /**
     * Change connected voice channel
     *
     * if new channel and old channel is the same, return true.
     * @returns is success
     */
    public changeChannel(channel) {
        if (this.channel.id !== channel.id)
            return this.connection.rejoin({
                channelId: channel.id,
                selfDeaf: true,
                selfMute: false,
            });
        return true;
    }
    public getPlayerStatus() {
        return this.player.state.status;
    }
    public getNowPlayingMessageContent() {
        return this.np.content;
    }
    public getQueue() {
        return Array.from(this.queue);
    }
}
