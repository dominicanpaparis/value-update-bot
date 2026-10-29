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
    const status = error.status === null ? "" : ` HTTP ${error.status}`;
    logger.error?.(
      `RBLXValue request failed: ${error.endpoint}${status} (${error.kind}).`,
    );
    return;
  }

  if (error instanceof SnapshotStoreError) {
    logger.error?.(`RBLXValue snapshot ${error.kind}; check the local state file.`);
    return;
  }

  logger.error?.("RBLXValue update check failed:", error);
}

export async function fetchCurrentSnapshot(api, expectedTotalFromMeta = null) {
  const items = [];
  const seenSlugs = new Set();
  let offset = 0;
  let expectedTotal = expectedTotalFromMeta;
  let finished = false;

  for (let pageNumber = 0; pageNumber < MAX_ITEMS_PAGES; pageNumber += 1) {
    if (expectedTotal !== null && offset >= expectedTotal) {
      finished = true;
      break;
    }

    const page = await api.getItemsPage({
      limit: ITEMS_PAGE_SIZE,
      offset,
    });

    if (
      expectedTotal === null &&
      Number.isInteger(page.totalItems) &&
      page.totalItems >= 0
    ) {
      expectedTotal = page.totalItems;
    }

    if (page.items.length === 0) {
      if (expectedTotal !== null && items.length !== expectedTotal) {
        throw new Error("RBLXValue item pagination ended before the reported total.");
      }
      finished = true;
      break;
    }

    const normalizedPage = normalizeApiItems(page.items);
    for (const item of normalizedPage) {
      if (seenSlugs.has(item.slug)) {
        continue;
      }
      seenSlugs.add(item.slug);
      items.push(item);
    }

    offset += page.items.length;

    if (expectedTotal !== null && items.length > expectedTotal) {
      throw new Error("RBLXValue returned more items than its reported total.");
    }

    if (page.items.length < ITEMS_PAGE_SIZE && expectedTotal === null) {
      finished = true;
      break;
    }

    if (
      page.items.length < ITEMS_PAGE_SIZE &&
      expectedTotal !== null &&
      items.length < expectedTotal
    ) {
      throw new Error("RBLXValue item pagination returned an incomplete snapshot.");
    }
  }

  if (!finished) {
    throw new Error("RBLXValue pagination exceeded the page safety limit.");
  }

  if (expectedTotal !== null && items.length !== expectedTotal) {
    throw new Error("RBLXValue item pagination did not reach the reported total.");
  }

  return items;
}

function changeSummaryLine(summary) {
  return [
    `changed_items=${summary.changedItemCount}`,
    ...Object.entries(summary.counts).map(([type, count]) => `${type}=${count}`),
  ].join(" ");
}

export async function runUpdateCheck({ api, store, logger = console }) {
  const previousState = await store.load();
  const metadata = await api.getMeta();

  if (
    previousState &&
    previousState.datasetLastUpdated === metadata.lastUpdated
  ) {
    return { status: "unchanged", changedItemCount: 0 };
  }

  const items = await fetchCurrentSnapshot(api, metadata.totalItems);
  const confirmedMetadata = await api.getMeta();

  if (confirmedMetadata.lastUpdated !== metadata.lastUpdated) {
    throw new Error("RBLXValue dataset changed while the snapshot was being fetched.");
  }

  const nextState = {
    version: 1,
    datasetLastUpdated: metadata.lastUpdated,
    items,
  };
  const summary = previousState
    ? diffSnapshots(previousState.items, items)
    : null;

  await store.save(nextState);

  if (!previousState) {
    logInfo(
      logger,
      `RBLXValue baseline saved: items=${items.length}. No announcements sent.`,
    );
    return { status: "baseline", itemCount: items.length };
  }

  logInfo(
    logger,
    `RBLXValue update processed: ${changeSummaryLine(summary)}. Announcements are disabled in Phase 1.`,
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
} if (!apiKey) {
    logger.error?.(
      "RBLXVALUE_API_KEY is missing; automatic detection is disabled. The Discord bot will continue running.",
    );
    return null;
  }

  const api = createRblxValueClient({ apiKey });
  let checkInProgress = false;

  const check = async () => {
    if (checkInProgress) return;
    checkInProgress = true;

    try {
      await runUpdateCheck({ api, store, logger });
    } catch (error) {
      logError(logger, error);
    } finally {
      checkInProgress = false;
    }
  };

  void check();
  return setInterval(() => void check(), CHECK_INTERVAL_MS);
}
