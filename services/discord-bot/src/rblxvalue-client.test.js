import test from "node:test";
import assert from "node:assert/strict";
import { createRblxValueClient } from "./rblxvalue-client.js";

test("client reads metadata and item pages with documented header and pagination", async () => {
  const requests = [];
  const client = createRblxValueClient({
    apiKey: "unit-test-key",
    minRequestIntervalMs: 0,
    fetchImpl: async (url, init) => {
      requests.push({ url: new URL(url), init });
      const body = String(url).endsWith("/meta")
        ? { meta: { last_updated: "2026-10-28T00:15:57Z", totals: { items: 1 } } }
        : {
            items: [{ slug: "demo", name: "Demo" }],
            total: 1,
            limit: 100,
            offset: 0,
            count: 1,
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.deepEqual(await client.getMeta(), {
    lastUpdated: "2026-10-28T00:15:57Z",
    totalItems: 1,
  });
  assert.deepEqual(await client.getItemsPage({ limit: 100, offset: 0 }), {
    items: [{ slug: "demo", name: "Demo" }],
    totalItems: 1,
  });
  assert.equal(requests[0].url.pathname, "/v2/meta");
  assert.equal(requests[1].url.pathname, "/v2/items");
  assert.equal(requests[1].url.searchParams.get("limit"), "100");
  assert.equal(requests[1].url.searchParams.get("offset"), "0");
  assert.equal(requests[0].init.headers["X-Api-Key"], "unit-test-key");
});
