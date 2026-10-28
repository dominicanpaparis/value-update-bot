---
name: Automatic MM2 update bot
description: The user's target behavior and safety requirements for the Discord value-update bot.
---

The product goal is an automatic Discord bot that detects MM2 item value changes and posts a neatly formatted announcement with an emoji for each changed item.

Requirements for future implementation:
- Keep `/ping`, `/help`, and the manual `/supremeupdate` demo working.
- Track which update has already been announced and avoid duplicate announcements.
- During development, show only a fake placeholder ping; never notify an actual user or role.

**Why:** the user stated these as requirements for the eventual bot.

**How to apply:** preserve these behaviors when implementing automatic detection and announcement delivery.
