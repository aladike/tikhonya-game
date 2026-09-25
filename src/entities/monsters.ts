import { cycleConfig } from "../data/cycle";
import { batchColored } from "../optimize";
import * as T from "three";
import { mobTypes, type MobKind } from "../data/mobs";
import { moveAxis } from "../world/physics";
import { block } from "../data/blocks";
import { elevation } from "../world/generator";
import type { IslandGame } from "../engine/game";
export interface Mob {
  kind: MobKind;
  mesh: T.Group;
  position: T.Vector3;
  velocity: T.Vector3;
  hits: number;
  cooldown: number;
  fun: number;
  stun: number;
  noticed: boolean;
  small: boolean;
  age: number;
  float: number;
  indicator: T.Group;
  mark: string;
  interest: number;
  goal: T.Vector3;
  halo: T.LineSegments;
}
export class Monsters {
  mobs: Mob[] = [];
  projectiles: {
    mesh: T.Mesh;
    velocity: T.Vector3;
    age: number;
    bouncy: boolean;
    power: number;
  }[] = [];
  spawnTimer = 8;
  lure: { position: T.Vector3; time: number } | null = null;
  projectileGeometry = new T.IcosahedronGeometry(0.22, 1);
  projectileMaterial = new T.MeshStandardMaterial({
    color: "#B0E7F6",
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.15,
    depthWrite: false,
  });
  constructor(public game: IslandGame) {}
  cube(
    parent: T.Group,
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const mesh = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  spawn(kind: MobKind, position: T.Vector3, small = false) {
    if (this.mobs.length >= cycleConfig.maxMobs) return;
    const mesh = new T.Group(),
      def = mobTypes[kind];
    this.cube(mesh, def.color, 0, 0.65, 0, 0.85, 1, 0.7);
    if (kind === "bubul") {
      for (const x of [-0.38, 0.38])
        this.cube(mesh, def.color, x, 1.25, 0, 0.25, 0.5, 0.3);
      this.cube(mesh, "#FF9CC7", 0, 0.7, 0.4, 0.2, 0.16, 0.13);
    }
    if (kind === "chomper") {
      for (const x of [-0.4, 0.4])
        for (const z of [-0.28, 0.28])
          this.cube(mesh, "#9C6B3F", x, 0.2, z, 0.35, 0.16, 0.15);
      this.cube(mesh, "#FFF7E8", 0, 0.45, 0.4, 0.35, 0.15, 0.1);
    }
    if (kind === "jelly") mesh.children[0].scale.set(1.2, 0.8, 1.2);
    for (const x of [-0.2, 0.2]) {
      this.cube(mesh, "#FFF7E8", x, 0.9, 0.36, 0.24, 0.22, 0.08);
      this.cube(
        mesh,
        "#3B2A4A",
        x,
        0.89,
        0.412,
        0.08,
        kind === "bubul" ? 0.03 : 0.11,
        0.02,
      );
    }
    this.cube(mesh, "#FF7A59", 0, 0.62, 0.39, 0.22, 0.05, 0.05);
    batchColored(mesh);
    const halo = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1.1, 1.5, 1)),
      new T.LineBasicMaterial({
        color: "#FFD23F",
        depthTest: false,
        transparent: true,
        opacity: 0.8,
      }),
    );
    halo.position.y = 0.7;
    halo.visible = false;
    halo.renderOrder = 8;
    mesh.add(halo);
    const indicator = new T.Group();
    indicator.position.y = 1.7;
    mesh.add(indicator);
    mesh.position.copy(position);
    if (small) mesh.scale.setScalar(0.58);
    this.game.scene.add(mesh);
    const mob: Mob = {
      kind,
      mesh,
      position: position.clone(),
      velocity: new T.Vector3(),
      hits: small ? 1 : def.hits,
      cooldown: 0,
      fun: 2 + Math.random() * 5,
      stun: 0,
      noticed: false,
      small,
      age: 0,
      float: 0,
      indicator,
      mark: "",
      interest: 0,
      goal: position.clone(),
      halo,
    };
    this.mobs.push(mob);
    return mob;
  }
  mark(m: Mob, text: string) {
    if (m.mark === text) return;
    m.mark = text;
    this.disposeChildren(m.indicator);
    if (!text) return;
    const c = text === "!" ? "#FF7A59" : "#FFD23F";
    this.cube(m.indicator, c, 0, 0.2, 0, 0.08, 0.25, 0.08);
    this.cube(m.indicator, c, 0, -0.03, 0, 0.09, 0.08, 0.08);
    if (text === "?") {
      this.cube(m.indicator, c, -0.09, 0.33, 0, 0.25, 0.07, 0.08);
      this.cube(m.indicator, c, 0.09, 0.28, 0, 0.08, 0.15, 0.08);
    }
    batchColored(m.indicator);
    m.indicator.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
  }
  disposeChildren(group: T.Group) {
    group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.LineSegments) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      }
    });
    group.clear();
  }
  remove(m: Mob) {
    m.mesh.removeFromParent();
    this.disposeChildren(m.mesh);
    this.mobs.splice(this.mobs.indexOf(m), 1);
  }
  capture(m: Mob) {
    if (m.float) return;
    m.float = 0.01;
    m.noticed = false;
    this.mark(m, "");
    this.game.dropItem(
      mobTypes[m.kind].trophy,
      m.position.clone().add(new T.Vector3(0, 0.5, 0)),
    );
    const bubble = new T.Mesh(
      new T.SphereGeometry(1.1, 12, 8),
      new T.MeshStandardMaterial({
        color: "#B0E7F6",
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    bubble.position.y = 0.7;
    m.mesh.add(bubble);
    this.game.audio.giggle();
    this.game.particles.bubbleBurst(
      m.position.clone().add(new T.Vector3(0, 1, 0)),
    );
    this.game.onToast(`${mobTypes[m.kind].name}: «Хи-хи! До завтра!»`);
  }
  hit(m: Mob, power = 1) {
    if (m.float) return;
    if (m.kind === "jelly" && !m.small) {
      m.small = true;
      m.mesh.scale.setScalar(0.58);
      m.hits = 1;
      this.spawn(
        "jelly",
        m.position.clone().add(new T.Vector3(0.8, 0, 0)),
        true,
      );
      this.game.onToast("Желейка разделилась: теперь их две!");
      return;
    }
    m.hits -= power;
    m.stun = 1.6;
    if (m.hits <= 0) this.capture(m);
    else this.game.particles.bubbleBurst(m.position.clone());
  }
  shoot(tier = 1) {
    const g = this.game;
    for (const side of tier === 3 ? [-0.13, 0, 0.13] : [0]) {
      const mesh = new T.Mesh(this.projectileGeometry, this.projectileMaterial);
      mesh.position.copy(g.position).add(new T.Vector3(0, 1.35, 0));
      const direction = new T.Vector3(0, 0, -1).applyEuler(
        new T.Euler(g.pitch, g.yaw + side, 0, "YXZ"),
      );
      mesh.position.addScaledVector(direction, 0.65);
      mesh.scale.setScalar(tier === 4 ? 2 : 1);
      g.scene.add(mesh);
      this.projectiles.push({
        mesh,
        velocity: direction.multiplyScalar(tier === 2 ? 18 : 12),
        age: 0,
        bouncy: tier === 5,
        power: tier === 4 ? 3 : 1,
      });
    }
    g.audio.material("water", "place");
  }
  distract() {
    const g = this.game;
    this.lure = {
      position: g.position
        .clone()
        .add(
          new T.Vector3(0, 0, -7).applyAxisAngle(new T.Vector3(0, 1, 0), g.yaw),
        ),
      time: 8,
    };
    g.particles.burst(this.lure.position, "#9C6B3F", 12);
    g.onToast("Шишка: тук-тук! Бубуль пошёл проверять.");
  }
  update(dt: number) {
    const g = this.game,
      s = g.survival,
      night = s.cycle.night,
      get = g.world.get.bind(g.world);
    if (this.lure) {
      this.lure.time -= dt;
      if (this.lure.time <= 0) this.lure = null;
    }
    if (s.mode === "survival" && night) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = cycleConfig.spawnInterval;
        const kinds: MobKind[] = ["bubul", "shadow", "chomper", "jelly"];
        const kind = kinds[Math.floor(Math.random() * 4)];
        for (let n = 0; n < (kind === "shadow" ? 2 : 1); n++) {
          const a = Math.random() * Math.PI * 2,
            r = 17 + Math.random() * 8,
            x = Math.floor(g.position.x + Math.cos(a) * r),
            z = Math.floor(g.position.z + Math.sin(a) * r);
          if (x < 2 || x > 253 || z < 2 || z > 253) continue;
          let y = elevation(x, z, g.world.seed) + 1;
          while (y < 63 && g.world.getSolid(x, y, z)) y++;
          if (get(x, y - 1, z) !== 3 && s.light(x, y, z) < 7)
            this.spawn(kind, new T.Vector3(x + 0.5, y + 0.03, z + 0.5));
        }
      }
    }
    for (const m of [...this.mobs]) {
      m.age += dt;
      m.cooldown -= dt;
      m.fun -= dt;
      m.stun = Math.max(0, m.stun - dt);
      if (m.float) {
        m.float += dt;
        m.position.y += dt * 2;
        m.mesh.rotation.y += dt * 3;
        m.mesh.position.copy(m.position);
        if (m.float > 3) this.remove(m);
        continue;
      }
      if (!night || s.mode !== "survival") {
        m.mesh.scale.multiplyScalar(Math.max(0.9, 1 - dt));
        m.position.y -= dt * 0.4;
        m.mesh.position.copy(m.position);
        if (m.mesh.scale.x < 0.12) {
          if (Math.random() < 0.3) s.grant(108, 1);
          this.remove(m);
        }
        continue;
      }
      const toHero = g.position.clone().sub(m.position),
        distance = toHero.length();
      if (distance > 60) {
        this.remove(m);
        continue;
      }
      m.halo.visible = s.state.puppy && distance < 15;
      const quiet = g.input.move().quiet,
        noisy =
          (!quiet && g.input.move().moving) ||
          g.input.breaking ||
          g.noiseTime > 0;
      const sight = s.visible(
        m.position.clone().add(new T.Vector3(0, 1, 0)),
        g.position.clone().add(new T.Vector3(0, 1, 0)),
      );
      const detected =
        m.kind === "bubul"
          ? (noisy && distance < 26) || distance < 1.6
          : distance < 26 && (sight || m.kind === "chomper");
      if (detected) {
        m.interest = 6;
        m.goal.copy(g.position);
      } else m.interest = Math.max(0, m.interest - dt);
      m.noticed = m.interest > 0;
      this.mark(m, m.noticed ? (distance < 8 ? "!" : "?") : "");
      const hereLight = s.light(m.position.x, m.position.y, m.position.z);
      if (m.kind === "shadow" && hereLight >= 8) {
        g.particles.burst(m.position, "#FFD23F", 20, true);
        this.capture(m);
        continue;
      }
      const ground = block(get(m.position.x, m.position.y - 0.1, m.position.z));
      let speed = mobTypes[m.kind].speed * (m.small ? 1.25 : 1);
      if (ground.special === "honey" || ground.special === "jellypath")
        speed *= 0.22;
      if (get(m.position.x, m.position.y + 0.2, m.position.z) === 10)
        speed *= 0.35;
      if (ground.bounce) m.velocity.y = 8;
      const target =
        this.lure && m.kind === "bubul" ? this.lure.position : m.goal;
      const delta = target.clone().sub(m.position);
      delta.y = 0;
      if (!m.noticed && !this.lure)
        delta.set(Math.sin(m.age * 0.4), 0, Math.cos(m.age * 0.4));
      if (m.kind === "bubul" && s.puppyNear(m.position)) {
        delta.multiplyScalar(-1);
        speed *= 1.2;
        this.mark(m, "?");
      }
      if (m.fun < 0) {
        g.audio.creature(m.kind);
        m.fun = 5 + Math.random() * 6;
        m.stun = 0.8;
        if (m.kind === "bubul") {
          g.audio.material("snow", "break");
          g.particles.burst(
            m.position.clone().add(new T.Vector3(0, 1, 0)),
            "#FFFFFF",
            8,
          );
          m.mesh.rotation.z = 0.2;
        }
        if (m.kind === "shadow") m.mesh.scale.y = 0.7;
        if (m.kind === "chomper") {
          m.mesh.rotation.z = -0.2;
          g.audio.material("wood", "step");
        }
        if (m.kind === "jelly") {
          m.velocity.y = 5;
          g.audio.material("water", "step");
        }
      }
      m.mesh.rotation.z *= Math.exp(-dt * 4);
      m.mesh.scale.y = T.MathUtils.lerp(
        m.mesh.scale.y,
        m.small ? 0.58 : 1,
        dt * 3,
      );
      const dir = delta.normalize();
      if (!m.stun) {
        const movedX = moveAxis(m.position, "x", dir.x * speed * dt, get),
          movedZ = moveAxis(m.position, "z", dir.z * speed * dt, get);
        if ((!movedX || !movedZ) && m.velocity.y === 0) {
          m.velocity.y = m.kind === "jelly" ? 8 : 6;
          this.mark(m, "?");
        }
        if (m.kind === "chomper" && (!movedX || !movedZ) && m.cooldown <= 0) {
          const x = Math.floor(m.position.x + dir.x * 0.8),
            z = Math.floor(m.position.z + dir.z * 0.8);
          let y = Math.floor(m.position.y + 0.4);
          if (!get(x, y, z)) y++;
          const id = get(x, y, z);
          if ([6, 7, 8, 18, 19, 20, 21, 24, 30].includes(id)) {
            g.world.set(x, y, z, 0);
            m.cooldown = 2;
            g.particles.burst(
              new T.Vector3(x + 0.5, y + 0.5, z + 0.5),
              block(id).color,
              10,
            );
            g.audio.material("wood", "break");
            g.saveSoon();
          }
        }
      }
      m.velocity.y -= 20 * dt;
      if (!moveAxis(m.position, "y", m.velocity.y * dt, get)) {
        m.velocity.y = 0;
        if (m.kind === "jelly" && m.stun <= 0) m.velocity.y = 6;
      }
      if (distance < 1.3 && sight && m.cooldown <= 0) {
        s.tickle(m.position);
        m.cooldown = 2;
      }
      m.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      m.mesh.position.copy(m.position);
      m.mesh.children[0].rotation.z = Math.sin(m.age * 7) * 0.06;
      m.indicator.rotation.y = g.yaw - m.mesh.rotation.y;
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      const steps = Math.ceil((p.velocity.length() * dt) / 0.2);
      let ended = false;
      for (let n = 0; n < steps && !ended; n++) {
        p.mesh.position.addScaledVector(p.velocity, dt / steps);
        const hit = this.mobs.find(
          (m) =>
            !m.float &&
            m.position
              .clone()
              .add(new T.Vector3(0, 0.7, 0))
              .distanceTo(p.mesh.position) < (p.power > 1 ? 1.5 : 0.8),
        );
        if (hit) {
          this.hit(hit, p.power);
          ended = true;
        }
        if (
          g.world.getSolid(
            p.mesh.position.x,
            p.mesh.position.y,
            p.mesh.position.z,
          )
        ) {
          if (p.bouncy && p.age < 2) {
            p.mesh.position.addScaledVector(p.velocity, -dt / steps);
            p.velocity.y = Math.abs(p.velocity.y) + 3;
            p.velocity.x *= -0.7;
            p.velocity.z *= -0.7;
            p.bouncy = false;
          } else ended = true;
        }
      }
      if (p.age > 3 || ended) {
        g.particles.bubbleBurst(p.mesh.position);
        p.mesh.removeFromParent();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
