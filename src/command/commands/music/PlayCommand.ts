import { SlashCommandBuilder } from "@discordjs/builders";
import PlayerManager from "../../../core/music/PlayerManager";
import ytpl from "ytpl";
import ytsr, { Video } from "ytsr";
import { info, selectMenuEmbed } from "../../../core/graphics/embeds";
import { Reaction } from "../../../core/graphics/Reaction";
import { CommandInteraction, GuildMember } from "discord.js";
import { Logger } from "../../../core/utils/Logger";
import { MusicPlayer } from "../../../core/music/MusicPlayer";
import { command } from "../../../decorator/command/command";

async function createResourceFromUrl(
    interaction: CommandInteraction,
    musicPlayer: MusicPlayer,
    requester,
    url: string
): Promise<void> {
    Logger.instance.debug(`Creating resource from ${url}`);
    const resource = await musicPlayer.createResource(
        url,
        requester as GuildMember
    );
    if (resource) {
        Logger.instance.debug("Resource created");
        await interaction.editReply(
            `\`\`\`[已增加 ${resource.metadata.videoInfo.title} 到撥放序列中]\`\`\``
        );
        musicPlayer.add(resource);
    }
}

export class PlayCommand {
    @command(
        new SlashCommandBuilder()
            .setName("play")
            .setDescription("讓Yue唱Youtube有的歌曲")
            .addStringOption((option) =>
                option
                    .setName("target")
                    .setDescription("youtube連結或搜尋關鍵字")
                    .setRequired(true)
            )
            .toJSON()
    )
    async execute(interaction: CommandInteraction) {
        const user = interaction.member;
        const target = interaction.options.getString("target");

        if (!user) {
            await interaction.reply("似乎在私聊時不能做這些呢....");
            return;
        } else if (!(interaction.member as GuildMember).voice.channelId) {
            await interaction.reply("看起來你不在語音頻道裡呢...");
            return;
        }
        await interaction.deferReply();

        const musicPlayer = PlayerManager.get(interaction);

        const regex =
            /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

        // create resource
        if (target.match(regex) ? true : false)
            await createResourceFromUrl(interaction, musicPlayer, user, target);
        else {
            try {
                // playlist
                const playlist = await ytpl(target, { limit: Infinity });
                const tasks = [];
                for (const item of playlist.items)
                    tasks.push(
                        musicPlayer.createResource(
                            item.shortUrl,
                            user as GuildMember
                        )
                    );
                const resources = await Promise.all(tasks);
                Logger.instance.debug("Resources created");
                await interaction.editReply(
                    `\`\`\`[已增加 ${playlist.title} 的所有歌曲到撥放序列中]\`\`\``
                );
                musicPlayer.addList(resources);
            } catch (err) {
                // use key word search
                const searchResult = await ytsr(target, { limit: 10 });
                if (searchResult.items.length === 0) {
                    await interaction.editReply(
                        "我找不到有這個關鍵字的歌曲呢..."
                    );
                    return;
                }
                let description =
                    "「我找到了這些結果，在下面選一個吧!」(時限60秒)";
                const result: Video[] = [];
                for (
                    let i = 0;
                    result.length < 5 && i < searchResult.items.length;
                    i++
                ) {
                    if (searchResult.items[i].type === "video") {
                        const item = searchResult.items[i] as Video;
                        result.push(item);
                        description += `
${result.length}. ${Reaction.item} [${item.title}](${item.url}) (${item.duration})`;
                    }
                }

                const embed = info(interaction.client, description);
                await selectMenuEmbed(
                    interaction,
                    embed,
                    result.length,
                    async (option: number) =>
                        await createResourceFromUrl(
                            interaction,
                            musicPlayer,
                            user,
                            result[option].url
                        )
                );
            }
        }
    }
}
