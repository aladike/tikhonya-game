import { block, heightOf } from "../data/blocks.ts";
import type { Vec } from "./raycast.ts";
export const HALF = 0.29,
  HEIGHT = 1.65;
export function overlaps(
  position: Vec,
  x: number,
  y: number,
  z: number,
  id = 1,
) {
  if (id === 23) {
    const xOverlap = position.x + HALF > x && position.x - HALF < x + 1,
      zOverlap = position.z + HALF > z && position.z - HALF < z + 1;
    if (!xOverlap || !zOverlap || position.y + HEIGHT <= y) return false;
    return (
      position.y < y + 0.5 ||
      (position.z + HALF > z + 0.5 && position.y < y + 1)
    );
  }
  return (
    position.x + HALF > x &&
    position.x - HALF < x + 1 &&
    position.y + HEIGHT > y &&
    position.y < y + heightOf(id) &&
    position.z + HALF > z &&
    position.z - HALF < z + 1
  );
}
export function collides(
  position: Vec,
  get: (x: number, y: number, z: number) => number,
) {
  for (
    let x = Math.floor(position.x - HALF);
    x <= Math.floor(position.x + HALF);
    x++
  )
    for (
      let y = Math.floor(position.y);
      y <= Math.floor(position.y + HEIGHT - 0.001);
      y++
    )
      for (
        let z = Math.floor(position.z - HALF);
        z <= Math.floor(position.z + HALF);
        z++
      ) {
        const id = get(x, y, z);
        if (block(id).solid && overlaps(position, x, y, z, id)) return true;
      }
  return false;
}
export function moveAxis(
  position: Vec,
  axis: "x" | "y" | "z",
  amount: number,
  get: (x: number, y: number, z: number) => number,
) {
  const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.15)),
    part = amount / steps;
  for (let i = 0; i < steps; i++) {
    position[axis] += part;
    if (collides(position, get)) {
      position[axis] -= part;
      // Resolve to the contact surface, rather than hovering up to .15 m above
      // it. Reliable contact is also needed by spring blocks and half-steps.
      const origin = position[axis];
      let safe = 0,
        blocked = 1;
      for (let n = 0; n < 12; n++) {
        const middle = (safe + blocked) / 2;
        position[axis] = origin + part * middle;
        if (collides(position, get)) blocked = middle;
        else safe = middle;
      }
      position[axis] = origin + part * safe;
      return false;
    }
  }
  return true;
}
