import * as T from "three";
import { blocks, block, index } from "../data/blocks";
import { generateChunk, inWorld } from "./generator";
interface Part {
  position: Float32Array;
  normal: Float32Array;
  color: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
}
export class VoxelWorld {
  data = new Map<string, Uint8Array>();
  changed = new Set<string>();
  groups = new Map<string, T.Group>();
  versions = new Map<string, number>();
  queue = new Set<string>();
  busy = false;
  activeKey = "";
  ready = 0;
  radius = 4;
  group = new T.Group();
  lights = new Map<string, T.PointLight>();
  worker = new Worker(new URL("./mesh.worker.ts", import.meta.url), {
    type: "module",
  });
  materials: T.MeshStandardMaterial[];
  wind = { value: 0 };
  error = "";
  constructor(
    public scene: T.Scene,
    public seed: number,
    public atlas: T.Texture,
  ) {
    atlas.magFilter = atlas.minFilter = T.NearestFilter;
    atlas.colorSpace = T.SRGBColorSpace;
    atlas.generateMipmaps = false;
    this.materials = [
      new T.MeshStandardMaterial({
        map: atlas,
        vertexColors: true,
        roughness: 0.9,
      }),
      new T.MeshStandardMaterial({
        map: atlas,
        vertexColors: true,
        alphaTest: 0.4,
        side: T.DoubleSide,
        roughness: 1,
      }),
      new T.MeshStandardMaterial({
        map: atlas,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    ];
    this.materials[1].onBeforeCompile = (shader) => {
      shader.uniforms.wind = this.wind;
      shader.vertexShader =
        "uniform float wind;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.x += sin(wind + position.x * .9 + position.z) * .025;",
        );
    };
    this.materials[2].onBeforeCompile = (shader) => {
      shader.uniforms.wind = this.wind;
      shader.vertexShader =
        "uniform float wind;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
        // Atlas tile 12 is water. Keep glass and soap geometry perfectly still.
        if (floor(uv.x * 8.) == 4. && floor((1. - uv.y) * 4.) == 1.) {
          vec3 p = (modelMatrix * vec4(position, 1.)).xyz;
          transformed.y += sin(wind * 1.4 + p.x * .7 + p.z * .5) * .035;
        }`,
        );
    };
    scene.add(this.group);
    this.worker.onmessage = (e) => {
      const { cx, cz, data, parts, version } = e.data as {
          cx: number;
          cz: number;
          data: Uint8Array;
          parts: Part[];
          version: number;
        },
        key = `${cx},${cz}`;
      this.busy = false;
      this.activeKey = "";
      if (version === (this.versions.get(key) || 0)) {
        if (!this.data.has(key)) this.data.set(key, data);
        this.removeMesh(key);
        const group = new T.Group();
        group.position.set(cx * 16, 0, cz * 16);
        parts.forEach((p, i) => {
          if (!p.index.length) return;
          const geometry = new T.BufferGeometry();
          geometry.setAttribute(
            "position",
            new T.BufferAttribute(p.position, 3),
          );
          geometry.setAttribute("normal", new T.BufferAttribute(p.normal, 3));
          geometry.setAttribute("color", new T.BufferAttribute(p.color, 3));
          geometry.setAttribute("uv", new T.BufferAttribute(p.uv, 2));
          geometry.setIndex(new T.BufferAttribute(p.index, 1));
          geometry.computeBoundingSphere();
          const mesh = new T.Mesh(geometry, this.materials[i]);
          mesh.castShadow = i !== 2;
          mesh.receiveShadow = true;
          group.add(mesh);
        });
        this.groups.set(key, group);
        this.group.add(group);
        this.ready++;
      }
      this.process();
    };
    this.worker.onerror = () => {
      this.error = "Не получилось построить остров. Обнови страницу.";
      this.busy = false;
    };
  }
  key(x: number, z: number) {
    return `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
  }
  get(x: number, y: number, z: number): number {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (!inWorld(x, y, z)) return 0;
    const key = this.key(x, z);
    let chunk = this.data.get(key);
    if (!chunk) {
      chunk = generateChunk(Math.floor(x / 16), Math.floor(z / 16), this.seed);
      this.data.set(key, chunk);
    }
    return chunk[index(x % 16, y, z % 16)];
  }
  set(x: number, y: number, z: number, id: number) {
    if (!inWorld(x, y, z) || !blocks[id]) return false;
    this.get(x, y, z);
    const key = this.key(x, z);
    this.data.get(key)![index(x % 16, y, z % 16)] = id;
    this.changed.add(key);
    for (const [dx, dz] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nk = this.key(x + dx, z + dz);
      if (this.groups.has(nk) || nk === key) {
        this.versions.set(nk, (this.versions.get(nk) || 0) + 1);
        this.queue.add(nk);
      }
    }
    const lightKey = `${x},${y},${z}`;
    const old = this.lights.get(lightKey);
    old?.removeFromParent();
    this.lights.delete(lightKey);
    if (block(id).light) {
      const light = new T.PointLight("#FFC76B", 8, 9, 2);
      light.position.set(x + 0.5, y + 1.3, z + 0.5);
      this.scene.add(light);
      this.lights.set(lightKey, light);
      if (this.lights.size > 12) {
        const first = this.lights.keys().next().value!;
        this.lights.get(first)?.removeFromParent();
        this.lights.delete(first);
      }
    }
    this.process();
    return true;
  }
  update(position: T.Vector3, time: number) {
    this.wind.value = time;
    const cx = Math.floor(position.x / 16),
      cz = Math.floor(position.z / 16);
    const visible: { key: string; d: number }[] = [];
    for (
      let z = Math.max(0, cz - this.radius);
      z <= Math.min(15, cz + this.radius);
      z++
    )
      for (
        let x = Math.max(0, cx - this.radius);
        x <= Math.min(15, cx + this.radius);
        x++
      ) {
        const d = Math.hypot(x - cx, z - cz);
        if (d <= this.radius + 0.2) visible.push({ key: `${x},${z}`, d });
      }
    visible.sort((a, b) => a.d - b.d);
    for (const v of visible)
      if (!this.groups.has(v.key) && v.key !== this.activeKey)
        this.queue.add(v.key);
    const allowed = new Set(visible.map((v) => v.key));
    for (const key of this.groups.keys())
      if (!allowed.has(key)) this.removeMesh(key);
    for (const key of this.queue) if (!allowed.has(key)) this.queue.delete(key);
    this.process();
  }
  process() {
    if (this.busy || !this.queue.size) return;
    const key = this.queue.values().next().value!;
    this.queue.delete(key);
    const [cx, cz] = key.split(",").map(Number);
    const chunks: Record<string, Uint8Array> = {};
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++) {
        const k = `${x},${z}`;
        if (this.data.has(k)) chunks[k] = this.data.get(k)!;
      }
    this.busy = true;
    this.activeKey = key;
    this.worker.postMessage({
      cx,
      cz,
      seed: this.seed,
      version: this.versions.get(key) || 0,
      chunks,
    });
  }
  removeMesh(key: string) {
    const group = this.groups.get(key);
    if (!group) return;
    group.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
    });
    group.removeFromParent();
    this.groups.delete(key);
  }
  restore(chunks: Record<string, Uint8Array>) {
    for (const [key, data] of Object.entries(chunks)) {
      this.data.set(key, data);
      this.changed.add(key);
      const [cx, cz] = key.split(",").map(Number);
      for (let i = 0; i < data.length && this.lights.size < 12; i++)
        if (block(data[i]).light) {
          const x = cx * 16 + (i % 16),
            y = Math.floor(i / 256),
            z = cz * 16 + (Math.floor(i / 16) % 16);
          const light = new T.PointLight("#FFC76B", 8, 9, 2);
          light.position.set(x + 0.5, y + 1.3, z + 0.5);
          this.scene.add(light);
          this.lights.set(`${x},${y},${z}`, light);
        }
    }
  }
  getSolid(x: number, y: number, z: number) {
    return block(this.get(x, y, z)).solid;
  }
  dispose() {
    this.worker.terminate();
    for (const key of this.groups.keys()) this.removeMesh(key);
    this.materials.forEach((m) => m.dispose());
    this.lights.forEach((l) => l.removeFromParent());
    this.group.removeFromParent();
  }
}
