import { EmbedBuilder } from "discord.js";

const MAX_FIELDS_PER_EMBED = 20;
const MAX_FIELD_VALUE_LENGTH = 1_024;
const ATTRIBUTION = "Data from rblxvalue.com";

const CHANGE_PRESENTATION = {
  value_increased: { emoji: "📈", label: "Value" },
  value_decreased: { emoji: "📉", label: "Value" },
  demand_changed: { emoji: "🔥", label: "Demand" },
  stability_changed: { emoji: "⚖️", label: "Stability" },
  newly_added: { emoji: "✨", label: "New item" },
};

function displayValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return new Intl.NumberFormat("en-US").format(value);
  return String(value);
}

function formatChange(change) {
  const presentation = CHANGE_PRESENTATION[change.type];
  if (!presentation) return null;

  if (change.type === "newly_added") {
    return `${presentation.emoji} ${presentation.label} · ${displayValue(change.to)}`;
  }

  return `${presentation.emoji} ${presentation.label} · ${displayValue(change.from)} → ${displayValue(change.to)}`;
}

function itemEmoji(itemChange) {
  for (const type of [
    "newly_added",
    "value_increased",
    "value_decreased",
    "demand_changed",
    "stability_changed",
  ]) {
    if (itemChange.changes.some((change) => change.type === type)) {
      return CHANGE_PRESENTATION[type].emoji;
    }
  }
  return "🔔";
}

function truncate(value, maxLength) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toEmbedField(itemChange) {
  const details = itemChange.changes.map(formatChange).filter(Boolean).join("\n");
  return {
    name: truncate(`${itemEmoji(itemChange)} ${itemChange.name}`, 256),
    value: truncate(details || "Change detected.", MAX_FIELD_VALUE_LENGTH),
    inline: false,
  };
}

export function buildValueUpdateEmbeds(
  itemChanges,
  { preview = false, updatedAt = new Date() } = {},
) {
  const safeChanges = Array.isArray(itemChanges) ? itemChanges : [];
  const chunks = [];

  for (let index = 0; index < safeChanges.length; index += MAX_FIELDS_PER_EMBED) {
    chunks.push(safeChanges.slice(index, index + MAX_FIELDS_PER_EMBED));
  }

  if (chunks.length === 0) chunks.push([]);

  return chunks.map((chunk, index) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(index === 0 ? "Value Update" : "Value Update (continued)")
      .setDescription(
        preview
          ? "FAKE DEMO DATA — preview only. No API records or public announcements are used."
          : "Detected item value changes.",
      )
      .setFooter({
        text: preview
          ? `${ATTRIBUTION} • TEST PREVIEW`
          : ATTRIBUTION,
      })
      .setTimestamp(normalizeTimestamp(updatedAt));

    if (chunk.length > 0) {
      embed.addFields(chunk.map(toEmbedField));
    } else {
      embed.addFields({
        name: "No changes",
        value: "No item changes were detected.",
      });
    }

    return embed;
  });
}

export function createDemoChanges() {
  return [
    {
      slug: "demo-item-alpha",
      name: "Example Item Alpha",
      changes: [{ type: "value_increased", from: 100, to: 125 }],
    },
    {
      slug: "demo-item-beta",
      name: "Example Item Beta",
      changes: [{ type: "value_decreased", from: 200, to: 175 }],
    },
    {
      slug: "demo-item-gamma",
      name: "Example Item Gamma",
      changes: [{ type: "demand_changed", from: 4, to: 6 }],
    },
    {
      slug: "demo-item-delta",
      name: "Example Item Delta",
      changes: [{ type: "stability_changed", from: "Stable", to: "Unstable" }],
    },
    {
      slug: "demo-item-epsilon",
      name: "Example Item Epsilon",
      changes: [{ type: "newly_added", from: null, to: 50 }],
    },
  ];
}
