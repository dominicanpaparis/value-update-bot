import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { commands } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error(
    "DISCORD_BOT_TOKEN is missing. Add it to Replit Secrets or services/discord-bot/.env.",
  );
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  console.info(`Connected to Discord as ${readyClient.user.tag}.`);

  try {
    await readyClient.application.commands.set(commands, guildId || undefined);
    console.info(
      guildId
        ? `Registered slash commands in server ${guildId}.`
        : "Registered global slash commands.",
    );
  } catch (error) {
    console.error("Failed to register slash commands:", error);
    await readyClient.destroy();
    process.exitCode = 1;
  }
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
          "Available commands:\n" +
          "`/ping` — check the bot and gateway response time.\n" +
          "`/help` — show this command list.\n" +
          "`/supremeupdate` — preview a Supreme Values update announcement.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === "supremeupdate") {
      const now = new Date();
      const timestamp = Math.floor(now.getTime() / 1000);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🔔 Supreme Values Update")
        .setDescription("Supreme Values has received a new value update!")
        .addFields(
          {
            name: "Demo ping",
            value: "`@Supreme Updates` — placeholder only; no one is notified.",
            inline: false,
          },
          {
            name: "Updated",
            value: `<t:${timestamp}:F>`,
            inline: false,
          },
        )
        .setTimestamp(now)
        .setFooter({ text: "Supreme Update Tracker • Daylight" });

      const button = new ButtonBuilder()
        .setLabel("View Supreme Values")
        .setStyle(ButtonStyle.Link)
        .setURL("https://supremevalues.com");
      const actionRow = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        embeds: [embed],
        components: [actionRow],
        allowedMentions: { parse: [] },
      });
    }
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "The command could not be completed. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "The command could not be completed. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

try {
  await client.login(token);
} catch (error) {
  console.error("Discord login failed. Check the bot token and application status.");
  console.error(error);
  process.exitCode = 1;
}
