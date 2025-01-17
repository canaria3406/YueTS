import PlayerManager from "../../music/PlayerManager";
import { AudioPlayerStatus } from "@discordjs/voice";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { GuildOnly } from "../../guards/GuildOnly";

@Discord()
class PauseCommand {
    @Slash({ name: "pause", description: "讓Yue暫停唱歌" })
    @Guard(GuildOnly)
    async execute(interaction: CommandInteraction) {
        const user = interaction.member;

        if (!user)
            return await interaction.reply("似乎在私聊時不能做這些呢....");
        else if (interaction.guild && !PlayerManager.exist(interaction.guild))
            return await interaction.reply("嗯? 我沒有在唱歌喔~");

        const musicPlayer = PlayerManager.get(interaction);
        if (musicPlayer.getPlayerStatus() === AudioPlayerStatus.Paused)
            return await interaction.reply(
                "我現在已經停下來了啦 <:i_yoshino:583658336054935562>"
            );

        musicPlayer.pause();
        await interaction.reply("那我就先停下來哦....");
    }
}
