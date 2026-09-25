import { bakeLight } from "./light";
import { generateChunk } from "./generator";
import { meshChunk } from "./mesher";
import { index, WORLD_HEIGHT } from "../data/blocks";
self.onmessage = (
  e: MessageEvent<{
    cx: number;
    cz: number;
    seed: number;
    version: number;
    chunks: Record<string, Uint8Array>;
  }>,
) => {
  const { cx, cz, seed, version, chunks } = e.data;
  const generated: Record<string, Uint8Array> = { ...chunks };
  const get = (x: number, y: number, z: number) => {
    if (y < 0 || y >= WORLD_HEIGHT) return 0;
    const nx = cx + Math.floor(x / 16),
      nz = cz + Math.floor(z / 16);
    if (nx < 0 || nx >= 16 || nz < 0 || nz >= 16) return 0;
    const key = `${nx},${nz}`;
    generated[key] ??= generateChunk(nx, nz, seed);
    return generated[key][index(((x % 16) + 16) % 16, y, ((z % 16) + 16) % 16)];
  };
  const parts = meshChunk(get, seed, bakeLight(get)).map((p) => ({
    position: new Float32Array(p.positions),
    normal: new Float32Array(p.normals),
    color: new Float32Array(p.colors),
    light: new Float32Array(p.lights),
    uv: new Float32Array(p.uvs),
    index: new Uint32Array(p.indices),
  }));
  const data = generated[`${cx},${cz}`] || generateChunk(cx, cz, seed);
  const transfer: Transferable[] = [data.buffer];
  for (const p of parts)
    transfer.push(
      p.position.buffer,
      p.normal.buffer,
      p.color.buffer,
      p.light.buffer,
      p.uv.buffer,
      p.index.buffer,
    );
  self.postMessage({ cx, cz, version, data, parts }, { transfer });
};
