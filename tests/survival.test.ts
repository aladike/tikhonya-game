import { test } from "node:test";
import assert from "node:assert/strict";
import { Inventory, emptySlots } from "../src/items/inventory.ts";
import { craft } from "../src/items/crafting.ts";
import { recipes } from "../src/data/recipes.ts";
import { cycleAt, cycleLength } from "../src/data/cycle.ts";
import { bakeLight, lightAt } from "../src/world/light.ts";
import { decodeSurvival, initialSurvival } from "../src/save/survival.ts";
test("stack transfers conserve items, respect 64 and keep tools unstacked", () => {
  const inv = new Inventory();
  assert.equal(inv.add(7, 130), 0);
  assert.deepEqual(inv.slots.slice(0, 3), [
    { id: 7, count: 64 },
    { id: 7, count: 64 },
    { id: 7, count: 2 },
  ]);
  inv.move(2, 1);
  assert.equal(inv.count(7), 130);
  assert.equal(inv.slots[2]?.count, 2);
  inv.add(100, 2);
  assert.equal(inv.slots.filter((s) => s?.id === 100).length, 2);
  assert.equal(inv.remove(7, 131), false);
  assert.equal(inv.count(7), 130);
});
test("craft requires station and ingredients, and a full bag never consumes ingredients", () => {
  const inv = new Inventory();
  inv.add(4, 6);
  inv.add(7, 2);
  const pick = recipes.find((r) => r.id === "pick2")!;
  assert.equal(craft(inv, pick), false);
  assert.equal(craft(inv, pick, "bench"), true);
  assert.equal(inv.count(101), 1);
  assert.equal(inv.count(4), 3);
  const full = new Inventory(
    Array.from({ length: 36 }, () => ({ id: 7, count: 64 })),
  );
  full.slots[0] = { id: 6, count: 64 };
  const planks = recipes.find((r) => r.id === "planks")!;
  assert.equal(craft(full, planks), false);
  assert.equal(full.count(6), 64);
});
test("day lasts seven minutes and the night remains visible", () => {
  assert.equal(cycleAt(419).phase, "day");
  assert.equal(cycleAt(421).phase, "sunset");
  assert.equal(cycleAt(481).phase, "night");
  assert.ok(cycleAt(580).light >= 0.25);
  assert.equal(cycleAt(700).phase, "dawn");
  assert.equal(cycleAt(cycleLength).day, 2);
});
test("light attenuates through air and a sealed wall stops it in both render and gameplay solvers", () => {
  const get = (x: number, _y: number, z: number) =>
    x === 3 ? 4 : x === 0 && _y === 12 && z === 0 ? 16 : 0;
  const light = bakeLight(get);
  assert.equal(light(1, 12, 0)[1], 14);
  assert.equal(light(4, 12, 0)[1], 0);
  assert.equal(lightAt(1, 12, 0, get, [[0, 12, 0, 15]]), 14);
  assert.equal(lightAt(4, 12, 0, get, [[0, 12, 0, 15]]), 0);
});
test("survival validation rejects impossible inventory and preserves recovery bubbles", () => {
  const state = initialSurvival();
  state.recovery = [{ position: [125, 11, 205], slots: emptySlots(27) }];
  state.recovery[0].slots[0] = { id: 7, count: 12 };
  assert.deepEqual(decodeSurvival(state), state);
  const bad = structuredClone(state);
  bad.slots[0] = { id: 7, count: 1000 };
  assert.throws(() => decodeSurvival(bad));
});
