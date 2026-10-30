import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
export const commands = [
 new SlashCommandBuilder().setName("ping").setDescription("Check whether the bot is responsive.").toJSON(),
 new SlashCommandBuilder().setName("help").setDescription("Show the available bot commands.").toJSON(),
 new SlashCommandBuilder().setName("testupdate").setDescription("Preview a fake value update without posting publicly.").setContexts(InteractionContextType.Guild).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),
];
