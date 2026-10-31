import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";

import { commands } from "./commands.js";
import { startUpdateMonitor } from "./update-monitor.js";
import {
  buildValueUpdateEmbeds,
  createDemoChanges,
} from "./update-formatter.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error(
    "DISCORD_BOT_TOKEN is missing. Add it to your environment variables or services/discord-bot/.env.",
  );
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function postAutomaticUpdate(summary) {
  const id = process.env.DISCORD_UPDATE_CHANNEL_ID?.trim();

  if (!id) {
    throw new Error(
      "DISCORD_UPDATE_CHANNEL_ID is missing; cannot post automatic updates.",
    );
  }

  const channel = await client.channels.fetch(id);

  if (!channel?.isTextBased() || typeof channel.send !== "function") {
    throw new Error(
      "DISCORD_UPDATE_CHANNEL_ID is not a sendable text channel.",
    );
  }

  await channel.send({
    embeds: buildValueUpdateEmbeds(summary.changedItems),
    allowedMentions: { parse: [] },
  });
}

client.once(Events.ClientReady, async (ready) => {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  console.info(`Connected to Discord as ${ready.user.tag}.`);

  try {
    await ready.application.commands.set(commands, guildId || undefined);

    console.info(
      guildId
        ? `Registered slash commands in server ${guildId}.`
        : "Registered global slash commands.",
    );
  } catch (error) {
    console.error("Failed to register slash commands:", error);
    await ready.destroy();
    process.exitCode = 1;
    return;
  }

  startUpdateMonitor({
    onUpdate: postAutomaticUpdate,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "ping") {
      await interaction.reply({
        content: `Pong! Gateway latency: ${Math.round(client.ws.ping)} ms.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === "help") {
      await interaction.reply({
        content:
          "Available commands:\n`/ping` — check the bot.\n`/help` — show this list.\n`/testupdate` — preview fake MM2 update data privately.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === "testupdate") {
      await interaction.reply({
        embeds: buildValueUpdateEmbeds(createDemoChanges(), {
          preview: true,
        }),
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);

    const payload = {
      content: "The command could not be completed. Please try again.",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.on(Events.Error, (error) =>
  console.error("Discord client error:", error),
);

try {
  await client.login(token);
} catch (error) {
  console.error(
    "Discord login failed. Check the bot token and application status.",
  );
  console.error(error);
  process.exitCode = 1;
}
