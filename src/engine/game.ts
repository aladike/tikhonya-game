import * as T from "three";
import { batchStatic } from "../optimize";
import { VoxelWorld } from "../world/world";
import { raycast, type Hit } from "../world/raycast";
import { moveAxis, collides, overlaps } from "../world/physics";
import { elevation } from "../world/generator";
import { block, initialBar } from "../data/blocks";
import { Controls } from "./controls";
import { IslandAudio } from "./audio";
import { Particles } from "./particles";
import { IslandStore } from "../save/store";
import { rle, unrle, type IslandSave } from "../save/format";
export class IslandGame {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 170);
  renderer: T.WebGLRenderer;
  world: VoxelWorld;
  input: Controls;
  audio = new IslandAudio();
  particles: Particles;
  store = new IslandStore();
  position = new T.Vector3();
  velocity = new T.Vector3();
  yaw = 0;
  pitch = -0.15;
  thirdPerson = false;
  wasThirdPerson = false;
  flying = false;
  grounded = false;
  swimming = false;
  paused = true;
  started = false;
  bar = [...initialBar];
  selected = 0;
  time = 0;
  fps = 60;
  quality: "auto" | "low" | "high" = "auto";
  name = "Солнечный остров";
  target: Hit | null = null;
  outline: T.LineSegments;
  ghost: T.Mesh;
  cracks: T.LineSegments;
  breakTime = 0;
  breakKey = "";
  lastJump = -10;
  stepTime = 0;
  specialTime = 0;
  saveTime = 0;
  dirty = false;
  hero = new T.Group();
  limbs: T.Mesh[] = [];
  clouds = new T.Group();
  butterflies = new T.Group();
  drops: { mesh: T.Mesh; id: number; age: number; velocity: T.Vector3 }[] = [];
  pops: { mesh: T.Mesh; age: number }[] = [];
  previous = 0;
  fpsTime = 0;
  fpsFrames = 0;
  lowFrames = 0;
  uiTime = 0;
  savePending: Promise<void> = Promise.resolve();
  onHud = () => {};
  onPickup = (_id: number, _point: T.Vector3) => {};
  onToast = (_text: string) => {};
  onPause = () => {};
  onInventory = () => {};
  onSave = (_ok: boolean) => {};
  constructor(
    canvas: HTMLCanvasElement,
    atlas: T.Texture,
    saved: IslandSave | null,
  ) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.scene.background = new T.Color("#4FB3FF");
    this.scene.fog = new T.Fog("#BDE8FF", 45, 94);
    const hemi = new T.HemisphereLight("#FFF1D6", "#5B6BB5", 2.5);
    this.scene.add(hemi);
    const sun = new T.DirectionalLight("#FFF1D6", 2.7);
    sun.position.set(100, 90, 140);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -27,
      right: 27,
      top: 27,
      bottom: -27,
      near: 0.5,
      far: 150,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun, sun.target);
    const seed = saved?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    this.world = new VoxelWorld(this.scene, seed, atlas);
    this.position.set(128.5, elevation(128, 206, seed) + 1.03, 206.5);
    if (saved) {
      this.name = saved.name;
      this.yaw = saved.yaw;
      this.pitch = saved.pitch;
      this.position.fromArray(saved.position);
      this.bar = saved.bar;
      this.selected = saved.selected;
      this.quality = saved.quality;
      this.audio.music = saved.music;
      this.audio.effects = saved.effects;
      this.world.restore(
        Object.fromEntries(
          Object.entries(saved.chunks).map(([k, v]) => [k, unrle(v)]),
        ),
      );
    }
    const get = this.world.get.bind(this.world);
    while (collides(this.position, get) && this.position.y < 63)
      this.position.y++;
    this.input = new Controls(canvas);
    this.input.touchSensitivity = saved?.touchSensitivity ?? 1;
    this.input.mouseSensitivity = saved?.mouseSensitivity ?? 1;
    this.input.onPlace = () => {
      if (!this.paused) this.place();
    };
    this.input.onSelect = (i) => {
      this.selected = i;
      this.onHud();
    };
    this.input.onWheel = (d) => {
      this.selected = (this.selected + d + 9) % 9;
      this.onHud();
    };
    this.particles = new Particles(this.scene);
    const edges = new T.EdgesGeometry(new T.BoxGeometry(1.008, 1.008, 1.008));
    this.outline = new T.LineSegments(
      edges,
      new T.LineBasicMaterial({
        color: "#3B2A4A",
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.scene.add(this.outline);
    this.ghost = new T.Mesh(
      new T.BoxGeometry(0.985, 0.985, 0.985),
      new T.MeshBasicMaterial({
        color: "#47C7A5",
        transparent: true,
        opacity: 0.27,
        depthWrite: false,
      }),
    );
    this.scene.add(this.ghost);
    const crackPoints: number[] = [];
    for (let f = 0; f < 6; f++)
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4,
          r = 0.07 + (i % 4) * 0.09;
        const p = new T.Vector3(Math.sin(a) * r, Math.cos(a) * r, 0.505),
          q = new T.Vector3(
            Math.sin(a + 0.3) * (r + 0.15),
            Math.cos(a + 0.3) * (r + 0.15),
            0.505,
          );
        if (f < 2) {
          p.applyAxisAngle(new T.Vector3(0, 1, 0), f ? Math.PI : 0);
          q.applyAxisAngle(new T.Vector3(0, 1, 0), f ? Math.PI : 0);
        } else if (f < 4) {
          p.applyAxisAngle(
            new T.Vector3(0, 1, 0),
            f === 2 ? Math.PI / 2 : -Math.PI / 2,
          );
          q.applyAxisAngle(
            new T.Vector3(0, 1, 0),
            f === 2 ? Math.PI / 2 : -Math.PI / 2,
          );
        } else {
          p.applyAxisAngle(
            new T.Vector3(1, 0, 0),
            f === 4 ? Math.PI / 2 : -Math.PI / 2,
          );
          q.applyAxisAngle(
            new T.Vector3(1, 0, 0),
            f === 4 ? Math.PI / 2 : -Math.PI / 2,
          );
        }
        crackPoints.push(...p.toArray(), ...q.toArray());
      }
    this.cracks = new T.LineSegments(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(crackPoints, 3),
      ),
      new T.LineBasicMaterial({ color: "#3B2A4A" }),
    );
    this.cracks.visible = false;
    this.scene.add(this.cracks);
    const cube = (
      parent: T.Object3D,
      color: string,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const m = new T.Mesh(
        new T.BoxGeometry(sx, sy, sz),
        new T.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    cube(this.hero, "#FF7A59", 0, 0.88, 0, 0.48, 0.6, 0.3);
    cube(this.hero, "#F6C79F", 0, 1.44, 0, 0.43, 0.43, 0.4);
    cube(this.hero, "#704445", 0, 1.65, -0.05, 0.47, 0.12, 0.46);
    cube(this.hero, "#FFD23F", 0, 1.75, 0, 0.57, 0.14, 0.55);
    for (const x of [-0.11, 0.11])
      cube(this.hero, "#3B2A4A", x, 1.46, -0.207, 0.04, 0.045, 0.015);
    for (const x of [-0.15, 0.15])
      this.limbs.push(cube(this.hero, "#5366A3", x, 0.3, 0, 0.19, 0.6, 0.22));
    for (const x of [-0.35, 0.35])
      this.limbs.push(cube(this.hero, "#FF9C79", x, 0.88, 0, 0.15, 0.55, 0.18));
    this.scene.add(this.hero);
    for (let i = 0; i < 14; i++) {
      const cloud = new T.Group();
      cloud.position.set(
        85 + (i % 5) * 23,
        48 + (i % 3) * 4,
        100 + Math.floor(i / 5) * 33,
      );
      for (let k = 0; k < 3; k++)
        cube(cloud, "#FFFFFF", k * 2, 0, (k % 2) * 1.5, 4, 1.2, 3);
      this.clouds.add(cloud);
    }
    batchStatic(this.clouds);
    this.clouds.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
    this.scene.add(this.clouds);
    for (let i = 0; i < 8; i++) {
      const butterfly = new T.Group();
      for (const side of [-1, 1])
        cube(
          butterfly,
          i % 2 ? "#FFD23F" : "#FF9CC7",
          side * 0.11,
          0,
          0,
          0.22,
          0.025,
          0.2,
        );
      this.butterflies.add(butterfly);
    }
    this.scene.add(this.butterflies);
    const sky = new T.Mesh(
      new T.SphereGeometry(145, 24, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color("#4FB3FF") },
          bottom: { value: new T.Color("#BDE8FF") },
        },
        vertexShader:
          "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-.1,.8,normalize(v).y)),1.);}",
      }),
    );
    this.scene.add(sky);
    const sea = new T.Mesh(
      new T.PlaneGeometry(700, 700),
      new T.MeshStandardMaterial({
        color: "#3CC8E8",
        transparent: true,
        opacity: 0.7,
        roughness: 0.25,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(128, 7.8, 128);
    this.scene.add(sea);
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pause();
        void this.save();
      }
    });
    window.addEventListener("pagehide", () => {
      void this.save();
    });
    window.addEventListener("blur", () => {
      if (this.started) this.pause();
    });
    this.setQuality(this.quality);
    this.renderer.setAnimationLoop((ms) => {
      const elapsed = (ms - this.previous) / 1000 || 0.016,
        dt = Math.min(elapsed, 0.045);
      this.previous = ms;
      if (!this.paused) {
        this.time += dt;
        this.update(dt);
        this.audio.update();
      }
      this.world.update(this.position, this.time);
      this.updateCamera(dt);
      this.hero.visible =
        this.thirdPerson &&
        this.camera.position.distanceTo(
          this.position.clone().add(new T.Vector3(0, 1.3, 0)),
        ) > 1.5;
      this.hero.position.copy(this.position);
      this.hero.rotation.y = this.yaw;
      sky.position.copy(this.position);
      sun.position.set(this.position.x - 22, 70, this.position.z + 18);
      sun.target.position.copy(this.position);
      this.clouds.children.forEach(
        (c, i) => (c.position.x += Math.sin(i + 1) * dt * 0.11),
      );
      this.butterflies.children.forEach((b, i) => {
        b.position.set(
          this.position.x + Math.sin(this.time * 0.3 + i) * 9,
          this.position.y + 1.5 + Math.sin(this.time + i) * 0.6,
          this.position.z + Math.cos(this.time * 0.3 + i) * 9,
        );
        b.rotation.y = -this.time * 0.3 - i;
        b.children.forEach(
          (wing, k) =>
            (wing.rotation.z = Math.sin(this.time * 14 + i) * (k ? 1 : -1)),
        );
      });
      this.particles.update(this.paused ? 0 : dt);
      if (!document.hidden) this.renderer.render(this.scene, this.camera);
      this.fpsTime += elapsed;
      this.fpsFrames++;
      if (this.fpsTime >= 1) {
        this.fps = this.fpsFrames / this.fpsTime;
        this.fpsTime = this.fpsFrames = 0;
        this.lowFrames = this.fps < 30 ? this.lowFrames + 1 : 0;
        if (this.quality === "auto" && this.lowFrames >= 5) {
          this.renderer.setPixelRatio(1);
          this.renderer.shadowMap.enabled = false;
          this.world.radius = 3;
        }
      }
      this.uiTime -= dt;
      if (this.uiTime <= 0) {
        this.uiTime = 0.12;
        this.onHud();
      }
    });
  }
  async start() {
    this.started = true;
    this.paused = false;
    await this.audio.start();
    void this.save();
  }
  pause() {
    this.paused = true;
    this.input.clear();
    this.audio.pause();
    document.exitPointerLock?.();
    this.onPause();
  }
  setQuality(q: "auto" | "low" | "high") {
    this.quality = q;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, q === "low" ? 1 : q === "high" ? 2 : 1.5),
    );
    this.renderer.shadowMap.enabled = q !== "low";
    this.world.radius = q === "low" ? 3 : q === "high" ? 5 : 4;
  }
  pick(screen = this.input.screen) {
    const ndc = screen
      ? new T.Vector2(
          (screen.x / innerWidth) * 2 - 1,
          1 - (screen.y / innerHeight) * 2,
        )
      : new T.Vector2();
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    return raycast(
      ray.ray.origin,
      ray.ray.direction,
      this.world.get.bind(this.world),
      8,
    );
  }
  place() {
    const hit = this.pick();
    if (!hit) return;
    const x = hit.x + hit.normal.x,
      y = hit.y + hit.normal.y,
      z = hit.z + hit.normal.z,
      id = this.bar[this.selected];
    if (
      y < 0 ||
      y >= 64 ||
      x < 0 ||
      z < 0 ||
      x >= 256 ||
      z >= 256 ||
      block(this.world.get(x, y, z)).solid ||
      overlaps(this.position, x, y, z, id)
    ) {
      this.onToast("Здесь тесно — шагни чуть в сторону");
      return;
    }
    this.world.set(x, y, z, id);
    this.dirty = true;
    this.audio.material(block(id).material, "place");
    this.particles.burst(
      new T.Vector3(x + 0.5, y + 0.5, z + 0.5),
      block(id).color,
      6,
      id === 27,
    );
    const material = this.world.materials[0].clone();
    material.map = null;
    material.color.set(block(id).color);
    const pop = new T.Mesh(new T.BoxGeometry(1, 1, 1), material);
    pop.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(pop);
    this.pops.push({ mesh: pop, age: 0 });
    if (block(id).special) {
      this.audio.chime(65 + (id % 5));
      this.onToast(`${block(id).name}: попробуй наступить!`);
    }
    document
      .querySelector(`[data-slot="${this.selected}"]`)
      ?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.18)" },
          { transform: "scale(1)" },
        ],
        { duration: 220 },
      );
    void this.saveSoon();
  }
  breakBlock(hit: Hit) {
    if (!this.world.set(hit.x, hit.y, hit.z, 0)) return;
    this.dirty = true;
    const b = block(hit.id),
      at = new T.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.particles.burst(at, b.color, 14);
    this.audio.material(b.material, "break");
    const mesh = new T.Mesh(
      new T.BoxGeometry(0.22, 0.22, 0.22),
      new T.MeshStandardMaterial({ color: b.color }),
    );
    mesh.position.copy(at);
    this.scene.add(mesh);
    this.drops.push({
      mesh,
      id: hit.id,
      age: 0,
      velocity: new T.Vector3(
        (Math.random() - 0.5) * 1.5,
        3,
        (Math.random() - 0.5) * 1.5,
      ),
    });
    if (hit.id === 6 && Math.random() < 0.3) {
      this.particles.burst(
        at.clone().add(new T.Vector3(0, 1, 0)),
        "#FF7A59",
        8,
        true,
      );
      this.audio.chime(74);
      this.onToast("Яблочный салют! Дерево сказало спасибо.");
    }
    this.breakTime = 0;
    void this.saveSoon();
  }
  async saveSoon() {
    this.saveTime = 0.6;
  }
  update(dt: number) {
    this.input.update(dt);
    this.yaw += this.input.yaw;
    this.pitch = T.MathUtils.clamp(this.pitch + this.input.pitch, -1.4, 1.4);
    this.input.yaw = this.input.pitch = 0;
    if (this.input.take("Escape")) {
      this.pause();
      return;
    }
    if (this.input.take("KeyE")) {
      this.onInventory();
      return;
    }
    if (this.input.take("F5")) this.thirdPerson = !this.thirdPerson;
    if (this.input.take("KeyF")) {
      const h = this.pick();
      if (h && block(h.id).special) {
        this.audio.chime(68);
        this.particles.burst(
          new T.Vector3(h.x + 0.5, h.y + 1, h.z + 0.5),
          block(h.id).color,
          20,
          true,
        );
      }
    }
    const jump = this.input.take("Space");
    if (jump) {
      if (this.time - this.lastJump < 0.35) {
        this.flying = !this.flying;
        this.velocity.y = 0;
        this.onToast(
          this.flying
            ? "Полёт! Прыжок — вверх, присесть — вниз"
            : "Снова на землю",
        );
      }
      this.lastJump = this.time;
      if (this.grounded || this.swimming)
        this.velocity.y = this.swimming ? 4 : 7.3;
    }
    const move = this.input.move(),
      get = this.world.get.bind(this.world);
    this.swimming =
      this.world.get(
        this.position.x,
        this.position.y + 0.7,
        this.position.z,
      ) === 10;
    const speed = this.flying
        ? 9
        : this.swimming
          ? 3
          : move.quiet
            ? 2
            : move.run
              ? 7
              : 4.3,
      dx = move.x * Math.cos(this.yaw) + move.y * Math.sin(this.yaw),
      dz = -move.x * Math.sin(this.yaw) + move.y * Math.cos(this.yaw);
    for (const [axis, amount] of [
      ["x", dx * speed * dt],
      ["z", dz * speed * dt],
    ] as const) {
      if (!moveAxis(this.position, axis, amount, get) && this.grounded) {
        const raised = this.position.clone();
        raised.y += 0.51;
        if (!collides(raised, get) && moveAxis(raised, axis, amount, get))
          this.position.copy(raised);
      }
    }
    if (this.flying) {
      this.velocity.y =
        ((this.input.keys.has("Space") || this.input.keys.has("FlyUp")
          ? 1
          : 0) -
          (move.quiet || this.input.keys.has("FlyDown") ? 1 : 0)) *
        6;
    } else {
      this.velocity.y -= (this.swimming ? 4 : 20) * dt;
      if (this.swimming) {
        this.velocity.y = Math.max(-1.4, this.velocity.y);
        if (this.input.keys.has("Space")) this.velocity.y = 3.6;
      }
    }
    const vy = this.velocity.y;
    this.grounded = !moveAxis(this.position, "y", vy * dt, get) && vy <= 0;
    if (
      this.grounded ||
      (vy > 0 && collides({ ...this.position, y: this.position.y + 0.02 }, get))
    )
      this.velocity.y = 0;
    if (this.grounded) {
      const floorId = get(
          this.position.x,
          this.position.y - 0.04,
          this.position.z,
        ),
        floor = block(floorId);
      if (floor.bounce) {
        this.velocity.y = floor.bounce;
        this.grounded = false;
        this.audio.chime(60);
        this.particles.burst(
          this.position.clone(),
          floor.color,
          14,
          floorId === 28,
        );
      }
    }
    this.position.x = T.MathUtils.clamp(this.position.x, 0.35, 255.65);
    this.position.z = T.MathUtils.clamp(this.position.z, 0.35, 255.65);
    this.position.y = Math.min(85, this.position.y);
    if (this.position.y < -8) {
      this.position.set(128.5, elevation(128, 206, this.world.seed) + 2, 206.5);
      this.velocity.set(0, 0, 0);
    }
    this.target = this.pick();
    this.outline.visible = !!this.target;
    this.ghost.visible = !!this.target;
    if (this.target) {
      const h = this.target;
      this.outline.position.set(h.x + 0.5, h.y + 0.5, h.z + 0.5);
      this.ghost.position.set(
        h.x + h.normal.x + 0.5,
        h.y + h.normal.y + 0.5,
        h.z + h.normal.z + 0.5,
      );
      (this.ghost.material as T.MeshBasicMaterial).color.set(
        overlaps(
          this.position,
          h.x + h.normal.x,
          h.y + h.normal.y,
          h.z + h.normal.z,
        )
          ? "#FF7A59"
          : "#47C7A5",
      );
      const key = `${h.x},${h.y},${h.z}`;
      if (key !== this.breakKey) {
        this.breakTime = 0;
        this.breakKey = key;
      }
      if (this.input.breaking) {
        this.breakTime += dt;
        this.cracks.position.copy(this.outline.position);
        this.cracks.geometry.setDrawRange(
          0,
          Math.max(6, Math.floor((this.breakTime / 0.2) * 144)),
        );
        if (this.breakTime >= 0.2) {
          this.breakBlock(h);
          navigator.vibrate?.(12);
        }
      } else this.breakTime = 0;
    } else this.breakTime = 0;
    this.cracks.visible = this.breakTime > 0;
    this.stepTime += dt;
    if (
      move.moving &&
      this.grounded &&
      this.stepTime > (move.run ? 0.28 : 0.45)
    ) {
      this.stepTime = 0;
      this.audio.material(
        block(get(this.position.x, this.position.y - 0.08, this.position.z))
          .material,
        "step",
      );
    }
    this.limbs.forEach(
      (leg, i) =>
        (leg.rotation.x = move.moving
          ? Math.sin(this.time * (move.run ? 14 : 9) + i * Math.PI) * 0.55
          : 0),
    );
    this.specialTime -= dt;
    const under = block(
      get(this.position.x, this.position.y - 0.1, this.position.z),
    );
    if (this.specialTime <= 0 && under.special) {
      this.specialTime = 1.6;
      if (under.special === "bubbles")
        this.particles.bubbleBurst(
          this.position.clone().add(new T.Vector3(0, 0.5, 0)),
        );
      this.audio.chime(under.special === "shell" ? 69 : 76);
      this.particles.burst(
        this.position.clone().add(new T.Vector3(0, 0.5, 0)),
        under.color,
        18,
        true,
      );
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.mesh.rotation.y += dt * 2;
      if (d.age < 0.45) {
        d.velocity.y -= 9 * dt;
        d.mesh.position.addScaledVector(d.velocity, dt);
      } else {
        const delta = this.position
          .clone()
          .add(new T.Vector3(0, 1, 0))
          .sub(d.mesh.position);
        if (delta.length() < 10)
          d.mesh.position.addScaledVector(delta, Math.min(1, dt * (3 + d.age)));
        if (delta.length() < 0.45) {
          this.audio.material("glass", "step");
          this.onPickup(d.id, d.mesh.position.clone().project(this.camera));
          this.particles.burst(d.mesh.position, block(d.id).color, 4);
          document
            .querySelector(`[data-slot="${this.selected}"]`)
            ?.animate(
              [{ transform: "scale(1.14)" }, { transform: "scale(1)" }],
              200,
            );
          d.mesh.removeFromParent();
          d.mesh.geometry.dispose();
          (d.mesh.material as T.Material).dispose();
          this.drops.splice(i, 1);
        } else if (d.age > 20) {
          // Creative materials are unlimited; distant visual drops must not
          // accumulate GPU objects after the player flies away.
          d.mesh.removeFromParent();
          d.mesh.geometry.dispose();
          (d.mesh.material as T.Material).dispose();
          this.drops.splice(i, 1);
        }
      }
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.age += dt;
      p.mesh.scale.setScalar(1 + Math.sin((p.age / 0.22) * Math.PI) * 0.1);
      if (p.age > 0.22) {
        p.mesh.removeFromParent();
        p.mesh.geometry.dispose();
        (p.mesh.material as T.Material).dispose();
        this.pops.splice(i, 1);
      }
    }
    if (this.saveTime > 0) {
      this.saveTime -= dt;
      if (this.saveTime <= 0) void this.save();
    }
  }
  updateCamera(dt: number) {
    const eye = this.position.clone().add(new T.Vector3(0, 1.48, 0));
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    if (!this.thirdPerson) {
      this.camera.position.copy(eye);
      this.wasThirdPerson = false;
      return;
    }
    const viewRotation = this.camera.quaternion.clone();
    const back = new T.Vector3(0, 1.2, 5).applyQuaternion(viewRotation);
    const hit = raycast(
      eye,
      back.clone().normalize(),
      (x, y, z) => {
        const id = this.world.get(x, y, z);
        return block(id).solid ? id : 0;
      },
      back.length(),
    );
    if (hit) back.setLength(Math.max(0.3, hit.distance - 0.2));
    const desired = eye.clone().add(back);
    if (!this.wasThirdPerson) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    this.wasThirdPerson = true;
    const actual = this.camera.position.clone().sub(eye),
      clip = raycast(
        eye,
        actual.clone().normalize(),
        (x, y, z) => {
          const id = this.world.get(x, y, z);
          return block(id).solid ? id : 0;
        },
        actual.length(),
      );
    if (clip)
      this.camera.position
        .copy(eye)
        .addScaledVector(
          actual.normalize(),
          Math.max(0.3, clip.distance - 0.25),
        );
    this.camera.lookAt(
      eye.clone().add(new T.Vector3(0, 0, -2).applyQuaternion(viewRotation)),
    );
  }
  snapshot(): IslandSave {
    const chunks: Record<string, number[]> = {};
    for (const key of this.world.changed)
      chunks[key] = rle(this.world.data.get(key)!);
    return {
      version: 1,
      kind: "tikhonya-island",
      seed: this.world.seed,
      name: this.name,
      updated: Date.now(),
      position: this.position.toArray() as [number, number, number],
      yaw: this.yaw,
      pitch: this.pitch,
      bar: [...this.bar],
      selected: this.selected,
      chunks,
      music: this.audio.music,
      effects: this.audio.effects,
      touchSensitivity: this.input.touchSensitivity,
      mouseSensitivity: this.input.mouseSensitivity,
      quality: this.quality,
    };
  }
  save() {
    const status = document.querySelector("#save-status");
    if (status) status.textContent = "Сохраняем остров…";
    const data = this.snapshot();
    this.savePending = this.savePending
      .catch(() => {})
      .then(() => this.store.save(data))
      .then(() => {
        this.dirty = false;
        this.onSave(true);
      })
      .catch(() => this.onSave(false));
    return this.savePending;
  }
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.world.dispose();
    this.renderer.dispose();
  }
}
