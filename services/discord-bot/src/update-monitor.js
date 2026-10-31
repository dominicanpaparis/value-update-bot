import { createRblxValueClient, RblxValueApiError } from "./rblxvalue-client.js";
import { createSnapshotStore, SnapshotStoreError } from "./snapshot-store.js";
import { diffSnapshots, normalizeApiItems } from "./update-diff.js";

export const CHECK_INTERVAL_MS = 15 * 60 * 1_000;
export const ITEMS_PAGE_SIZE = 100;
export const MAX_ITEMS_PAGES = 1_000;

function logInfo(logger, message) {
  logger.info?.(message);
}

function logError(logger, error) {
  if (error instanceof RblxValueApiError) {
    logger.error?.(
      `RBLXValue request failed: ${error.endpoint}${
        error.status === null ? "" : ` HTTP ${error.status}`
      } (${error.kind}).`,
    );
    return;
  }

  if (error instanceof SnapshotStoreError) {
    logger.error?.(
      `RBLXValue snapshot ${error.kind}; check the local state file.`,
    );
    return;
  }

  logger.error?.("RBLXValue update check failed:", error);
}

export async function fetchCurrentSnapshot(
  api,
  expectedTotalFromMeta = null,
) {
  const items = [];
  const seen = new Set();

  let offset = 0;
  let expected = expectedTotalFromMeta;
  let fetchedCount = 0;
  let finished = false;

  for (let pageNumber = 0; pageNumber < MAX_ITEMS_PAGES; pageNumber++) {
    if (expected !== null && fetchedCount >= expected) {
      finished = true;
      break;
    }

    const page = await api.getItemsPage({
      limit: ITEMS_PAGE_SIZE,
      offset,
    });

    if (
      expected === null &&
      Number.isInteger(page.totalItems) &&
      page.totalItems >= 0
    ) {
      expected = page.totalItems;
    }

    if (page.items.length === 0) {
      if (expected !== null && fetchedCount < expected) {
        throw new Error(
          "RBLXValue item pagination ended before the reported total.",
        );
      }

      finished = true;
      break;
    }

    fetchedCount += page.items.length;

    for (const item of normalizeApiItems(page.items)) {
      if (seen.has(item.slug)) continue;

      seen.add(item.slug);
      items.push(item);
    }

    offset += page.items.length;

    if (expected !== null && fetchedCount > expected) {
      throw new Error(
        "RBLXValue returned more items than its reported total.",
      );
    }

    if (expected === null && page.items.length < ITEMS_PAGE_SIZE) {
      finished = true;
      break;
    }

    if (
      expected !== null &&
      fetchedCount < expected &&
      page.items.length < ITEMS_PAGE_SIZE
    ) {
      throw new Error(
        "RBLXValue item pagination returned an incomplete snapshot.",
      );
    }
  }

  if (!finished) {
    throw new Error("RBLXValue pagination exceeded the page safety limit.");
  }

  if (expected !== null && fetchedCount < expected) {
    throw new Error(
      "RBLXValue item pagination did not reach the reported total.",
    );
  }

  return items;
}

export async function runUpdateCheck({
  api,
  store,
  logger = console,
  onUpdate = null,
}) {
  const previous = await store.load();
  const meta = await api.getMeta();

  if (previous && previous.datasetLastUpdated === meta.lastUpdated) {
    return {
      status: "unchanged",
      changedItemCount: 0,
    };
  }

  const items = await fetchCurrentSnapshot(api, meta.totalItems);
  const confirmed = await api.getMeta();

  if (confirmed.lastUpdated !== meta.lastUpdated) {
    throw new Error(
      "RBLXValue dataset changed while the snapshot was being fetched.",
    );
  }

  const next = {
    version: 1,
    datasetLastUpdated: meta.lastUpdated,
    items,
  };

  if (!previous) {
    await store.save(next);

    logInfo(
      logger,
      `RBLXValue baseline saved: items=${items.length}. No announcements sent.`,
    );

    return {
      status: "baseline",
      itemCount: items.length,
    };
  }

  const summary = diffSnapshots(previous.items, items);

  if (summary.changedItemCount > 0 && onUpdate) {
    await onUpdate(summary, {
      datasetLastUpdated: meta.lastUpdated,
    });
  }

  await store.save(next);

  logInfo(
    logger,
    `RBLXValue update processed: changed_items=${summary.changedItemCount}.`,
  );

  return {
    status: "updated",
    itemCount: items.length,
    ...summary,
  };
}

export function startUpdateMonitor({
  apiKey = process.env.RBLXVALUE_API_KEY,
  logger = console,
  store = createSnapshotStore(),
  onUpdate = null,
} = {}) {
  if (!apiKey) {
    logger.error?.(
      "RBLXVALUE_API_KEY is missing; automatic detection is disabled. The Discord bot will continue running.",
    );

    return null;
  }

  const api = createRblxValueClient({ apiKey });
  let busy = false;

  const check = async () => {
    if (busy) return;

    busy = true;

    try {
      await runUpdateCheck({
        api,
        store,
        logger,
        onUpdate,
      });
    } catch (error) {
      logError(logger, error);
    } finally {
      busy = false;
    }
  };

  void check();

  return setInterval(() => void check(), CHECK_INTERVAL_MS);
}
