import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SNAPSHOT_PATH = fileURLToPath(
  new URL("../data/update-state.json", import.meta.url),
);

export class SnapshotStoreError extends Error {
  constructor(kind) {
    super(`Snapshot store ${kind}.`);
    this.name = "SnapshotStoreError";
    this.kind = kind;
  }
}

function isValidState(state) {
  return (
    state?.version === 1 &&
    typeof state.datasetLastUpdated === "string" &&
    Array.isArray(state.items)
  );
}

export function createSnapshotStore(snapshotPath = DEFAULT_SNAPSHOT_PATH) {
  return {
    async load() {
      let serialized;
      try {
        serialized = await readFile(snapshotPath, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw new SnapshotStoreError("could not be read");
      }

      let state;
      try {
        state = JSON.parse(serialized);
      } catch {
        throw new SnapshotStoreError("contains invalid JSON");
      }

      if (!isValidState(state)) {
        throw new SnapshotStoreError("has an unsupported format");
      }

      return state;
    },

    async save(state) {
      if (!isValidState(state)) {
        throw new SnapshotStoreError("refused to save invalid state");
      }

      const directory = path.dirname(snapshotPath);
      const temporaryPath = `${snapshotPath}.${process.pid}.tmp`;

      await mkdir(directory, { recursive: true });

      try {
        await writeFile(temporaryPath, JSON.stringify(state), {
          encoding: "utf8",
          mode: 0o600,
        });
        await rename(temporaryPath, snapshotPath);
      } catch {
        await unlink(temporaryPath).catch(() => {});
        throw new SnapshotStoreError("could not be saved");
      }
    },
  };
}
