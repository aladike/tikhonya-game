export interface Vec {
  x: number;
  y: number;
  z: number;
}
export interface Hit {
  x: number;
  y: number;
  z: number;
  normal: Vec;
  distance: number;
  id: number;
}
/** Amanatides–Woo voxel traversal, including negative directions and axis-aligned rays. */
export function raycast(
  origin: Vec,
  direction: Vec,
  get: (x: number, y: number, z: number) => number,
  max = 8,
): Hit | null {
  let x = Math.floor(origin.x),
    y = Math.floor(origin.y),
    z = Math.floor(origin.z),
    distance = 0;
  const step = {
    x: Math.sign(direction.x),
    y: Math.sign(direction.y),
    z: Math.sign(direction.z),
  };
  const delta = {
    x: Math.abs(1 / direction.x),
    y: Math.abs(1 / direction.y),
    z: Math.abs(1 / direction.z),
  };
  const t = {
    x: direction.x
      ? ((step.x > 0 ? x + 1 : x) - origin.x) / direction.x
      : Infinity,
    y: direction.y
      ? ((step.y > 0 ? y + 1 : y) - origin.y) / direction.y
      : Infinity,
    z: direction.z
      ? ((step.z > 0 ? z + 1 : z) - origin.z) / direction.z
      : Infinity,
  };
  let normal = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 400 && distance <= max; i++) {
    const id = get(x, y, z);
    if (id) return { x, y, z, normal, distance, id };
    if (t.x < t.y && t.x < t.z) {
      distance = t.x;
      t.x += delta.x;
      x += step.x;
      normal = { x: -step.x, y: 0, z: 0 };
    } else if (t.y < t.z) {
      distance = t.y;
      t.y += delta.y;
      y += step.y;
      normal = { x: 0, y: -step.y, z: 0 };
    } else {
      distance = t.z;
      t.z += delta.z;
      z += step.z;
      normal = { x: 0, y: 0, z: -step.z };
    }
  }
  return null;
}
