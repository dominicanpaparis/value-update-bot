# Discord Bot Starter

A Node.js Discord bot with manual demo commands and Phase 1 RBLXValue update detection.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/discord-bot run dev` — run the Discord bot locally
- `pnpm --filter @workspace/discord-bot run check` — check bot JavaScript syntax
- `pnpm --filter @workspace/discord-bot run test` — run bot unit tests
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `DISCORD_BOT_TOKEN` — Discord bot token
- Required secret: `RBLXVALUE_API_KEY` — RBLXValue API key
- Optional env: `DISCORD_GUILD_ID` — register slash commands to one server for faster testing
- Existing API server also requires `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Discord bot: discord.js, native ES modules
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `services/discord-bot` — Discord bot runtime and slash commands
- `services/discord-bot/data/update-state.json` — ignored local update baseline and item snapshot
- `artifacts/api-server` — shared API service
- `artifacts/mockup-sandbox` — design canvas previews

## Architecture decisions

- The bot uses only the Discord `Guilds` intent; it does not need privileged message-content access.
- Bot credentials belong in Replit Secrets and must not be committed.
- Automatic detection uses only RBLXValue's documented v2 API; it does not request Supreme Values directly.
- Phase 1 persists processed dataset timestamps and snapshots but sends no automatic announcements.

## Product

- `/ping` reports gateway latency.
- `/help` lists the available commands.
- `/supremeupdate` posts a demo update embed with no actual mention notifications and no scraped item data.
- `/testupdate` privately previews the future value-update formatter using fake items.
- The update monitor checks the RBLXValue metadata timestamp every 15 minutes and compares item snapshots after dataset updates.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
