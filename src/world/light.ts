import { block } from "../data/blocks.ts";
/** A one-chunk halo covers the maximum 15-cell reach of every block light. */
export function bakeLight(get: (x: number, y: number, z: number) => number) {
  const size = 48,
    height = 64,
    area = size * size,
    total = area * height;
  const sky = new Uint8Array(total),
    glow = new Uint8Array(total),
    closed = new Uint8Array(total);
  const at = (x: number, y: number, z: number) =>
    (y * size + z + 16) * size + x + 16;
  const queue: number[] = [];
  let head = 0,
    tail = 0;
  for (let z = -16; z < 32; z++)
    for (let x = -16; x < 32; x++) {
      let daylight = 15;
      for (let y = 63; y >= 0; y--) {
        const i = at(x, y, z),
          b = block(get(x, y, z));
        closed[i] = Number(b.solid && !b.transparent && !b.cutout);
        if (closed[i]) daylight = 0;
        else if (b.cutout || b.id === 10) daylight = Math.max(0, daylight - 1);
        sky[i] = daylight;
        if (b.light) {
          glow[i] = b.light;
          queue[tail++] = i;
        }
      }
    }
  while (head < tail) {
    const i = queue[head++],
      level = glow[i] - 1;
    if (level <= 0) continue;
    const x = i % size,
      z = Math.floor(i / size) % size,
      y = Math.floor(i / area);
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < size - 1 ? i + 1 : -1,
      z > 0 ? i - size : -1,
      z < size - 1 ? i + size : -1,
      y > 0 ? i - area : -1,
      y < height - 1 ? i + area : -1,
    ];
    for (const n of neighbors)
      if (n >= 0 && !closed[n] && glow[n] < level) {
        glow[n] = level;
        queue[tail++] = n;
      }
  }
  return (x: number, y: number, z: number): [number, number] => {
    if (y >= 64) return [15, 0];
    if (x < -16 || x >= 32 || z < -16 || z >= 32 || y < 0) return [0, 0];
    const i = at(Math.floor(x), Math.floor(y), Math.floor(z));
    return [sky[i], glow[i]];
  };
}
/** Gameplay flood-fill follows the same six-neighbor attenuation, including walls. */
export function lightAt(
  x: number,
  y: number,
  z: number,
  get: (x: number, y: number, z: number) => number,
  sources: Iterable<[number, number, number, number]>,
) {
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  let best = 0;
  for (const [sx, sy, sz, strength] of sources) {
    if (Math.abs(sx - x) + Math.abs(sy - y) + Math.abs(sz - z) >= strength)
      continue;
    const queue: [[number, number, number, number]] = [[sx, sy, sz, strength]],
      seen = new Set<string>([`${sx},${sy},${sz}`]);
    for (let i = 0; i < queue.length; i++) {
      const [a, b, c, l] = queue[i];
      if (a === x && b === y && c === z) {
        best = Math.max(best, l);
        break;
      }
      if (l <= best + 1) continue;
      for (const [dx, dy, dz] of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ]) {
        const nx = a + dx,
          ny = b + dy,
          nz = c + dz,
          k = `${nx},${ny},${nz}`;
        if (
          Math.abs(nx - x) + Math.abs(ny - y) + Math.abs(nz - z) >= l - 1 ||
          seen.has(k)
        )
          continue;
        seen.add(k);
        const blockHere = block(get(nx, ny, nz));
        if (!blockHere.solid || blockHere.transparent || blockHere.cutout)
          queue.push([nx, ny, nz, l - 1]);
      }
    }
  }
  return best;
}
