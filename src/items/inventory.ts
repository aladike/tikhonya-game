import { item } from "../data/items.ts";
export interface Stack {
  id: number;
  count: number;
}
export const emptySlots = (size = 36): (Stack | null)[] =>
  Array.from({ length: size }, () => null);
export class Inventory {
  slots: (Stack | null)[] = emptySlots();
  discovered = new Set<number>();
  constructor(slots?: (Stack | null)[], discovered?: number[]) {
    if (slots) this.slots = slots.map((s) => (s ? { ...s } : null));
    this.slots.forEach((s) => {
      if (s) this.discovered.add(s.id);
    });
    discovered?.forEach((id) => this.discovered.add(id));
  }
  count(id: number) {
    return this.slots.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0);
  }
  add(id: number, count = 1) {
    if (!item(id).id || count <= 0) return count;
    this.discovered.add(id);
    const limit = item(id).tool ? 1 : 64;
    for (const s of this.slots)
      if (s?.id === id) {
        const n = Math.min(count, limit - s.count);
        s.count += n;
        count -= n;
      }
    for (let i = 0; i < this.slots.length && count > 0; i++)
      if (!this.slots[i]) {
        const n = Math.min(count, limit);
        this.slots[i] = { id, count: n };
        count -= n;
      }
    return count;
  }
  remove(id: number, count = 1) {
    if (this.count(id) < count) return false;
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s?.id === id) {
        const n = Math.min(count, s.count);
        s.count -= n;
        count -= n;
        if (!s.count) this.slots[i] = null;
      }
    }
    return true;
  }
  move(from: number, to: number) {
    if (from === to) return;
    const a = this.slots[from],
      b = this.slots[to];
    if (a && b && a.id === b.id && !item(a.id).tool) {
      const n = Math.min(a.count, 64 - b.count);
      b.count += n;
      a.count -= n;
      if (!a.count) this.slots[from] = null;
    } else [this.slots[from], this.slots[to]] = [b, a];
  }
}
