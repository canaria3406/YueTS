import { CommandInteraction } from "discord.js";
import { info } from "../../graphics/embeds";
import { Image } from "../../database/models/image";
import { ImageType } from "../../image/ImageType";
import { Discord, Slash } from "discordx";

@Discord()
class InfoCommand {
    @Slash({ name: "info", description: "查看系統狀況" })
    async execute(interaction: CommandInteraction) {
        const embed = info(
            interaction.client,
            "「嗯.....差不多現在就是這樣子吧.....」"
        );
        embed.addFields(
            {
                name: "和你的距離",
                value: `${interaction.client.ws.ping}`,
                inline: false,
            },
            {
                name: "pic圖庫數量",
                value: (await Image.amount(ImageType.PIC)).toString(),
                inline: true,
            },
            {
                name: "wtfpic圖庫數量",
                value: (await Image.amount(ImageType.WTFPIC)).toString(),
                inline: true,
            },
            {
                name: "hpic圖庫數量",
                value: (await Image.amount(ImageType.HPIC)).toString(),
                inline: true,
            }
        );
        await interaction.reply({ embeds: [embed] });
    }
}
