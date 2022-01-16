import { SlashCommandBuilder } from "@discordjs/builders";
import { info } from "../../../graphics/embeds.js";
import { CommandInterface } from "../../CommandInterface";

const command: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName("xhelp")
        .setDescription("觀看Yue的特殊指令說明"),
    async execute(interaction) {
        const embed = info(
            interaction.client,
            "「有些事情 Yue是指跟喜歡的人才做喔~ :heart:」"
        );
        embed.addFields(
            {
                name: "reply add 【全域】 【關鍵字】 【內容】",
                value: "讓Yue在下次聽到你說這句話時回應你",
                inline: false,
            },
            {
                name: "reply del 【全域】 【關鍵字】",
                value: "讓Yue在下次聽到你說這句話時不再回應你",
                inline: false,
            },
            {
                name: "reply list 【全域】",
                value: "讓Yue把你以前下過的指示念給你聽讓你複習",
                inline: false,
            }
            // TODO formatted message reply
            // {
            //     name: "replyf add 【關鍵字】 【內容】",
            //     value: "(特殊)同amr 但要加入{message}來代換字詞，且關鍵字後要留至少一空白，空白後接代換字詞",
            //     inline: false,
            // },
            // {
            //     name: "replyf del 【關鍵字】",
            //     value: "(特殊)同dmr 但是是刪除amrm的內容",
            //     inline: false,
            // },
            // {
            //     name: "replyf list",
            //     value: "(特殊)列出已下過的格式化回覆清單",
            //     inline: false,
            // }
        );
        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
