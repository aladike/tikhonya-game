import { item } from "../data/items.ts";
import { emptySlots, type Stack } from "../items/inventory.ts";
export type Mode = "creative" | "peaceful" | "survival";
export interface FurnaceJob {
  recipe: string;
  remaining: number;
}
export interface RecoveryBubble {
  position: [number, number, number];
  slots: (Stack | null)[];
}
export interface SurvivalSave {
  clock: number;
  stars: number;
  bed: [number, number, number];
  slots: (Stack | null)[];
  discovered: number[];
  chests: Record<string, (Stack | null)[]>;
  furnaces: Record<string, FurnaceJob[]>;
  recovery: RecoveryBubble[];
  puppy: boolean;
  tutorial: number;
  giftedLamp: boolean;
  nights: number;
  drops?: { id: number; position: [number, number, number] }[];
}
export function initialSurvival(): SurvivalSave {
  const slots = emptySlots();
  slots[0] = { id: 110, count: 1 };
  slots[1] = { id: 108, count: 4 };
  slots[2] = { id: 107, count: 5 };
  return {
    clock: 0,
    stars: 5,
    bed: [128.5, 11.05, 206.5],
    slots,
    discovered: [110, 108, 107],
    chests: {},
    furnaces: {},
    recovery: [],
    puppy: false,
    tutorial: 0,
    giftedLamp: false,
    nights: 0,
    drops: [],
  };
}
export function decodeStacks(value: unknown, length = 36): (Stack | null)[] {
  if (!Array.isArray(value) || value.length !== length)
    throw new Error("inventory");
  return value.map((s) => {
    if (s === null) return null;
    if (
      !s ||
      !Number.isInteger(s.id) ||
      !item(s.id).id ||
      !Number.isInteger(s.count) ||
      s.count < 1 ||
      s.count > (item(s.id).tool ? 1 : 64)
    )
      throw new Error("stack");
    return { id: s.id, count: s.count };
  });
}
export function decodeSurvival(value: unknown): SurvivalSave {
  if (value === undefined) return initialSurvival();
  if (!value || typeof value !== "object") throw new Error("survival");
  const d = value as SurvivalSave;
  const num = (v: unknown, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      throw new Error("number");
    return v;
  };
  const pos = (v: unknown): [number, number, number] => {
    if (!Array.isArray(v) || v.length !== 3) throw new Error("position");
    return [num(v[0], 0, 256), num(v[1], 0, 86), num(v[2], 0, 256)];
  };
  const keyed = (o: unknown) => {
    if (
      !o ||
      typeof o !== "object" ||
      Array.isArray(o) ||
      Object.keys(o).length > 512
    )
      throw new Error("containers");
    return Object.entries(o).map(([k, v]) => {
      if (!/^\d{1,3},\d{1,2},\d{1,3}$/.test(k)) throw new Error("key");
      const [x, y, z] = k.split(",").map(Number);
      if (x > 255 || y > 63 || z > 255) throw new Error("bounds");
      return [k, v] as const;
    });
  };
  if (
    !Array.isArray(d.discovered) ||
    d.discovered.length > 256 ||
    !d.discovered.every((n) => Number.isInteger(n) && item(n).id)
  )
    throw new Error("discovered");
  if (!Array.isArray(d.recovery) || d.recovery.length > 512)
    throw new Error("bubbles");
  if (
    d.drops !== undefined &&
    (!Array.isArray(d.drops) || d.drops.length > 4096)
  )
    throw new Error("drops");
  return {
    drops: (d.drops || []).map((v) => {
      if (!Number.isInteger(v.id) || !item(v.id).id) throw new Error("drop");
      return { id: v.id, position: pos(v.position) };
    }),
    clock: num(d.clock, 0, 1e9),
    stars: num(d.stars, 0, 5),
    bed: pos(d.bed),
    slots: decodeStacks(d.slots),
    discovered: [...new Set(d.discovered)],
    chests: Object.fromEntries(
      keyed(d.chests).map(([k, v]) => [k, decodeStacks(v, 27)]),
    ),
    furnaces: Object.fromEntries(
      keyed(d.furnaces).map(([k, v]) => {
        if (!Array.isArray(v) || v.length > 8) throw new Error("furnace");
        return [
          k,
          v.map((j) => {
            if (typeof j.recipe !== "string" || j.recipe.length > 40)
              throw new Error("recipe");
            return { recipe: j.recipe, remaining: num(j.remaining, 0, 60) };
          }),
        ];
      }),
    ),
    recovery: d.recovery.map((b) => ({
      position: pos(b.position),
      slots: decodeStacks(b.slots, 27),
    })),
    puppy: !!d.puppy,
    tutorial: num(d.tutorial, 0, 8),
    giftedLamp: !!d.giftedLamp,
    nights: num(d.nights, 0, 1e7),
  };
}
