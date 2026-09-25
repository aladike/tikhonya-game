import { CHUNK, WORLD_HEIGHT, WORLD_SIZE, SEA, index } from "../data/blocks.ts";
export function hash(x: number, z: number, seed: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz,
    u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  return (
    (hash(ix, iz, seed) * (1 - u) + hash(ix + 1, iz, seed) * u) * (1 - v) +
    (hash(ix, iz + 1, seed) * (1 - u) + hash(ix + 1, iz + 1, seed) * u) * v
  );
}
export function elevation(x: number, z: number, seed: number) {
  const dx = x - 128,
    dz = z - 128,
    r = Math.hypot(dx, dz),
    coast = 1 - Math.max(0, (r - 88) / 25);
  const mountain = Math.exp(-(dx * dx + dz * dz) / 850) * 28;
  const hills =
    noise(x / 23, z / 23, seed) * 7 + noise(x / 9, z / 9, seed + 7) * 2;
  const natural = 4 + Math.max(0, coast) * (6 + hills + mountain);
  const beachDistance = Math.hypot(x - 128, z - 206),
    blend = Math.max(0, Math.min(1, (beachDistance - 9) / 8));
  return Math.max(
    2,
    Math.min(55, Math.floor(10 * (1 - blend) + natural * blend)),
  );
}
export function generateChunk(cx: number, cz: number, seed: number) {
  const data = new Uint8Array(CHUNK * CHUNK * WORLD_HEIGHT);
  const set = (x: number, y: number, z: number, id: number) => {
    const lx = x - cx * 16,
      lz = z - cz * 16;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < WORLD_HEIGHT)
      data[index(lx, y, lz)] = id;
  };
  for (let z = 0; z < 16; z++)
    for (let x = 0; x < 16; x++) {
      const wx = cx * 16 + x,
        wz = cz * 16 + z,
        h = elevation(wx, wz, seed),
        sand = h <= SEA + 2,
        snow = h > 34;
      for (let y = 0; y <= Math.max(h, SEA); y++)
        data[index(x, y, z)] =
          y > h
            ? 10
            : y === h
              ? sand
                ? 3
                : snow
                  ? 11
                  : 1
              : y >= h - 2
                ? sand
                  ? 3
                  : 2
                : 4;
      if (!sand && !snow && hash(wx, wz, seed + 41) > 0.945)
        set(wx, h + 1, wz, 18 + Math.floor(hash(wx, wz, seed + 9) * 4));
      if (sand && hash(wx, wz, seed + 113) > 0.997) set(wx, h + 1, wz, 25);
    }
  // Trees originate on a global lattice so trunks/leaves match across chunk boundaries.
  for (
    let gz = Math.floor((cz * 16 - 3) / 7);
    gz <= Math.floor((cz * 16 + 18) / 7);
    gz++
  )
    for (
      let gx = Math.floor((cx * 16 - 3) / 7);
      gx <= Math.floor((cx * 16 + 18) / 7);
      gx++
    ) {
      const x = gx * 7 + 2,
        z = gz * 7 + 2,
        h = elevation(x, z, seed);
      if (
        hash(gx, gz, seed + 4) > 0.34 ||
        h <= SEA + 2 ||
        h > 30 ||
        Math.hypot(x - 128, z - 206) < 12
      )
        continue;
      for (let y = h + 1; y < h + 6; y++) set(x, y, z, 6);
      for (let dy = 3; dy <= 6; dy++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dx = -2; dx <= 2; dx++)
            if (
              Math.abs(dx) + Math.abs(dz) + (dy === 6 ? 1 : 0) < 4 &&
              !(dx === 0 && dz === 0 && dy < 6)
            )
              set(
                x + dx,
                h + dy,
                z + dz,
                hash(gx, gz, seed + 8) > 0.65 ? 30 : 8,
              );
    }
  // Discoverable beach mosaic and a small natural arch; both can be rebuilt by the player.
  for (let x = 122; x < 135; x++)
    for (let z = 186; z < 190; z++) {
      const h = elevation(x, z, seed);
      if (h > SEA) set(x, h, z, (x + z) % 3 === 0 ? 3 : 1);
    }
  for (let x = 143; x <= 149; x++) {
    const h = elevation(x, 180, seed);
    for (let y = h + 1; y <= h + 5; y++)
      if (x === 143 || x === 149 || y === h + 5) set(x, y, 180, 5);
  }
  const heart = [
    "01100110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
  ];
  heart.forEach((row, zz) =>
    [...row].forEach((c, xx) => {
      if (c === "1") set(120 + xx, 10, 209 + zz, 13);
    }),
  );
  set(132, 11, 205, 25);
  return data;
}
export function inWorld(x: number, y: number, z: number) {
  return (
    x >= 0 &&
    z >= 0 &&
    x < WORLD_SIZE &&
    z < WORLD_SIZE &&
    y >= 0 &&
    y < WORLD_HEIGHT
  );
}
