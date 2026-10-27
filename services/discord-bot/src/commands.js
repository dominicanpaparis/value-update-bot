import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responsive.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show the available bot commands.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("supremeupdate")
    .setDescription("Preview a Supreme Values update announcement.")
    .toJSON(),
];
