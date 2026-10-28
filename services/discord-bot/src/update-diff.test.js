import test from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots, normalizeApiItems } from "./update-diff.js";

test("snapshot normalization keeps only the requested fields", () => {
  const [item] = normalizeApiItems([
    {
      slug: "demo-item",
      name: "Demo Item",
      value: "125",
      category: "godly",
      rarity: 8,
      demand: 6,
      stability: "Stable",
      last_updated: "2026-10-28T00:15:57Z",
      description: "This field must not be stored.",
      image_url: "https://example.invalid/item.png",
    },
  ]);

  assert.deepEqual(item, {
    slug: "demo-item",
    name: "Demo Item",
    value: 125,
    category: "godly",
    rarity: 8,
    demand: 6,
    stability: "Stable",
    last_updated: "2026-10-28T00:15:57Z",
  });
});

test("diff detects value direction, demand, stability, and additions", () => {
  const previous = [
    { slug: "up", name: "Up", value: 10, demand: 4, stability: "Stable" },
    { slug: "down", name: "Down", value: 20, demand: 4, stability: "Stable" },
    { slug: "demand", name: "Demand", value: 30, demand: 4, stability: "Stable" },
    { slug: "stability", name: "Stability", value: 40, demand: 4, stability: "Stable" },
    { slug: "same", name: "Same", value: 50, demand: 4, stability: "Stable" },
  ];
  const current = [
    { slug: "up", name: "Up", value: 12, demand: 4, stability: "Stable" },
    { slug: "down", name: "Down", value: 18, demand: 4, stability: "Stable" },
    { slug: "demand", name: "Demand", value: 30, demand: 5, stability: "Stable" },
    { slug: "stability", name: "Stability", value: 40, demand: 4, stability: "Unstable" },
    { slug: "same", name: "Same", value: 50, demand: 4, stability: "Stable" },
    { slug: "new", name: "New", value: 7, demand: null, stability: null },
  ];

  const result = diffSnapshots(previous, current);

  assert.equal(result.changedItemCount, 5);
  assert.deepEqual(result.counts, {
    value_increased: 1,
    value_decreased: 1,
    demand_changed: 1,
    stability_changed: 1,
    newly_added: 1,
  });
  assert.deepEqual(
    result.changedItems.find((change) => change.slug === "new").changes,
    [{ type: "newly_added", from: null, to: 7 }],
  );
});

test("diff ignores removed items and unchanged items", () => {
  const result = diffSnapshots(
    [{ slug: "kept", name: "Kept", value: 5, demand: 2, stability: "Stable" }],
    [],
  );

  assert.equal(result.changedItemCount, 0);
  assert.ok(Object.values(result.counts).every((count) => count === 0));
});

test("normalization rejects incomplete and duplicate item records", () => {
  assert.throws(() => normalizeApiItems([{ name: "Missing slug" }]));
  assert.throws(() =>
    normalizeApiItems([
      { slug: "duplicate", name: "One" },
      { slug: "duplicate", name: "Two" },
    ]),
  );
});
