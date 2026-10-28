# Discord Bot Starter

A Node.js bot with `/ping`, `/help`, `/supremeupdate`, and `/testupdate`, plus a Phase 1 RBLXValue change detector.

`/supremeupdate` posts a demo embed with a literal, non-notifying `@Supreme Updates` placeholder, a timestamp, and a link button. It does not fetch or include Supreme Values item data.

The automatic checker reads RBLXValue's documented v2 API only. It monitors the global dataset timestamp and stores a baseline/snapshot locally. Phase 1 logs summary counts only; it does not send automatic Discord announcements.

`/testupdate` is available in servers to members with **Manage Server** permission. It privately previews the future update embed with fake sample items. It does not call RBLXValue or read/write the saved snapshot.

## Discord setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications) and add a bot.
2. Copy the bot token from the application's **Bot** page. Store it as the `DISCORD_BOT_TOKEN` Replit Secret. Never commit or share the token.
3. Under **OAuth2 → URL Generator**, select the `bot` and `applications.commands` scopes, then use the generated URL to add the bot to your server.
4. Store the RBLXValue API key as the `RBLXVALUE_API_KEY` Replit Secret.
5. Start the **Discord Bot** workflow. On startup, the bot registers its slash commands and initializes or resumes the update monitor.

The bot only needs the `Guilds` gateway intent. It does not require privileged intents or additional server permissions for these commands.

## Phase 1 update detection

- The bot checks `/v2/meta` every 15 minutes. An unchanged dataset timestamp uses one API request.
- When the timestamp changes, it fetches `/v2/items` in pages of up to 100 using `limit` and `offset`, then verifies the timestamp again before saving.
- Requests are spaced at least three seconds apart (at most 20 requests per minute), below the free plan's 30 requests per minute.
- The local snapshot is stored at `services/discord-bot/data/update-state.json`. It is atomically replaced and excluded from Git. It survives bot workflow restarts in this workspace.
- The first run saves a baseline without treating existing items as changes. Later checks compare values, demand, stability, and new items. Duplicate dataset timestamps are skipped.
- Logs show item/change counts only; API keys and full API responses are never logged.
- Free-plan production announcements must include `Data from rblxvalue.com`. The test preview labels its sample data as fake.

## Run locally

Copy `.env.example` to `.env`, fill in credentials locally, then run:

```sh
pnpm --filter @workspace/discord-bot run dev
```

The local `.env` file is ignored by Git. In Replit, keep the token in Secrets instead.

## Faster command testing

Without `DISCORD_GUILD_ID`, the bot registers global commands, which can take time to appear in Discord. To test right away, set the non-secret `DISCORD_GUILD_ID` environment variable to your server's ID. Restart the bot after changing it. When set, commands are registered only in that server.
