import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchCurrentSnapshot,
  runUpdateCheck,
} from "./update-monitor.js";

const item = (slug, value) => ({
  slug,
  name: `Example ${slug}`,
  value,
  category: "common",
  rarity: 1,
  demand: 2,
  stability: "Stable",
  last_updated: "2026-10-28T00:15:57Z",
});

function createLogger() {
  return {
    messages: [],
    info(message) {
      this.messages.push(message);
    },
    error(message) {
      this.messages.push(message);
    },
  };
}

test("initial check saves a baseline without treating existing items as changes", async () => {
  const state = { value: null, saves: 0 };
  const apiCalls = { meta: 0, pages: [] };
  const logger = createLogger();
  const api = {
    async getMeta() {
      apiCalls.meta += 1;
      return { lastUpdated: "dataset-1", totalItems: 1 };
    },
    async getItemsPage({ limit, offset }) {
      apiCalls.pages.push({ limit, offset });
      return { items: [item("one", 10)], totalItems: 1 };
    },
  };
  const store = {
    async load() {
      return state.value;
    },
    async save(next) {
      state.value = next;
      state.saves += 1;
    },
  };

  const result = await runUpdateCheck({ api, store, logger });

  assert.equal(result.status, "baseline");
  assert.equal(state.saves, 1);
  assert.equal(state.value.datasetLastUpdated, "dataset-1");
  assert.equal(apiCalls.meta, 2);
  assert.deepEqual(apiCalls.pages, [{ limit: 100, offset: 0 }]);
  assert.match(logger.messages[0], /No announcements sent/);
});

test("unchanged metadata uses one API request and skips item pages", async () => {
  const state = {
    version: 1,
    datasetLastUpdated: "dataset-1",
    items: [item("one", 10)],
  };
  let metaCalls = 0;
  const api = {
    async getMeta() {
      metaCalls += 1;
      return { lastUpdated: "dataset-1", totalItems: 1 };
    },
    async getItemsPage() {
      assert.fail("Unchanged datasets must not fetch item pages.");
    },
  };

  const result = await runUpdateCheck({
    api,
    store: { async load() { return state; }, async save() { assert.fail(); } },
    logger: createLogger(),
  });

  assert.equal(result.status, "unchanged");
  assert.equal(metaCalls, 1);
});

test("changed dataset is diffed, logged by type, then persisted once", async () => {
  const previous = {
    version: 1,
    datasetLastUpdated: "dataset-1",
    items: [item("one", 10)],
  };
  const nextItem = item("one", 12);
  const logger = createLogger();
  const saved = [];
  let metaCalls = 0;
  const api = {
    async getMeta() {
      metaCalls += 1;
      return { lastUpdated: "dataset-2", totalItems: 1 };
    },
    async getItemsPage() {
      return { items: [nextItem], totalItems: 1 };
    },
  };

  const result = await runUpdateCheck({
    api,
    store: {
      async load() { return previous; },
      async save(state) { saved.push(state); },
    },
    logger,
  });

  assert.equal(result.status, "updated");
  assert.equal(result.changedItemCount, 1);
  assert.equal(result.counts.value_increased, 1);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].datasetLastUpdated, "dataset-2");
  assert.equal(metaCalls, 2);
  assert.match(logger.messages[0], /value_increased=1/);
  assert.doesNotMatch(logger.messages[0], /Example one|12/);
});

test("a timestamp change during pagination prevents saving a mixed snapshot", async () => {
  const previous = {
    version: 1,
    datasetLastUpdated: "dataset-1",
    items: [item("one", 10)],
  };
  let metaCalls = 0;
  let saves = 0;
  const api = {
    async getMeta() {
      metaCalls += 1;
      return {
        lastUpdated: metaCalls === 1 ? "dataset-2" : "dataset-3",
        totalItems: 1,
      };
    },
    async getItemsPage() {
      return { items: [item("one", 11)], totalItems: 1 };
    },
  };

  await assert.rejects(
    runUpdateCheck({
      api,
      store: {
        async load() { return previous; },
        async save() { saves += 1; },
      },
      logger: createLogger(),
    }),
    /dataset changed while the snapshot was being fetched/,
  );
  assert.equal(saves, 0);
});

test("full snapshots use 100-item pages and the metadata total", async () => {
  const allItems = Array.from({ length: 205 }, (_, index) =>
    item(`item-${index}`, index),
  );
  const offsets = [];
  const result = await fetchCurrentSnapshot(
    {
      async getItemsPage({ limit, offset }) {
        offsets.push(offset);
        return {
          items: allItems.slice(offset, offset + limit),
          totalItems: allItems.length,
        };
      },
    },
    allItems.length,
  );

  assert.equal(result.length, 205);
  assert.deepEqual(offsets, [0, 100, 200]);
});
