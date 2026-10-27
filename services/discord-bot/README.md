# Discord Bot Starter

A Node.js bot with `/ping`, `/help`, and `/supremeupdate` slash commands, built with discord.js.

`/supremeupdate` posts a demo embed with a literal, non-notifying `@Supreme Updates` placeholder, a timestamp, and a link button. It does not fetch or include Supreme Values item data.

## Discord setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications) and add a bot.
2. Copy the bot token from the application's **Bot** page. Store it as the `DISCORD_BOT_TOKEN` Replit Secret. Never commit or share the token.
3. Under **OAuth2 → URL Generator**, select the `bot` and `applications.commands` scopes, then use the generated URL to add the bot to your server.
4. Start the **Discord Bot** workflow. On startup, the bot registers `/ping` and `/help`.

The bot only needs the `Guilds` gateway intent. It does not require privileged intents or additional server permissions for these commands.

## Run locally

Copy `.env.example` to `.env`, add your bot token, then run:

```sh
pnpm --filter @workspace/discord-bot run dev
```

The local `.env` file is ignored by Git. In Replit, keep the token in Secrets instead.

## Faster command testing

Without `DISCORD_GUILD_ID`, the bot registers global commands, which can take time to appear in Discord. To test right away, set the non-secret `DISCORD_GUILD_ID` environment variable to your server's ID. Restart the bot after changing it. When set, commands are registered only in that server.
