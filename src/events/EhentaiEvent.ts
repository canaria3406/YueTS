import axios from "axios";
import { ehentaiBookPreviewEmbed } from "../graphics/embeds";
import { GalleryMetadata, GDataResponse } from "ehentai-api";
import { ArgsOf, Discord, On } from "discordx";

@Discord()
class EhentaiEvent {
    @On({ event: "messageCreate" })
    async execute([message]: ArgsOf<"messageCreate">) {
        if (message.author.bot) return;
        const result = message.content.match(
            /https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)\//
        );
        if (result) {
            // const url = result[0];
            const galleryId = parseInt(result[1]);
            const galleryToken = result[2];

            await message.channel.sendTyping();

            const resp = await axios.post("https://api.e-hentai.org/api.php", {
                method: "gdata",
                gidlist: [[galleryId, galleryToken]],
                namespace: 1,
            });

            const galleryMetadata: GalleryMetadata = (
                resp.data as GDataResponse
            ).gmetadata[0];
            const embed = ehentaiBookPreviewEmbed(
                message.client,
                galleryMetadata
            );

            await message.channel.send({ embeds: [embed] });
        }
    }
}
