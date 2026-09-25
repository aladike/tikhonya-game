import * as T from "three";
export class Particles {
  mesh: T.InstancedMesh;
  dummy = new T.Object3D();
  bubbles: T.InstancedMesh;
  bubbleData: { p: T.Vector3; life: number }[] = [];
  particles: {
    p: T.Vector3;
    v: T.Vector3;
    life: number;
    size: number;
    color: T.Color;
  }[] = [];
  constructor(scene: T.Scene) {
    this.mesh = new T.InstancedMesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshStandardMaterial({ roughness: 0.7 }),
      180,
    );
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.bubbles = new T.InstancedMesh(
      new T.IcosahedronGeometry(0.16, 1),
      new T.MeshStandardMaterial({
        color: "#b5efff",
        transparent: true,
        opacity: 0.42,
        metalness: 0.15,
        roughness: 0.1,
        depthWrite: false,
      }),
      32,
    );
    this.bubbles.count = 0;
    this.bubbles.frustumCulled = false;
    scene.add(this.bubbles);
  }
  burst(position: T.Vector3, color: string, count = 12, festive = false) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 180) this.particles.shift();
      this.particles.push({
        p: position.clone(),
        v: new T.Vector3(
          (Math.random() - 0.5) * 4,
          1 + Math.random() * 4,
          (Math.random() - 0.5) * 4,
        ),
        life: festive ? 1.8 : 0.75,
        size: 0.04 + Math.random() * 0.1,
        color: new T.Color(
          festive ? ["#FF7A91", "#FFD23F", "#47C7A5", "#B983FF"][i % 4] : color,
        ),
      });
    }
  }
  bubbleBurst(position: T.Vector3) {
    for (let i = 0; i < 10; i++) {
      if (this.bubbleData.length >= 32) this.bubbleData.shift();
      this.bubbleData.push({
        p: position
          .clone()
          .add(new T.Vector3(Math.sin(i) * 0.7, 0, Math.cos(i) * 0.7)),
        life: 2 + i * 0.1,
      });
    }
  }
  update(dt: number) {
    for (let i = this.bubbleData.length - 1; i >= 0; i--) {
      const b = this.bubbleData[i];
      b.life -= dt;
      b.p.y += dt * 0.9;
      b.p.x += Math.sin(b.life * 3 + i) * dt * 0.1;
      if (b.life <= 0) this.bubbleData.splice(i, 1);
    }
    this.bubbles.count = this.bubbleData.length;
    this.bubbleData.forEach((b, i) => {
      this.dummy.position.copy(b.p);
      this.dummy.scale.setScalar(
        Math.min(1, b.life * 3) * (1 + (i % 3) * 0.25),
      );
      this.dummy.updateMatrix();
      this.bubbles.setMatrixAt(i, this.dummy.matrix);
      this.bubbles.setColorAt(
        i,
        new T.Color(["#ffc6e7", "#b9efff", "#fff4b3"][i % 3]),
      );
    });
    this.bubbles.instanceMatrix.needsUpdate = true;
    if (this.bubbles.instanceColor)
      this.bubbles.instanceColor.needsUpdate = true;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.v.y -= 7 * dt;
      p.p.addScaledVector(p.v, dt);
    }
    this.mesh.count = this.particles.length;
    this.particles.forEach((p, i) => {
      this.dummy.position.copy(p.p);
      this.dummy.rotation.set(p.life * 3, p.life * 2, p.life);
      this.dummy.scale.setScalar(p.size * Math.min(1, p.life * 4));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, p.color);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
