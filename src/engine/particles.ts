import * as T from "three";
export class Particles {
  mesh: T.InstancedMesh;
  dummy = new T.Object3D();
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
  update(dt: number) {
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
