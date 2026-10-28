const CHANGE_TYPES = [
  "value_increased",
  "value_decreased",
  "demand_changed",
  "stability_changed",
  "newly_added",
];

function nullableNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function nullableString(value) {
  return typeof value === "string" ? value : null;
}

export function normalizeApiItems(apiItems) {
  if (!Array.isArray(apiItems)) {
    throw new Error("RBLXValue item page was not an array.");
  }

  const seenSlugs = new Set();

  return apiItems.map((item) => {
    if (
      !item ||
      typeof item.slug !== "string" ||
      item.slug.length === 0 ||
      typeof item.name !== "string" ||
      item.name.length === 0
    ) {
      throw new Error("RBLXValue returned an item without a slug or name.");
    }

    if (seenSlugs.has(item.slug)) {
      throw new Error("RBLXValue returned a duplicate item slug.");
    }
    seenSlugs.add(item.slug);

    return {
      slug: item.slug,
      name: item.name,
      value: nullableNumber(item.value),
      category: nullableString(item.category),
      rarity: nullableNumber(item.rarity),
      demand: nullableNumber(item.demand),
      stability: nullableString(item.stability),
      last_updated: nullableString(item.last_updated),
    };
  });
}

export function diffSnapshots(previousItems, currentItems) {
  const previousBySlug = new Map(
    previousItems.map((item) => [item.slug, item]),
  );
  const changes = [];

  for (const current of currentItems) {
    const previous = previousBySlug.get(current.slug);

    if (!previous) {
      changes.push({
        slug: current.slug,
        name: current.name,
        previous: null,
        current,
        changes: [{ type: "newly_added", from: null, to: current.value }],
      });
      continue;
    }

    const itemChanges = [];

    if (previous.value !== null && current.value !== null) {
      if (current.value > previous.value) {
        itemChanges.push({
          type: "value_increased",
          from: previous.value,
          to: current.value,
        });
      } else if (current.value < previous.value) {
        itemChanges.push({
          type: "value_decreased",
          from: previous.value,
          to: current.value,
        });
      }
    }

    if (previous.demand !== current.demand) {
      itemChanges.push({
        type: "demand_changed",
        from: previous.demand,
        to: current.demand,
      });
    }

    if (previous.stability !== current.stability) {
      itemChanges.push({
        type: "stability_changed",
        from: previous.stability,
        to: current.stability,
      });
    }

    if (itemChanges.length > 0) {
      changes.push({
        slug: current.slug,
        name: current.name,
        previous,
        current,
        changes: itemChanges,
      });
    }
  }

  const counts = Object.fromEntries(CHANGE_TYPES.map((type) => [type, 0]));
  for (const itemChange of changes) {
    for (const change of itemChange.changes) {
      counts[change.type] += 1;
    }
  }

  return {
    changedItems: changes,
    changedItemCount: changes.length,
    counts,
  };
}
