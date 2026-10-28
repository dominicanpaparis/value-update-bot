import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSnapshotStore, SnapshotStoreError } from "./snapshot-store.js";

test("snapshot store loads missing state and persists a valid baseline", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "discord-bot-state-"));
  const snapshotPath = path.join(directory, "nested", "state.json");
  const store = createSnapshotStore(snapshotPath);
  const state = {
    version: 1,
    datasetLastUpdated: "2026-10-28T00:15:57Z",
    items: [
      {
        slug: "demo",
        name: "Demo",
        value: 10,
        category: "common",
        rarity: 1,
        demand: 2,
        stability: "Stable",
        last_updated: "2026-10-28T00:15:57Z",
      },
    ],
  };

  try {
    assert.equal(await store.load(), null);
    await store.save(state);
    assert.deepEqual(await store.load(), state);
    assert.deepEqual(JSON.parse(await readFile(snapshotPath, "utf8")), state);
    assert.equal((await stat(snapshotPath)).mode & 0o777, 0o600);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("snapshot store rejects malformed saved state instead of resetting baseline", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "discord-bot-state-"));
  const snapshotPath = path.join(directory, "state.json");
  const store = createSnapshotStore(snapshotPath);

  try {
    await (await import("node:fs/promises")).writeFile(snapshotPath, "{broken");
    await assert.rejects(store.load(), SnapshotStoreError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
