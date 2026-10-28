const API_BASE_URL = "https://api.rblxvalue.com/v2/";
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 15_000;

export class RblxValueApiError extends Error {
  constructor(endpoint, kind, status = null) {
    super(`RBLXValue ${kind} error for ${endpoint}.`);
    this.name = "RblxValueApiError";
    this.endpoint = endpoint;
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteCount(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function findMetadata(payload) {
  const candidates = [
    payload?.meta,
    payload?.data?.meta,
    payload?.data,
    payload?.result?.meta,
    payload?.result,
    payload,
  ];

  return candidates.find(
    (candidate) =>
      isRecord(candidate) && typeof candidate.last_updated === "string",
  );
}

function findItemsPage(payload) {
  if (Array.isArray(payload)) {
    return { items: payload, totalItems: null };
  }

  const containers = [payload, payload?.data, payload?.result];
  const container = containers.find(
    (candidate) => isRecord(candidate) && Array.isArray(candidate.items),
  );

  if (!container) {
    throw new RblxValueApiError("/items", "unexpected response");
  }

  const totalItems = finiteCount(
    container.total ??
      container.pagination?.total ??
      payload?.total ??
      payload?.pagination?.total,
  );

  return { items: container.items, totalItems };
}

export function createRblxValueClient({
  apiKey,
  fetchImpl = fetch,
  minRequestIntervalMs = DEFAULT_MIN_REQUEST_INTERVAL_MS,
} = {}) {
  let lastRequestStartedAt = 0;

  async function request(endpoint) {
    if (!apiKey) {
      throw new RblxValueApiError(endpoint, "missing API key");
    }

    const waitMs =
      minRequestIntervalMs - (Date.now() - lastRequestStartedAt);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    lastRequestStartedAt = Date.now();
    const url = new URL(endpoint.replace(/^\/+/, ""), API_BASE_URL);
    let response;

    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new RblxValueApiError(endpoint, "network or timeout");
    }

    if (!response.ok) {
      throw new RblxValueApiError(endpoint, "HTTP", response.status);
    }

    try {
      return await response.json();
    } catch {
      throw new RblxValueApiError(endpoint, "invalid JSON");
    }
  }

  return {
    async getMeta() {
      const payload = await request("/meta");
      const meta = findMetadata(payload);

      if (!meta) {
        throw new RblxValueApiError("/meta", "missing timestamp");
      }

      return {
        lastUpdated: meta.last_updated,
        totalItems: finiteCount(
          meta.totals?.items ?? meta.total_items ?? meta.items_total,
        ),
      };
    },

    async getItemsPage({ limit, offset }) {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const endpoint = `/items?${query}`;
      const payload = await request(endpoint);
      return findItemsPage(payload);
    },
  };
}
