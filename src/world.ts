import * as T from "three";
import { batchStatic } from "./optimize";
import { box, orb, material, home, flower, lantern, softGlow } from "./models";
export interface Obstacle {
  x: number;
  z: number;
  r: number;
}
export class World {
  group = new T.Group();
  obstacles: Obstacle[] = [];
  bushes: T.Vector3[] = [];
  cameraObjects: T.Object3D[] = [];
  flowers: T.Group[] = [];
  lanterns = [new T.Vector3(0, 0, 9), new T.Vector3(-5, 0, -4)];
  fireflies: T.Points;
  house: T.Group;
  trees: { x: number; z: number; s: number }[] = [];
  crowns: T.InstancedMesh[] = [];
  crownScales: number[] = [];
  dummy = new T.Object3D();
  constructor(scene: T.Scene) {
    scene.add(this.group);
    const ground = new T.Mesh(
      new T.CircleGeometry(34, 64),
      material("#435e51"),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    const rim = new T.Mesh(
      new T.CylinderGeometry(34, 32, 2.5, 64),
      material("#394b46"),
    );
    rim.position.y = -1.3;
    this.group.add(rim);
    for (let i = 0; i < 28; i++) {
      const z = 14 - i * 1.1;
      orb(
        this.group,
        "#7f8064",
        Math.sin(i * 0.23) * 1.4,
        -0.06,
        z,
        2.2,
        0.065,
        0.85,
      );
    }
    this.house = home(this.group);
    this.obstacles.push({ x: 0, z: 14, r: 2.5 });
    for (const p of this.lanterns) lantern(this.group, p.x + 1.6, p.z);
    let seed = 817;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const trees: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 110; i++) {
      const a = random() * Math.PI * 2,
        r = 12 + random() * 20,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if ((Math.abs(x) < 8 && z < 17 && z > -20) || Math.hypot(x, z - 14) < 12)
        continue;
      const s = 0.8 + random() * 0.7;
      trees.push({ x, z, s });
      this.obstacles.push({ x, z, r: 0.48 * s });
    }
    const trunk = new T.InstancedMesh(
      new T.CylinderGeometry(0.2, 0.35, 3, 5),
      material("#7d6a5a"),
      trees.length,
    );
    const leaves = new T.InstancedMesh(
      new T.ConeGeometry(2, 4, 7),
      material("#527d69"),
      trees.length,
    );
    const tops = new T.InstancedMesh(
      new T.ConeGeometry(1.45, 3, 7),
      material("#70967a"),
      trees.length,
    );
    const dummy = new T.Object3D();
    trees.forEach((t, i) => {
      dummy.position.set(t.x, 1.5 * t.s, t.z);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 3.9 * t.s;
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 5.4 * t.s;
      dummy.updateMatrix();
      tops.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [trunk, leaves, tops]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      if (mesh === trunk) this.cameraObjects.push(mesh);
    }
    this.trees = trees;
    this.crowns = [leaves, tops];
    this.crownScales = trees.map(() => 1);
    for (const [x, z] of [
      [-2, 5],
      [2, 0],
      [-3, -7],
      [3, -12],
      [-6, -15],
      [7, 4],
    ]) {
      this.bushes.push(new T.Vector3(x, 0, z));
      for (let i = 0; i < 4; i++)
        orb(
          this.group,
          "#719979",
          x + (i % 2) * 0.6 - 0.3,
          0.48,
          z + Math.floor(i / 2) * 0.5,
          0.8,
          0.65,
          0.75,
        );
    }
    for (let i = 0; i < 34; i++) {
      const a = random() * 6.28,
        r = 5 + random() * 23;
      const x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      orb(this.group, "#92a59a", x, 0.25, z, 0.3 + random() * 0.5, 0.4, 0.45);
    }
    const grass = new T.InstancedMesh(
      new T.ConeGeometry(0.12, 0.45, 3),
      material("#83a078"),
      400,
    );
    for (let i = 0; i < 400; i++) {
      const a = random() * 6.28,
        r = 3 + random() * 29;
      dummy.position.set(Math.sin(a) * r, 0.15, Math.cos(a) * r);
      dummy.scale.setScalar(0.5 + random());
      dummy.rotation.y = random() * 6.28;
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(grass);
    for (const [x, z] of [
      [0, -17],
      [-7, -12],
      [6, -9],
    ])
      this.flowers.push(flower(this.group, x, z));
    const pos = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      pos[i * 3] = (random() - 0.5) * 45;
      pos[i * 3 + 1] = 0.7 + random() * 3;
      pos[i * 3 + 2] = (random() - 0.5) * 45;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    this.fireflies = new T.Points(
      geo,
      new T.PointsMaterial({
        color: "#fff5a7",
        map: softGlow(),
        size: 0.2,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.group.add(this.fireflies);
    // A friendly moon hangs beyond the small forest.
    orb(this.group, "#fff2ca", -18, 22, -27, 2.4, 2.4, 2.4, 0.8);
    for (const [x, z] of [
      [-9, 3],
      [7, -15],
      [-10, -8],
    ]) {
      box(this.group, "#806a52", x, 0.07, z, 1.4, 0.14, 0.13);
    }
  }
  optimize() {
    batchStatic(this.group, [this.house, ...this.flowers]);
  }
  reveal(camera: T.Vector3, hero: T.Vector3, dt: number) {
    const direction = hero.clone().sub(camera);
    direction.y = 0;
    direction.normalize();
    const end = hero.clone().addScaledVector(direction, 7),
      segment = end.clone().sub(camera);
    segment.y = 0;
    this.trees.forEach((tree, i) => {
      const relative = new T.Vector3(tree.x - camera.x, 0, tree.z - camera.z);
      const t = T.MathUtils.clamp(
        relative.dot(segment) / segment.lengthSq(),
        0,
        1,
      );
      const near = relative.addScaledVector(segment, -t).length() < 4.2;
      this.crownScales[i] = T.MathUtils.lerp(
        this.crownScales[i],
        near ? 0.015 : 1,
        Math.min(1, dt * 10),
      );
      this.crowns.forEach((mesh, j) => {
        this.dummy.position.set(tree.x, (j === 0 ? 3.9 : 5.4) * tree.s, tree.z);
        this.dummy.scale.setScalar(tree.s * this.crownScales[i]);
        this.dummy.rotation.y = Math.sin(performance.now() * 0.001 + i) * 0.025;
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
    });
    this.crowns.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
    // The house is behind the player at spawn; do not push the camera into her back.
    const between = this.house.position.clone().sub(camera),
      segmentToHero = hero.clone().sub(camera);
    const t = between.dot(segmentToHero) / segmentToHero.lengthSq();
    this.house.visible = !(
      t > 0 &&
      t < 0.92 &&
      between.addScaledVector(segmentToHero, -t).length() < 3.5
    );
  }
  resolve(position: T.Vector3) {
    const len = Math.hypot(position.x, position.z);
    if (len > 30) {
      position.x *= 30 / len;
      position.z *= 30 / len;
    }
    for (const o of this.obstacles) {
      const dx = position.x - o.x,
        dz = position.z - o.z,
        d = Math.hypot(dx, dz),
        r = o.r + 0.36;
      if (d < r && d > 0.001) {
        position.x = o.x + (dx / d) * r;
        position.z = o.z + (dz / d) * r;
      }
    }
  }
}
