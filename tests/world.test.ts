import { test } from "node:test";
import assert from "node:assert/strict";
import { raycast } from "../src/world/raycast.ts";
import { meshChunk } from "../src/world/mesher.ts";
import { generateChunk } from "../src/world/generator.ts";
import { collides, moveAxis } from "../src/world/physics.ts";
import { rle, unrle, decodeIsland } from "../src/save/format.ts";
import { blocks } from "../src/data/blocks.ts";
test("DDA identifies the face in positive and negative directions, including axes", () => {
  const get = (x: number, y: number, z: number) =>
    x === 2 && y === 1 && z === 3 ? 4 : 0;
  const h = raycast({ x: 2.5, y: 1.5, z: 7 }, { x: 0, y: 0, z: -1 }, get)!;
  assert.equal(h.z, 3);
  assert.deepEqual(h.normal, { x: 0, y: 0, z: 1 });
  assert.equal(h.distance, 3);
  assert.equal(
    raycast({ x: 0, y: 1.5, z: 3.5 }, { x: 1, y: 0, z: 0 }, get)!.distance,
    2,
  );
  assert.equal(raycast({ x: 0, y: 4, z: 0 }, { x: 0, y: 1, z: 0 }, get), null);
});
test("mesher removes shared faces and emits valid AO and texture attributes", () => {
  const one = meshChunk((x, y, z) =>
    x === 4 && y === 4 && z === 4 ? 4 : 0,
  )[0];
  assert.equal(one.indices.length, 36);
  const two = meshChunk((x, y, z) =>
    [4, 5].includes(x) && y === 4 && z === 4 ? 4 : 0,
  )[0];
  assert.equal(two.indices.length, 60);
  assert.equal(two.colors.length, two.positions.length);
  assert.ok(two.colors.every(Number.isFinite));
  assert.equal(two.uvs.length, (two.positions.length / 3) * 2);
});
test("seeded chunks are deterministic and neighboring seeds produce different terrain", () => {
  assert.deepEqual(generateChunk(8, 8, 51), generateChunk(8, 8, 51));
  assert.notDeepEqual(generateChunk(8, 8, 51), generateChunk(8, 8, 52));
});
test("AABB motion does not tunnel through a voxel and allows half-height geometry", () => {
  const get = (x: number, y: number, z: number) =>
      x === 1 && y === 1 && z === 1 ? 4 : 0,
    p = { x: 0.5, y: 1, z: 1.5 };
  assert.equal(moveAxis(p, "x", 3, get), false);
  assert.ok(p.x < 0.72);
  assert.equal(
    collides({ x: 1.5, y: 1.51, z: 1.5 }, (x, y, z) =>
      x === 1 && y === 1 && z === 1 ? 22 : 0,
    ),
    false,
  );
});
test("RLE round trip and save validation reject oversized or obsolete formats", () => {
  const data = generateChunk(8, 10, 99);
  assert.deepEqual(unrle(rle(data)), data);
  assert.throws(() => unrle([2, 999999]));
  assert.throws(() => decodeIsland('{"version":2}'));
  const saved = {
    version: 1,
    kind: "tikhonya-island",
    seed: 99,
    name: "Test",
    updated: 0,
    position: [128, 20, 180],
    bar: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    selected: 0,
    chunks: { "8,10": rle(data) },
    music: 0.4,
    effects: 0.7,
    quality: "auto",
    yaw: 0,
    pitch: 0,
  };
  assert.deepEqual(decodeIsland(JSON.stringify(saved)).chunks, saved.chunks);
  assert.throws(() =>
    decodeIsland(JSON.stringify({ ...saved, chunks: { "../x": [0, 16384] } })),
  );
});
test("creative catalogue includes required materials, flowers, functional light and bounce blocks", () => {
  assert.ok(blocks.length >= 23);
  assert.equal(blocks[16].light, 15);
  assert.ok(blocks[17].bounce! > 10);
  assert.equal(blocks.filter((b) => b.shape === "flower").length, 4);
});

test("vertical contact resolves close enough to trigger floor interactions", () => {
  const p = { x: 1.5, y: 4.1, z: 1.5 };
  assert.equal(
    moveAxis(p, "y", -4, (_x, y, _z) => (y === 1 ? 17 : 0)),
    false,
  );
  assert.ok(p.y >= 2 && p.y < 2.001);
});
