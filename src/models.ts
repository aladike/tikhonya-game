import * as T from "three";
import { batchStatic } from "./optimize";
const materials = new Map<string, T.MeshStandardMaterial>();
export function material(color: string, glow = 0) {
  const key = color + glow;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.9,
        flatShading: true,
        emissive: color,
        emissiveIntensity: glow,
      }),
    );
  return materials.get(key)!;
}
const sphereGeo = new T.IcosahedronGeometry(1, 1);
const boxGeo = new T.BoxGeometry(1, 1, 1);
export function orb(
  parent: T.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy = sx,
  sz = sx,
  glow = 0,
) {
  const mesh = new T.Mesh(sphereGeo, material(color, glow));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function box(
  parent: T.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const mesh = new T.Mesh(boxGeo, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function person() {
  const g = new T.Group();
  const coat = orb(g, "#eeb55e", 0, 0.82, 0, 0.43, 0.56, 0.29);
  orb(g, "#f6d5b0", 0, 1.55, 0, 0.34, 0.35, 0.32);
  orb(g, "#653e39", 0, 1.77, -0.04, 0.36, 0.2, 0.34);
  orb(g, "#653e39", -0.27, 1.49, -0.11, 0.13, 0.29, 0.17);
  orb(g, "#653e39", 0.27, 1.49, -0.11, 0.13, 0.29, 0.17);
  orb(g, "#263d41", -0.12, 1.58, 0.288, 0.033);
  orb(g, "#263d41", 0.12, 1.58, 0.288, 0.033);
  orb(g, "#e99078", -0.22, 1.47, 0.25, 0.065, 0.033, 0.022);
  orb(g, "#e99078", 0.22, 1.47, 0.25, 0.065, 0.033, 0.022);
  const hat = orb(g, "#afc99f", 0, 1.93, -0.015, 0.4, 0.19, 0.36);
  orb(hat, "#f9df80", 0, 1, 0, 0.2);
  const bag = box(g, "#7daba1", 0, 0.9, -0.29, 0.43, 0.48, 0.22);
  const legs = [
    box(g, "#304e58", -0.18, 0.26, 0, 0.19, 0.5, 0.22),
    box(g, "#304e58", 0.18, 0.26, 0, 0.19, 0.5, 0.22),
  ];
  const arms = [
    orb(g, "#eeb55e", -0.43, 0.8, 0.02, 0.13, 0.35, 0.14),
    orb(g, "#eeb55e", 0.43, 0.8, 0.02, 0.13, 0.35, 0.14),
  ];
  batchStatic(g, [coat, hat, bag, ...legs, ...arms]);
  return { g, coat, hat, bag, legs, arms };
}
export function monster(kind = 0) {
  const g = new T.Group();
  const color = ["#ac9cd7", "#e7aa78", "#dba6bc", "#8bb3a3"][kind];
  orb(g, color, 0, 0.95, 0, 0.88, 1, 0.68);
  orb(g, color, -0.65, 1.65, 0, 0.27, 0.45, 0.26);
  orb(g, color, 0.65, 1.65, 0, 0.27, 0.45, 0.26);
  orb(g, "#eddbc6", 0, 0.85, 0.54, 0.56, 0.55, 0.21);
  for (const x of [-0.3, 0.3]) {
    orb(g, "#fff1d3", x, 1.36, 0.55, 0.2, 0.22, 0.1);
    orb(
      g,
      "#39424f",
      x,
      1.37,
      0.64,
      kind === 0 ? 0.14 : 0.085,
      kind === 0 ? 0.04 : 0.1,
      0.045,
    );
  }
  orb(g, "#eea2a0", 0, 1.08, 0.72, 0.18, 0.1, 0.1);
  orb(g, color, -0.95, 0.8, 0, 0.22, 0.45, 0.24);
  orb(g, color, 0.95, 0.8, 0, 0.22, 0.45, 0.24);
  const legs = [
    orb(g, color, -0.42, 0.18, 0.12, 0.3, 0.25, 0.37),
    orb(g, color, 0.42, 0.18, 0.12, 0.3, 0.25, 0.37),
  ];
  batchStatic(g, legs);
  return { g, legs };
}
export function home(parent: T.Object3D, x = 0, z = 14, color = "#d9ac79") {
  const g = new T.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  box(g, color, 0, 1.5, 0, 4, 3, 3.6);
  const roof = new T.Mesh(new T.ConeGeometry(3.6, 2, 4), material("#6a9990"));
  roof.position.y = 3.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  box(g, "#576f65", 0, 0.9, -1.84, 0.95, 1.8, 0.1);
  box(g, "#f8cd70", -1.23, 1.7, -1.86, 0.72, 0.72, 0.12);
  box(g, "#f8cd70", 1.23, 1.7, -1.86, 0.72, 0.72, 0.12);
  box(g, "#a47762", 1, 4, 0, 0.5, 1.5, 0.5);
  return g;
}
export function flower(
  parent: T.Object3D,
  x: number,
  z: number,
  color = "#a7f4e0",
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  box(g, "#6cb29c", 0, 0.5, 0, 0.055, 1, 0.055);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    orb(
      g,
      color,
      Math.sin(a) * 0.22,
      1 + Math.cos(a) * 0.19,
      0,
      0.19,
      0.2,
      0.1,
      0.65,
    );
  }
  orb(g, "#f9dc84", 0, 1, 0, 0.11, 0.11, 0.14, 1);
  if (color === "#a7f4e0") {
    const halo = new T.Sprite(
      new T.SpriteMaterial({
        map: softGlow(),
        color: "#a7f4e0",
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    halo.position.y = 1;
    halo.scale.set(1.8, 1.8, 1);
    g.add(halo);
  }
  return g;
}
export function lantern(parent: T.Object3D, x: number, z: number) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  box(g, "#926b52", 0, 0.75, 0, 0.12, 1.5, 0.12);
  box(g, "#ffe1a0", 0, 1.65, 0, 0.35, 0.44, 0.35);
  const light = new T.PointLight("#ffcc7c", 5, 8, 2);
  light.position.y = 1.8;
  g.add(light);
  return g;
}

let glowMap: T.CanvasTexture | undefined;
export function softGlow() {
  if (!glowMap) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,.8)");
    gradient.addColorStop(0.25, "rgba(255,255,255,.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    glowMap = new T.CanvasTexture(canvas);
  }
  return glowMap;
}
