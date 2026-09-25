import { localize } from "./localize";
import * as T from "three";
import { Input } from "./input";
import { Sound } from "./audio";
import { World } from "./world";
import { person, monster, material } from "./models";
import { ru } from "./strings";
export class Game {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  renderer: T.WebGLRenderer;
  world: World;
  input: Input;
  sound = new Sound();
  hero = person();
  bubul = monster();
  position = new T.Vector3(0, 0, 8);
  checkpoint = new T.Vector3(0, 0, 8);
  quality: "auto" | "low" | "high" = "auto";
  fps = 60;
  private fpsClock = 0;
  private fpsFrames = 0;
  private lowTime = 0;
  friendlyBubul = false;
  started = false;
  paused = false;
  hidden = false;
  day = false;
  carrying = false;
  delivered = 0;
  velocityY = 0;
  yaw = 0;
  pitch = 0.62;
  time = 0;
  stepTime = 0;
  catchTime = 0;
  throwCooldown = 0;
  monsterState = "patrol";
  monsterTarget = new T.Vector3(4, 0, -7);
  monsterTimer = 0;
  lastNoise = new T.Vector3();
  rings: { mesh: T.Mesh; age: number; size: number }[] = [];
  projectiles: { mesh: T.Mesh; age: number; from: T.Vector3; to: T.Vector3 }[] =
    [];
  hemisphere = new T.HemisphereLight("#9ec9ef", "#2c425e", 1.8);
  sun = new T.DirectionalLight("#c9dbf9", 1.7);
  private previous = 0;
  private uiTimer = 0;
  private toastTimer = 0;
  onHome = () => {};
  onHud = () => {};
  onInteract = () => false;
  extraContext: () => string | null = () => null;
  onEvent = (_event: string) => {};
  onUpdate = (_dt: number) => {};
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.background = new T.Color("#263f50");
    this.scene.fog = new T.FogExp2("#263f50", 0.022);
    this.scene.add(this.hemisphere, this.sun);
    this.sun.position.set(-10, 24, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -26,
      right: 26,
      top: 26,
      bottom: -26,
      far: 70,
    });
    this.sun.shadow.normalBias = 0.035;
    this.world = new World(this.scene);
    this.world.optimize();
    this.scene.add(this.hero.g, this.bubul.g);
    this.bubul.g.position.set(4, 0, -8);
    this.hero.g.position.copy(this.position);
    this.hero.g.rotation.y = Math.PI;
    this.input = new Input(canvas);
    this.camera.position.set(5, 6, 18);
    window.addEventListener("pagehide", () => this.onEvent("save"));
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.paused = true;
        this.input.clear();
        this.sound.pause();
        this.onEvent("save");
        document.querySelector<HTMLElement>("#paused")!.hidden = !this.started;
      }
    });
    window.addEventListener("blur", () => {
      if (this.started) {
        this.paused = true;
        this.sound.pause();
        document.querySelector<HTMLElement>("#paused")!.hidden = false;
      }
    });
    this.renderer.setAnimationLoop(this.frame);
  }
  setQuality(quality: "auto" | "low" | "high") {
    this.quality = quality;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        quality === "low" ? 1 : quality === "high" ? 2 : 1.5,
      ),
    );
    this.renderer.shadowMap.enabled = quality !== "low";
    this.renderer.setSize(innerWidth, innerHeight);
  }
  start() {
    this.started = true;
    this.paused = false;
    void this.sound.start();
    this.toast(matchMedia("(pointer:coarse)").matches ? ru.touch : ru.welcome);
  }
  toast(text: string) {
    const el = document.querySelector<HTMLElement>("#toast")!;
    el.textContent = text;
    el.classList.add("show");
    this.toastTimer = 6;
  }
  noise(at: T.Vector3, size: number) {
    const mesh = new T.Mesh(
      new T.RingGeometry(0.92, 1, 48),
      new T.MeshBasicMaterial({
        color: "#f9db98",
        transparent: true,
        opacity: 0.65,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at.x, 0.08, at.z);
    this.scene.add(mesh);
    this.rings.push({ mesh, age: 0, size });
    if (
      !this.day &&
      !this.friendlyBubul &&
      at.distanceTo(this.bubul.g.position) < size * 1.5 + 2
    ) {
      this.lastNoise.copy(at);
      this.monsterTarget.copy(at);
      this.monsterState = size > 4 ? "chase" : "investigate";
      this.monsterTimer = 6;
    }
    this.lastNoise.copy(at);
    this.onEvent("noise");
  }
  throw() {
    if (this.throwCooldown > 0 || this.hidden) return;
    this.throwCooldown = 1.2;
    const from = this.position.clone().add(new T.Vector3(0, 1.2, 0));
    const to = this.position
      .clone()
      .add(new T.Vector3(-Math.sin(this.yaw) * 9, 0, -Math.cos(this.yaw) * 9));
    to.y = 0;
    const mesh = new T.Mesh(
      new T.IcosahedronGeometry(0.15, 0),
      material("#c29568"),
    );
    this.scene.add(mesh);
    this.projectiles.push({ mesh, age: 0, from, to });
    this.sound.tone(340, 0.12, 0.1);
    this.toast(ru.pine);
  }
  context() {
    if (this.hidden) return ru.leave;
    const extra = this.extraContext();
    if (extra) return extra;
    if (this.carrying && Math.hypot(this.position.x, this.position.z - 10) < 3)
      return ru.home;
    if (
      !this.carrying &&
      this.world.flowers.some(
        (f) => f.visible && f.position.distanceTo(this.position) < 2,
      )
    )
      return ru.pick;
    if (this.world.bushes.some((p) => p.distanceTo(this.position) < 1.8))
      return ru.hide;
    return ru.action;
  }
  act() {
    if (this.hidden) {
      this.hidden = false;
      return;
    }
    if (this.onInteract()) return;
    if (
      this.carrying &&
      Math.hypot(this.position.x, this.position.z - 10) < 3
    ) {
      this.carrying = false;
      this.delivered++;
      this.sound.chime();
      this.toast(ru.win);
      this.onHome();
      this.world.flowers.forEach((f) => (f.visible = true));
      this.onEvent("delivery");
      return;
    }
    const flower =
      !this.carrying &&
      this.world.flowers.find(
        (f) => f.visible && f.position.distanceTo(this.position) < 2,
      );
    if (flower) {
      flower.visible = false;
      this.carrying = true;
      this.sound.chime();
      this.toast(ru.flower);
      this.onEvent("flower");
      return;
    }
    if (this.world.bushes.some((p) => p.distanceTo(this.position) < 1.8)) {
      this.hidden = true;
      this.toast(ru.bush);
      this.onEvent("hide");
    }
  }
  setDay(day: boolean) {
    this.day = day;
    const color = day ? "#abc9bf" : "#263f50";
    this.scene.background = new T.Color(color);
    (this.scene.fog as T.FogExp2).color.set(color);
    this.hemisphere.intensity = day ? 2.8 : 1.8;
    this.hemisphere.color.set(day ? "#fff2d5" : "#9ec9ef");
    this.hemisphere.groundColor.set(day ? "#516a54" : "#2c425e");
    this.sun.color.set(day ? "#ffdfaa" : "#c9dbf9");
    this.sun.intensity = day ? 3 : 1.7;
    this.world.fireflies.visible = !day;
    this.bubul.g.visible = !day;
  }
  private frame = (ms: number) => {
    const elapsed = (ms - this.previous) / 1000 || 0.016;
    const dt = Math.min(elapsed, 0.045);
    this.previous = ms;
    if (this.started && !this.paused && elapsed < 1) {
      this.fpsClock += elapsed;
      this.fpsFrames++;
      if (this.fpsClock > 1) {
        this.fps = this.fpsFrames / this.fpsClock;
        this.fpsClock = this.fpsFrames = 0;
        this.lowTime = this.fps < 38 ? this.lowTime + 1 : 0;
        if (this.quality === "auto" && this.lowTime >= 4) {
          this.renderer.setPixelRatio(1);
          this.renderer.shadowMap.enabled = false;
          this.lowTime = 0;
        }
      }
    }
    if (!this.paused) {
      this.time += dt;
      if (this.started) this.update(dt);
      else this.attract(dt);
    }
    this.renderer.render(this.scene, this.camera);
  };
  private attract(dt: number) {
    this.camera.position.set(11 + Math.sin(this.time * 0.08) * 2, 9, 21);
    this.camera.lookAt(0, 1, 1);
    this.animateWorld(dt);
  }
  private update(dt: number) {
    this.yaw += this.input.yaw;
    this.pitch = T.MathUtils.clamp(this.pitch + this.input.pitch, 0.3, 0.95);
    this.input.yaw = this.input.pitch = 0;
    const move = this.input.move();
    if (this.input.take("Escape")) {
      this.paused = true;
      this.sound.pause();
      document.querySelector<HTMLElement>("#paused")!.hidden = false;
      return;
    }
    if (this.input.take("KeyQ")) this.throw();
    if (this.input.take("KeyE")) this.act();
    if (this.input.take("Space") && this.position.y === 0 && !this.hidden) {
      this.velocityY = 6;
      this.sound.tone(390, 0.14, 0.07);
    }
    const speed = this.hidden ? 0 : move.quiet ? 1.65 : move.run ? 6 : 3.2;
    if (move.moving && !this.hidden && this.catchTime <= 0) {
      const dx = move.x * Math.cos(this.yaw) + move.y * Math.sin(this.yaw),
        dz = -move.x * Math.sin(this.yaw) + move.y * Math.cos(this.yaw);
      this.position.x += dx * speed * dt;
      this.position.z += dz * speed * dt;
      this.world.resolve(this.position);
      const angle = Math.atan2(dx, dz);
      this.hero.g.rotation.y +=
        Math.atan2(
          Math.sin(angle - this.hero.g.rotation.y),
          Math.cos(angle - this.hero.g.rotation.y),
        ) * Math.min(1, dt * 14);
      this.stepTime += dt;
      if (this.stepTime > (move.run ? 0.33 : 0.65)) {
        this.stepTime = 0;
        if (!move.quiet) this.noise(this.position, move.run ? 5 : 1.6);
      }
    }
    if (this.position.y > 0 || this.velocityY > 0) {
      this.velocityY -= 16 * dt;
      this.position.y += this.velocityY * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocityY = 0;
        this.noise(this.position, 4);
      }
    }
    this.bubul.g.rotation.x =
      this.catchTime > 1.4 ? Math.sin(this.catchTime * 15) * 0.25 : 0;
    this.hero.g.position.copy(this.position);
    this.hero.g.scale.setScalar(this.hidden ? 0.55 : 0.78);
    this.hero.g.visible =
      this.catchTime <= 0 || Math.floor(this.catchTime * 8) % 2 === 0;
    const stride =
      move.moving && !this.hidden
        ? Math.sin(this.time * (move.run ? 15 : 8)) * 0.45
        : 0;
    this.hero.legs[0].rotation.x = stride;
    this.hero.legs[1].rotation.x = -stride;
    this.hero.arms[0].rotation.x = -stride;
    this.hero.arms[1].rotation.x = stride;
    this.hero.g.position.y += Math.abs(stride) * 0.08;
    this.catchTime = Math.max(0, this.catchTime - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.updateMonster(dt);
    this.animateWorld(dt);
    this.updateCamera(dt);
    this.sound.update(dt, this.day);
    this.onUpdate(dt);
    for (const p of this.world.lanterns)
      if (
        p.distanceTo(this.position) < 2 &&
        p.distanceTo(this.checkpoint) > 1
      ) {
        this.checkpoint.copy(p);
        this.toast(ru.checkpoint);
      }
    this.uiTimer -= dt;
    this.toastTimer -= dt;
    if (this.toastTimer <= 0)
      document.querySelector("#toast")!.classList.remove("show");
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.12;
      this.updateHud(move.quiet, move.run);
    }
  }
  private animateWorld(dt: number) {
    this.world.fireflies.rotation.y = Math.sin(this.time * 0.1) * 0.04;
    this.world.fireflies.position.y = Math.sin(this.time) * 0.12;
    this.world.flowers.forEach((f, i) => {
      f.rotation.y = Math.sin(this.time + i) * 0.18;
      f.scale.setScalar(1 + Math.sin(this.time * 2 + i) * 0.04);
    });
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      r.mesh.scale.setScalar(0.3 + r.age * r.size * 1.4);
      (r.mesh.material as T.MeshBasicMaterial).opacity = Math.max(
        0,
        0.65 - r.age * 0.55,
      );
      if (r.age > 1.2) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as T.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      const t = Math.min(p.age / 0.65, 1);
      p.mesh.position.lerpVectors(p.from, p.to, t);
      p.mesh.position.y += Math.sin(t * Math.PI) * 2.5;
      p.mesh.rotation.x += dt * 8;
      if (t === 1) {
        this.noise(p.to, 8);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }
  private updateMonster(dt: number) {
    if (this.day || this.friendlyBubul || !this.bubul.g.visible) return;
    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0 && this.monsterState !== "patrol") {
      this.monsterState = "patrol";
      this.monsterTimer = 4;
    }
    if (
      this.monsterState === "patrol" &&
      this.bubul.g.position.distanceTo(this.monsterTarget) < 1
    ) {
      this.monsterTarget.set(
        Math.sin(this.time * 0.37) * 6,
        0,
        -6 + Math.cos(this.time * 0.37) * 7,
      );
    }
    const delta = this.monsterTarget.clone().sub(this.bubul.g.position);
    delta.y = 0;
    const distance = delta.length();
    if (distance > 0.3) {
      delta.normalize();
      const speed =
        this.monsterState === "chase"
          ? 5.7
          : this.monsterState === "investigate"
            ? 2.4
            : 1.15;
      const angle = Math.atan2(delta.x, delta.z),
        turn = Math.atan2(
          Math.sin(angle - this.bubul.g.rotation.y),
          Math.cos(angle - this.bubul.g.rotation.y),
        );
      this.bubul.g.rotation.y += T.MathUtils.clamp(turn, -dt * 2.6, dt * 2.6);
      const step =
        Math.min(distance, speed * dt) * (Math.abs(turn) > 1.5 ? 0.22 : 1);
      this.bubul.g.position.x += Math.sin(this.bubul.g.rotation.y) * step;
      this.bubul.g.position.z += Math.cos(this.bubul.g.rotation.y) * step;
      this.world.resolve(this.bubul.g.position);
      this.bubul.g.rotation.z = Math.sin(this.time * 7) * 0.055;
    }
    if (this.hidden && this.monsterState === "chase") {
      this.monsterState = "investigate";
      this.monsterTimer = 2;
    }
    if (
      !this.hidden &&
      this.catchTime === 0 &&
      this.bubul.g.position.distanceTo(this.position) < 1.1
    ) {
      this.catchTime = 2;
      this.position.copy(this.checkpoint);
      this.velocityY = 0;
      this.monsterState = "patrol";
      this.monsterTimer = 0;
      this.monsterTarget.set(5, 0, -8);
      this.sound.tone(160, 0.4, 0.12);
      this.toast(ru.caught);
      this.onEvent("caught");
    }
  }
  private updateCamera(dt: number) {
    const target = this.position
      .clone()
      .add(new T.Vector3(0, this.hidden ? 0.8 : 1.15, 0));
    const distance = this.hidden ? 7 : 13;
    const offset = new T.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * distance,
      Math.sin(this.pitch) * distance,
      Math.cos(this.yaw) * Math.cos(this.pitch) * distance,
    );
    const ray = new T.Raycaster(
      target,
      offset.clone().normalize(),
      0.2,
      distance,
    );
    const hit = ray.intersectObjects(this.world.cameraObjects, false)[0];
    if (hit && hit.distance < distance)
      offset.setLength(Math.max(8, hit.distance - 0.3));
    this.camera.position.lerp(
      target.clone().add(offset),
      1 - Math.exp(-dt * 9),
    );
    this.camera.lookAt(
      target
        .clone()
        .add(
          new T.Vector3(
            -Math.sin(this.yaw) * 1.7,
            0.3,
            -Math.cos(this.yaw) * 1.7,
          ),
        ),
    );
    this.world.reveal(this.camera.position, this.position, dt);
    document.querySelector<HTMLElement>("#leaves")!.hidden = !this.hidden;
  }
  private updateHud(quiet: boolean, run: boolean) {
    document.querySelector("#objective")!.textContent = this.carrying
      ? ru.homeQuest
      : ru.quest;
    document.querySelector("#objective-hint")!.textContent = this.carrying
      ? ru.homeHint
      : ru.questHint;
    document.querySelector("#mode")!.textContent = this.hidden
      ? ru.hidden
      : quiet
        ? ru.quiet
        : run
          ? ru.run
          : ru.walk;
    document.querySelector("#flower-count")!.textContent = String(
      this.delivered + Number(this.carrying),
    );
    document.querySelector("#action-label")!.textContent = this.context();
    const marker = document.querySelector<HTMLElement>("#monster-marker")!;
    const p = this.bubul.g.position
      .clone()
      .add(new T.Vector3(0, 2.9, 0))
      .project(this.camera);
    marker.hidden =
      this.day || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
    marker.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
    marker.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
    marker.textContent =
      this.monsterState === "chase"
        ? "!"
        : this.monsterState === "investigate"
          ? "?"
          : "♪";
    marker.dataset.state = this.monsterState;
    const target = this.carrying
      ? new T.Vector3(0, 0, 10)
      : this.world.flowers.find((f) => f.visible)?.position;
    if (target) {
      const delta = target.clone().sub(this.position);
      const angle = Math.atan2(delta.x, -delta.z) + this.yaw;
      document.querySelector<HTMLElement>("#compass-arrow")!.style.transform =
        `rotate(${angle}rad)`;
      document.querySelector("#distance")!.textContent = localize(
        "s_3c3d75e788",
        Math.round(delta.length()),
      );
    }
    this.onHud();
    const prompt = document.querySelector<HTMLElement>("#context-prompt");
    if (prompt) {
      const label = this.context();
      prompt.textContent = `${label} · E / ✋`;
      prompt.hidden = label === ru.action;
    }

    if (import.meta.env.DEV)
      document.querySelector("#debug")!.textContent =
        `${Math.round(this.fps)} FPS · ${this.renderer.info.render.calls} draw calls`;
  }
}
