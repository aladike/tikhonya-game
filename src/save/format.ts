import { WORLD_HEIGHT, CHUNK, blocks } from "../data/blocks.ts";
export interface IslandSave {
  version: 1;
  kind: "tikhonya-island";
  seed: number;
  name: string;
  updated: number;
  position: [number, number, number];
  yaw: number;
  pitch: number;
  bar: number[];
  selected: number;
  chunks: Record<string, number[]>;
  music: number;
  effects: number;
  quality: "auto" | "low" | "high";
  preview?: string;
  touchSensitivity?: number;
  mouseSensitivity?: number;
}
export function rle(data: Uint8Array) {
  const out: number[] = [];
  let previous = data[0],
    count = 0;
  for (const v of data) {
    if (v === previous && count < 65535) count++;
    else {
      out.push(previous, count);
      previous = v;
      count = 1;
    }
  }
  out.push(previous, count);
  return out;
}
export function unrle(data: unknown) {
  if (!Array.isArray(data) || data.length % 2 || data.length > 32768)
    throw new Error("chunk");
  const out = new Uint8Array(CHUNK * CHUNK * WORLD_HEIGHT);
  let offset = 0;
  for (let i = 0; i < data.length; i += 2) {
    const id = data[i],
      count = data[i + 1];
    if (
      !Number.isInteger(id) ||
      !blocks[id] ||
      !Number.isInteger(count) ||
      count < 1 ||
      offset + count > out.length
    )
      throw new Error("chunk");
    out.fill(id, offset, offset + count);
    offset += count;
  }
  if (offset !== out.length) throw new Error("chunk");
  return out;
}
export function decodeIsland(raw: string): IslandSave {
  if (raw.length > 16_000_000) throw new Error("size");
  const d = JSON.parse(raw);
  if (
    !d ||
    d.kind !== "tikhonya-island" ||
    d.version !== 1 ||
    !Number.isInteger(d.seed) ||
    !d.chunks ||
    typeof d.chunks !== "object" ||
    Array.isArray(d.chunks)
  )
    throw new Error("version");
  const entries = Object.entries(d.chunks);
  if (entries.length > 256) throw new Error("size");
  for (const [key, value] of entries) {
    if (!/^(?:[0-9]|1[0-5]),(?:[0-9]|1[0-5])$/.test(key))
      throw new Error("position");
    unrle(value);
  }
  if (
    !Array.isArray(d.position) ||
    d.position.length !== 3 ||
    !d.position.every(
      (n: unknown) => typeof n === "number" && Number.isFinite(n),
    )
  )
    throw new Error("position");
  const finite = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return {
    version: 1,
    kind: "tikhonya-island",
    seed: d.seed >>> 0,
    name:
      typeof d.name === "string"
        ? [...d.name]
            .filter((c) => c.charCodeAt(0) >= 32 && c !== "<" && c !== ">")
            .join("")
            .slice(0, 24)
        : "Солнечный остров",
    updated: finite(d.updated, Date.now()),
    position: [
      Math.max(0.5, Math.min(255.5, d.position[0])),
      Math.max(1, Math.min(63, d.position[1])),
      Math.max(0.5, Math.min(255.5, d.position[2])),
    ],
    yaw: finite(d.yaw, 0),
    pitch: Math.max(-1.4, Math.min(1.4, finite(d.pitch, 0))),
    bar: Array.from({ length: 9 }, (_, i) =>
      Number.isInteger(d.bar?.[i]) && blocks[d.bar[i]] && d.bar[i] > 0
        ? d.bar[i]
        : i + 1,
    ),
    selected: Math.max(0, Math.min(8, Math.floor(finite(d.selected, 0)))),
    chunks: d.chunks,
    music: Math.max(0, Math.min(1, finite(d.music, 0.4))),
    effects: Math.max(0, Math.min(1, finite(d.effects, 0.7))),
    touchSensitivity: Math.max(
      0.25,
      Math.min(3, finite(d.touchSensitivity, 1)),
    ),
    mouseSensitivity: Math.max(
      0.25,
      Math.min(3, finite(d.mouseSensitivity, 1)),
    ),
    quality: ["low", "high"].includes(d.quality) ? d.quality : "auto",
    preview:
      typeof d.preview === "string" &&
      /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(d.preview) &&
      d.preview.length < 150000
        ? d.preview
        : undefined,
  };
}
