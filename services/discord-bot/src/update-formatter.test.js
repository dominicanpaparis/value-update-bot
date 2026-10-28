import test from "node:test";
import assert from "node:assert/strict";
import { commands } from "./commands.js";
import {
  buildValueUpdateEmbeds,
  createDemoChanges,
} from "./update-formatter.js";

test("test update formatter previews fake changes with source credit", () => {
  const [embed] = buildValueUpdateEmbeds(createDemoChanges(), {
    preview: true,
    updatedAt: new Date("2026-10-28T00:15:57Z"),
  });
  const payload = embed.toJSON();

  assert.equal(payload.title, "Value Update");
  assert.match(payload.description, /FAKE DEMO DATA/);
  assert.match(payload.footer.text, /Data from rblxvalue\.com/);
  assert.equal(payload.fields.length, 5);
  assert.ok(payload.fields.some((field) => field.name.startsWith("📈")));
  assert.ok(payload.fields.some((field) => field.name.startsWith("📉")));
  assert.ok(payload.fields.some((field) => field.name.startsWith("✨")));
});

test("formatter splits large update previews into Discord-sized embeds", () => {
  const changes = Array.from({ length: 21 }, (_, index) => ({
    slug: `demo-${index}`,
    name: `Example ${index}`,
    changes: [{ type: "value_increased", from: index, to: index + 1 }],
  }));

  const embeds = buildValueUpdateEmbeds(changes, { preview: true });

  assert.equal(embeds.length, 2);
  assert.equal(embeds[0].toJSON().fields.length, 20);
  assert.equal(embeds[1].toJSON().fields.length, 1);
});

test("the existing commands remain registered and testupdate is guild-manager-only", () => {
  const serialized = commands.map((command) => command);
  const names = serialized.map((command) => command.name);

  assert.deepEqual(names, ["ping", "help", "supremeupdate", "testupdate"]);
  const testUpdate = serialized.find((command) => command.name === "testupdate");
  assert.deepEqual(testUpdate.contexts, [0]);
  assert.equal(testUpdate.default_member_permissions, "32");
});
