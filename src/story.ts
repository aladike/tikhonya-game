import { localize } from "./localize";
import * as T from "three";
import { batchStatic, clearGenerated } from "./optimize";
import type { Adventure } from "./adventure";
import { zoneNames, names } from "./adventure";
import type { Village } from "./village";
import { monster, orb, box, home, flower, material } from "./models";
import { stories, natureEntries, helperNames } from "./content";
export class Story {
  decor = new T.Group();
  villageDecor = new T.Group();
  special = monster(2);
  gift = new T.Group();
  goal = new T.Vector3();
  awake = false;
  smell: T.Vector3[] = [];
  smellTime = 0;
  smellSafe = 0;
  rock?: T.Mesh;
  bridge = new T.Group();
  treehouse = new T.Group();
  sparkles = new T.Group();
  insects = new T.Group();
  trail: T.Mesh[] = [];
  lastZone = -1;
  lastPosition = new T.Vector3(0, 0, 8);
  splashCooldown = 0;
  constructor(
    public a: Adventure,
    public village: Village,
  ) {
    const g = a.game;
    g.scene.add(
      this.decor,
      this.villageDecor,
      this.special.g,
      this.sparkles,
      this.insects,
    );
    for (const [i, id] of ["beetle", "spider"].entries()) {
      const body = orb(
        this.insects,
        id === "beetle" ? "#c1ab65" : "#a09dba",
        i * 0.4,
        0.2,
        0,
        0.18,
        0.12,
        0.25,
      );
      body.visible = false;
    }
    for (let i = 0; i < 14; i++) {
      const dot = orb(
        this.sparkles,
        "#ffe7a4",
        0,
        0.3,
        0,
        0.045,
        0.045,
        0.045,
        1,
      );
      dot.castShadow = false;
    }
    const update = g.onUpdate,
      hud = g.onHud,
      interact = g.onInteract,
      context = g.extraContext,
      event = g.onEvent;
    g.onUpdate = (dt) => {
      update(dt);
      this.update(dt);
    };
    g.onHud = () => {
      hud();
      this.hud();
    };
    g.onInteract = () => this.interact() || interact();
    g.extraContext = () => this.context() || context();
    g.onEvent = (e) => {
      event(e);
      if (e === "delivery") this.refreshVillage();
    };
    const change = a.changeZone.bind(a);
    a.changeZone = (zone, save = true) => {
      change(zone, save);
      this.buildZone();
    };
    a.map = () => this.map();
    a.helpers = () => this.helpers();
    const command = a.command.bind(a);
    a.command = (key) => {
      if (["fetch", "bark", "scout"].includes(key)) {
        const id = key === "scout" ? "cat" : "dog";
        if (!a.state.helpers.includes(id)) {
          g.toast(localize("s_e8d0debc37"));
          return;
        }
        command(key);
        if (
          key === "scout" &&
          a.state.zone === 0 &&
          !a.state.friends.includes(0)
        ) {
          this.gift.position.y = 0;
          g.toast(localize("s_0ed2140d28"));
        }
      } else this.ability(key);
    };
    document
      .querySelector(".top-actions")!
      .insertAdjacentHTML("afterbegin", localize("s_ada6165711"));
    document
      .querySelector("#book")!
      .addEventListener("click", () => this.book());
    document
      .querySelector("#hud")!
      .insertAdjacentHTML("beforeend", localize("s_4c65310a22"));
    this.applyOutfit();
    this.buildZone();
    this.refreshVillage();
    if (a.state.zone > 1) a.changeZone(a.state.zone, false);
  }
  owner() {
    return Math.min(this.a.state.zone, 3);
  }
  targetMonster() {
    return this.owner() === 0
      ? this.a.game.bubul.g
      : this.owner() === 1
        ? this.a.enemy.g
        : this.special.g;
  }
  unlocked(zone: number) {
    const s = this.a.state;
    return (
      zone === 0 ||
      (zone === 1 && s.delivered > 0) ||
      (zone > 1 && zone < 4 && s.friends.includes(zone - 1)) ||
      (zone === 4 && s.friends.length === 4)
    );
  }
  buildZone() {
    const a = this.a,
      g = a.game,
      z = a.state.zone;
    this.lastZone = z;
    clearGenerated(this.decor);
    this.bridge = new T.Group();
    this.decor.add(this.bridge);
    this.rock = undefined;
    this.smell = [];
    this.special.g.visible = z === 2 || z === 3;
    this.special.g.position.set(3, 0, -9);
    if (z >= 2) {
      clearGenerated(this.special.g);
      this.special.g.removeFromParent();
      this.special = monster(z === 2 ? 2 : 3);
      g.scene.add(this.special.g);
      this.special.g.position.set(3, 0, -9);
      a.discover(z === 2 ? "sonka" : "nyuhach");
    }
    if (z === 1) {
      for (let i = 0; i < 9; i++)
        orb(this.decor, "#b6ced0", -9 + i * 2, 0.25, -6, 0.65, 0.4, 0.55);
    }
    if (z === 2) {
      for (let i = 0; i < 65; i++) {
        const x = Math.sin(i * 2.4) * (5 + (i % 15)),
          zz = Math.cos(i * 2.4) * (4 + (i % 19));
        flower(
          this.decor,
          x,
          zz,
          i % 2 ? "#e7b1c3" : "#e7d395",
        ).scale.setScalar(0.6 + (i % 3) * 0.12);
      }
      for (let i = 0; i < 4; i++) {
        orb(this.decor, "#ecd3b1", -10 + i * 7, 0.7, -8, 1.4, 0.16, 1);
        box(this.decor, "#a58c75", -10 + i * 7, 0.4, -8, 0.2, 0.8, 0.2);
      }
    }
    if (z === 3) {
      for (let i = 0; i < 16; i++) {
        const x = (i % 2 ? -1 : 1) * (7 + (i % 5)),
          zz = 12 - i * 2;
        orb(this.decor, "#aaaeb6", x, 0.6, zz, 1.5, 0.9, 1);
      }
      const puddle = new T.Mesh(
        new T.CircleGeometry(2.2, 24),
        new T.MeshStandardMaterial({ color: "#75b4c2", roughness: 0.15 }),
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(-3, 0.07, -5);
      this.decor.add(puddle);
      for (let i = 0; i < 6; i++)
        flower(this.decor, 4 + Math.sin(i), -9 + Math.cos(i));
    }
    if (z === 4) {
      box(this.decor, "#624d3c", 0, 5, -20, 3.8, 10, 3.5);
      for (let i = 0; i < 6; i++)
        orb(
          this.decor,
          "#6b966e",
          Math.sin(i) * 3,
          10 + (i % 2),
          -20 + Math.cos(i) * 3,
          3.5,
          1.8,
          3,
        );
      for (const x of [-4, 4]) {
        box(this.decor, "#a18a68", x, 0.5, -4, 5, 1, 2);
        box(this.decor, "#567c76", x, 0.08, -11, 25, 0.15, 3);
      }
      this.rock = orb(this.decor, "#b6b4a5", 0, 0.7, -4, 1.6, 1.5, 1.2);
      for (let i = 0; i < 8; i++)
        box(this.bridge, "#e6d5ac", 0, 0.18, -9 - i * 0.55, 2.8, 0.16, 0.42);
      for (const x of [-1.5, 1.5])
        box(this.bridge, "#e6d5ac", x, 0.8, -11, 0.07, 0.07, 4);
      this.bridge.visible = a.state.found.includes("puzzle-bridge");
      this.rock.visible = !a.state.found.includes("puzzle-rock");
      this.buildTreehouse();
    }
    this.gift = new T.Group();
    this.decor.add(this.gift);
    if (z < 4) {
      const s = stories[z];
      this.gift.position.set(s.x, z === 0 ? 1.8 : 0, s.z);
      orb(
        this.gift,
        ["#d9ae6d", "#ffeac1", "#dac0d7", "#b4d6a8"][z],
        0,
        0.6,
        0,
        0.38,
        z === 2 ? 0.15 : 0.35,
        0.3,
        0.5,
      );
      const ring = new T.Mesh(
        new T.RingGeometry(0.65, 0.75, 32),
        new T.MeshBasicMaterial({
          color: "#ffe6a3",
          transparent: true,
          opacity: 0.7,
          side: T.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      this.gift.add(ring);
      this.gift.visible =
        !a.state.found.includes(`gift-${z}`) && !a.state.friends.includes(z);
    }
    this.trail = [];
    for (let i = 0; i < 16; i++) {
      const dot = orb(
        this.decor,
        "#d4c49e",
        0,
        0.08,
        0,
        0.12,
        0.035,
        0.12,
        0.2,
      );
      dot.visible = false;
      this.trail.push(dot);
    }
    batchStatic(this.decor, [
      this.gift,
      this.bridge,
      this.treehouse,
      ...this.trail,
      ...(this.rock ? [this.rock] : []),
    ]);
    if (z < 4 && a.state.friends.includes(z))
      g.toast(localize("s_0ff74e6169", names[z]));
  }
  buildTreehouse() {
    this.treehouse.removeFromParent();
    this.treehouse = new T.Group();
    this.decor.add(this.treehouse);
    if (!this.a.state.buildings.includes("treehouse")) return;
    const h = home(this.treehouse, 0, -20, "#e6c797");
    h.position.y = 5;
    h.scale.setScalar(1.05);
    box(this.treehouse, "#b59974", 0, 4.9, -20, 7, 0.3, 6);
    for (let i = 0; i < 12; i++)
      box(
        this.treehouse,
        "#d7bd8d",
        0,
        0.2 + i * 0.4,
        -15 - i * 0.35,
        1.6,
        0.13,
        0.3,
      );
    for (let i = 0; i < 7; i++)
      flower(this.treehouse, -2 + i * 0.65, -17).position.y = 5;
  }
  refreshVillage() {
    clearGenerated(this.villageDecor);
    const s = this.a.state;
    s.friends.forEach((id, i) => {
      const p = monster(id);
      p.g.position.set(-9 + i * 6, 0, 17);
      p.g.scale.setScalar(0.8);
      this.villageDecor.add(p.g);
      if (s.buildings.includes(`friendhouse-${id}`)) {
        const h = home(
          this.villageDecor,
          -9 + i * 6,
          19,
          ["#baa5d2", "#dfbb8d", "#e0bad0", "#acd1ad"][id],
        );
        h.scale.setScalar(0.55);
      }
    });
    for (let level = 0; level < s.homeLevel; level++) {
      const x = level % 2 === 0 ? -3.2 : 3.2,
        y = level > 2 ? 3 : 0;
      const h = home(this.villageDecor, x, 14, "#d4bd93");
      h.scale.setScalar(0.6);
      h.position.y = y;
    }
    if (s.homeLevel === 5)
      for (let i = 0; i < 6; i++)
        flower(this.villageDecor, i * 0.6 - 1.5, 14).position.y = 5;
  }
  context() {
    const a = this.a,
      g = a.game,
      z = a.state.zone;
    if (g.hidden || g.day) return null;
    if (z === 4) {
      if (g.position.z < -16 && !a.state.buildings.includes("treehouse"))
        return localize("s_d340f9d782");
      if (this.rock?.visible && g.position.distanceTo(this.rock.position) < 3)
        return localize("s_b0f6e85ff9");
      if (!this.bridge.visible && Math.abs(g.position.z + 9) < 2)
        return localize("s_db5127a5e5");
      return null;
    }
    if (this.gift.visible && this.gift.position.distanceTo(g.position) < 2.6)
      return z === 0 && this.gift.position.y > 1
        ? localize("s_529e34982e")
        : localize("s_e1dda8226b");
    if (
      g.position.distanceTo(this.targetMonster().position) < 2.8 &&
      !a.state.friends.includes(z)
    )
      return a.state.found.includes(`gift-${z}`)
        ? localize("s_677eef9daa")
        : localize("s_cf4a3bdb97");
    return null;
  }
  interact() {
    const a = this.a,
      g = a.game,
      z = a.state.zone,
      context = this.context();
    if (!context) return false;
    if (context === localize("s_529e34982e")) {
      a.command("scout");
      return true;
    }
    if (context === localize("s_b0f6e85ff9")) {
      this.ability("beetle");
      return true;
    }
    if (context === localize("s_db5127a5e5")) {
      this.ability("spider");
      return true;
    }
    if (context === localize("s_e1dda8226b")) {
      this.gift.visible = false;
      a.state.found.push(`gift-${z}`);
      g.sound.chime();
      g.toast(localize("s_bbdab7f69f", stories[z].gift, stories[z].name));
      a.persist();
      return true;
    }
    if (context === localize("s_cf4a3bdb97")) {
      a.panel(
        `<span class="eyebrow">${stories[z].title}</span><h2>${stories[z].name}</h2><p>${stories[z].line}</p><p>${stories[z].hint}</p>`,
      );
      return true;
    }
    if (context === localize("s_677eef9daa")) {
      a.state.friends.push(z);
      a.state.inventory.wood += 3;
      a.state.inventory.stone += 2;
      a.state.inventory.flower++;
      for (const id of ["fireflies", "beetle", "spider"].slice(0, z + 1))
        a.discover(id);
      if (a.state.helpers.length < 3 && z === 0)
        a.state.helpers.push("fireflies");
      g.friendlyBubul = a.state.friends.includes(0);
      g.sound.chime();
      g.toast(stories[z].reward);
      a.persist();
      this.refreshVillage();
      this.book();
      return true;
    }
    if (context === localize("s_d340f9d782")) {
      this.finish();
      return true;
    }
    return false;
  }
  finish() {
    const a = this.a;
    if (a.state.friends.length < 4) {
      a.game.toast(localize("s_f59ae62eb2"));
      return;
    }
    a.state.buildings.push("treehouse");
    this.buildTreehouse();
    a.persist();
    a.game.sound.chime();
    a.panel(localize("s_ad13af69e4"));
    document.querySelector<HTMLButtonElement>("#celebrate")!.onclick = () =>
      a.resume();
  }
  ability(id: string) {
    const a = this.a,
      g = a.game;
    if (!a.state.helpers.includes(id)) {
      g.toast(localize("s_6934be0712", helperNames[id]));
      return;
    }
    if (id === "fireflies") {
      g.toast(localize("s_a1a5745475"));
      return;
    }
    if (
      id === "beetle" &&
      a.state.zone === 4 &&
      this.rock?.visible &&
      g.position.distanceTo(this.rock.position) < 5
    ) {
      this.rock.visible = false;
      a.state.found.push("puzzle-rock");
      g.toast(localize("s_39912ccc39"));
    } else if (
      id === "spider" &&
      a.state.zone === 4 &&
      Math.abs(g.position.z + 9) < 4
    ) {
      this.bridge.visible = true;
      a.state.found.push("puzzle-bridge");
      g.toast(localize("s_c94cdcc713"));
    } else g.toast(localize("s_2824fb12fe"));
    a.persist();
  }
  map() {
    const a = this.a;
    a.panel(
      localize(
        "s_4a926996e7",
        zoneNames
          .map(
            (n, i) =>
              `<button class="card-button" data-story-zone="${i}" ${this.unlocked(i) ? "" : "disabled"}>${["☾", "≈", "✿", "◆", "⌂"][i]} ${n}<small>${this.unlocked(i) ? (i === 4 ? localize("s_d7dc524578") : a.state.friends.includes(i) ? localize("s_bae569f450") : stories[i].title) : i === 1 ? localize("s_392bd821e8") : i === 4 ? localize("s_82d0ff7bc9") : localize("s_8c04562a53", names[i - 1])}</small></button>`,
          )
          .join(""),
      ),
    );
    document.querySelector<HTMLButtonElement>("#map-home")!.onclick = () => {
      this.village.returnHome(false);
      a.resume();
    };
    document.querySelectorAll<HTMLButtonElement>("[data-story-zone]").forEach(
      (b) =>
        (b.onclick = () => {
          this.village.leave(Number(b.dataset.storyZone));
          a.resume();
        }),
    );
  }
  helpers() {
    const a = this.a;
    const unlocked = [
      "dog",
      "cat",
      ...["fireflies", "beetle", "spider"].filter((_, i) =>
        a.state.friends.includes(i),
      ),
    ];
    a.panel(
      localize(
        "s_17e77bb846",
        unlocked
          .map(
            (id) =>
              `<button data-helper="${id}">${a.state.helpers.includes(id) ? "✓ " : ""}${helperNames[id]}</button>`,
          )
          .join(""),
        a.state.helpers.includes("dog") ? localize("s_d91643f786") : "",
        a.state.helpers.includes("cat") ? localize("s_eb52c27b8f") : "",
        a.state.helpers
          .filter((x) => !["dog", "cat"].includes(x))
          .map((id) => localize("s_daac4e97b3", id, helperNames[id]))
          .join(""),
      ),
    );
    document.querySelectorAll<HTMLButtonElement>("[data-helper]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.helper!;
          if (a.state.helpers.includes(id))
            a.state.helpers = a.state.helpers.filter((x) => x !== id);
          else if (a.state.helpers.length < 3) a.state.helpers.push(id);
          else {
            document.querySelector("#helper-hint")!.textContent =
              localize("s_dd8eaeb143");
            return;
          }
          a.persist();
          this.helpers();
        }),
    );
    document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach(
      (b) =>
        (b.onclick = () => {
          a.command(b.dataset.command!);
          a.resume();
        }),
    );
  }
  book() {
    const a = this.a,
      s = a.state;
    a.panel(
      localize(
        "s_ca8c1906aa",
        s.friends.length,
        s.collection.length,
        Object.entries(natureEntries)
          .filter(([id]) => s.collection.includes(id))
          .map(
            ([id, [icon, name, desc]]) =>
              `<article><b>${icon}</b><h3>${name}${s.friends.includes(["bubul", "glazastik", "sonka", "nyuhach"].indexOf(id)) ? " ♡" : ""}</h3><p>${desc}</p></article>`,
          )
          .join(""),
      ),
    );
    document.querySelector<HTMLButtonElement>("#wardrobe")!.onclick = () =>
      this.wardrobe();
    document.querySelector<HTMLButtonElement>("#grow-home")!.onclick = () =>
      this.growHome();
  }
  wardrobe() {
    const a = this.a;
    a.panel(localize("s_6e7fcb9247"));
    const name = document.querySelector<HTMLInputElement>("#character-name")!;
    name.value = a.state.name;
    name.oninput = () => {
      a.state.name = name.value.slice(0, 20);
      a.persist();
    };
    for (const key of ["outfit", "hat", "bag"] as const) {
      const field = document.querySelector<HTMLSelectElement>(`#${key}`)!;
      field.value = String(a.state[key]);
      field.onchange = () => {
        a.state[key] = Number(field.value);
        this.applyOutfit();
        a.persist();
      };
    }
  }
  applyOutfit() {
    const g = this.a.game,
      s = this.a.state;
    g.hero.coat.material = material(
      ["#eeb55e", "#8bc4a6", "#c48db2", "#8eb6d4"][s.outfit],
    );
    g.hero.arms.forEach((m) => (m.material = g.hero.coat.material));
    g.hero.hat.visible = s.hat !== 2;
    g.hero.hat.material = material(s.hat === 1 ? "#b5a0d1" : "#afc99f");
    g.hero.bag.material = material(["#7daba1", "#e4aa91", "#dbc67e"][s.bag]);
  }
  growHome() {
    const a = this.a,
      s = a.state,
      levels = [
        localize("s_535971f572"),
        localize("s_c10b4be092"),
        localize("s_6c50317db8"),
        localize("s_4e047bc078"),
        localize("s_09d36bf717"),
      ];
    a.panel(
      localize(
        "s_4b2f5b077b",
        s.inventory.wood,
        s.inventory.stone,
        s.homeLevel >= 5 ? "disabled" : "",
        levels[s.homeLevel] || localize("s_b2c440ea71"),
        s.friends
          .map((id) =>
            localize(
              "s_dbb0d5dc1f",
              id,
              s.buildings.includes(`friendhouse-${id}`) ? "disabled" : "",
              names[id],
              s.buildings.includes(`friendhouse-${id}`)
                ? localize("s_afb1328262")
                : localize("s_7f947b216a"),
            ),
          )
          .join(""),
      ),
    );
    const pay = () => {
      if (s.inventory.wood < 1 || s.inventory.stone < 1) {
        document.querySelector("#home-note")!.textContent =
          localize("s_527acc471b");
        return false;
      }
      s.inventory.wood--;
      s.inventory.stone--;
      return true;
    };
    document.querySelector<HTMLButtonElement>("#home-upgrade")!.onclick =
      () => {
        if (s.homeLevel >= 5 || !pay()) return;
        s.homeLevel++;
        this.refreshVillage();
        a.persist();
        this.growHome();
      };
    document.querySelectorAll<HTMLButtonElement>("[data-friendhouse]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!pay()) return;
          s.buildings.push(`friendhouse-${b.dataset.friendhouse}`);
          this.refreshVillage();
          a.persist();
          this.growHome();
        }),
    );
  }
  update(dt: number) {
    const a = this.a,
      g = a.game,
      z = a.state.zone;
    this.decor.visible = !g.day;
    this.villageDecor.visible = g.day;
    g.friendlyBubul = a.state.friends.includes(0);
    a.companions.forEach(
      (p, i) =>
        (p.visible =
          g.day || a.state.helpers.includes(i === 0 ? "dog" : "cat")),
    );
    this.special.g.visible = !g.day && (z === 2 || z === 3);
    this.sparkles.visible = !g.day && a.state.helpers.includes("fireflies");
    const target = this.goal.clone().sub(g.position);
    this.sparkles.children.forEach((p, i) => {
      const f = (i + 1) / 16;
      p.position.copy(g.position).addScaledVector(target, f);
      p.position.y = 0.35 + Math.sin(g.time * 2 + i) * 0.12;
    });
    this.insects.children.forEach((body, i) => {
      body.visible = a.state.helpers.includes(i === 0 ? "beetle" : "spider");
      body.position.set(g.position.x + 1.2 + i * 0.4, 0.2, g.position.z + 1.6);
      body.rotation.y = g.time;
    });
    if (g.day) {
      this.lastPosition.copy(g.position);
      return;
    }
    this.splashCooldown = Math.max(0, this.splashCooldown - dt);
    if (
      z === 1 &&
      Math.abs(g.position.z + 6) < 1.9 &&
      Math.abs(g.position.x) > 1.5 &&
      g.position.y < 0.15
    ) {
      g.position.z = this.lastPosition.z > -6 ? -3.9 : -8.1;
      g.noise(g.position, 4);
      if (this.splashCooldown === 0) {
        g.toast(localize("s_06fa7ef8ef"));
        this.splashCooldown = 3;
      }
    }
    this.lastPosition.copy(g.position);
    if (z === 4) {
      g.bubul.g.visible = false;
      a.enemy.g.visible = false;
      if (Math.abs(g.position.x) < 2.4 && g.position.z < -17.5)
        g.position.z = -17.5;
      if (this.rock?.visible && g.position.z < -2.4) {
        g.position.z = -2.4;
        g.toast(localize("s_db9cd844c8"));
      }
      if (!this.bridge.visible && g.position.z < -8.5) {
        g.position.z = -8.5;
        g.toast(localize("s_b21d46fbc9"));
      }
      return;
    }
    if (a.state.found.includes(`gift-${z}`) && !a.state.friends.includes(z)) {
      // A carried gift is a peace offering: approaching for the conversation is safe.
      if (g.position.distanceTo(this.targetMonster().position) < 5) {
        if (z === 0) g.friendlyBubul = true;
        a.enemyTimer = 0;
      }
    }
    if (
      z === 1 &&
      (a.state.friends.includes(1) || a.state.found.includes("gift-1"))
    )
      a.enemy.g.visible = true;
    if (z < 2) return;
    g.bubul.g.visible = false;
    a.enemy.g.visible = false;
    if (a.state.friends.includes(z) || a.state.found.includes(`gift-${z}`))
      return;
    const pet = this.special.g,
      p = pet.position,
      delta = g.position.clone().sub(p),
      moving = g.input.move().moving;
    if (z === 2) {
      this.awake = Math.sin(g.time * 0.8) > 0.15;
      pet.scale.y = this.awake ? 1 : 0.8;
      if (this.awake && moving && !g.hidden && delta.length() < 12) {
        p.addScaledVector(delta.normalize(), dt * 4.8);
        pet.rotation.y = Math.atan2(delta.x, delta.z);
      }
    } else {
      this.smellTime += dt;
      this.smellSafe = Math.max(0, this.smellSafe - dt);
      if (
        g.hidden ||
        Math.hypot(g.position.x + 3, g.position.z + 5) < 2.2 ||
        Math.hypot(g.position.x - 4, g.position.z + 9) < 2
      ) {
        this.smell = [];
        this.smellSafe = 4;
      }
      if (this.smellTime > 0.45) {
        this.smellTime = 0;
        if (moving && this.smellSafe === 0) this.smell.push(g.position.clone());
        if (this.smell.length > 16) this.smell.shift();
      }
      const next = this.smell[0];
      if (next) {
        const direction = next.clone().sub(p);
        direction.y = 0;
        if (direction.length() < 0.6) this.smell.shift();
        else {
          p.addScaledVector(direction.normalize(), dt * 3.7);
          pet.rotation.y = Math.atan2(direction.x, direction.z);
        }
      }
      this.trail.forEach((dot, i) => {
        dot.visible = !!this.smell[i];
        if (this.smell[i]) {
          dot.position.copy(this.smell[i]);
          dot.position.y = 0.08;
        }
      });
    }
    g.world.resolve(p);
    pet.rotation.z = Math.sin(g.time * 6) * 0.04;
    if (!g.hidden && g.catchTime === 0 && p.distanceTo(g.position) < 1.15) {
      g.position.copy(g.checkpoint);
      g.catchTime = 2;
      g.toast(localize("s_39cb418d64", names[z]));
      this.smell = [];
      a.persist();
    }
  }
  hud() {
    const a = this.a,
      g = a.game,
      z = a.state.zone;
    document.querySelector("#friend-count")!.textContent =
      `${a.state.friends.length} / 4`;
    const label = document.querySelector<HTMLElement>("#story-marker")!,
      marker = document.querySelector<HTMLElement>("#special-marker")!;
    label.hidden = marker.hidden = true;
    if (g.day) return;
    if (z < 4) {
      const friend = a.state.friends.includes(z),
        carried = a.state.found.includes(`gift-${z}`);
      this.goal.copy(
        friend
          ? new T.Vector3(0, 0, 10)
          : carried
            ? this.targetMonster().position
            : this.gift.position,
      );
      if (!g.carrying && g.delivered > 0) {
        document.querySelector("#chapter")!.textContent = localize(
          "s_32525704f6",
          z + 1,
          names[z],
        );
        document.querySelector("#objective")!.textContent = friend
          ? localize("s_a771329dec")
          : carried
            ? localize("s_fb6edf9a7b", stories[z].gift)
            : stories[z].title;
        document.querySelector("#objective-hint")!.textContent = friend
          ? localize("s_8371039d09")
          : carried
            ? localize("s_818bffcffb")
            : stories[z].hint;
      } else if (g.carrying) {
        this.goal.set(0, 0, 10);
        document.querySelector("#chapter")!.textContent =
          localize("s_73c15bcd7e");
      } else this.goal.copy(g.world.flowers.find((f) => f.visible)!.position);
      const point = this.goal
        .clone()
        .add(new T.Vector3(0, 1.7, 0))
        .project(g.camera);
      label.hidden =
        point.z > 1 || Math.abs(point.x) > 0.85 || Math.abs(point.y) > 0.85;
      label.style.left = `${(point.x * 0.5 + 0.5) * innerWidth}px`;
      label.style.top = `${(-point.y * 0.5 + 0.5) * innerHeight}px`;
      label.textContent = g.carrying
        ? localize("s_244bb09ba3")
        : g.delivered === 0
          ? localize("s_b04740d5aa")
          : friend
            ? localize("s_244bb09ba3")
            : carried
              ? localize("s_14d984a32e")
              : localize("s_fb611c135c");
      if (z >= 2) {
        const p = this.special.g.position
          .clone()
          .add(new T.Vector3(0, 2.8, 0))
          .project(g.camera);
        marker.hidden = p.z > 1 || Math.abs(p.x) > 1;
        marker.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
        marker.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
        marker.textContent = friend
          ? "♡"
          : z === 2
            ? this.awake
              ? localize("s_8c52a6b285")
              : localize("s_d00c38696c")
            : this.smellSafe > 0
              ? localize("s_8859b6ea0e")
              : localize("s_02ec10b774");
        document.querySelector<HTMLElement>("#monster-marker")!.hidden = true;
      }
      if (z === 0 && a.state.friends.includes(0))
        document.querySelector("#monster-marker")!.textContent = "♡";
    } else {
      const done = a.state.buildings.includes("treehouse");
      this.goal.set(
        0,
        0,
        this.rock?.visible ? -4 : !this.bridge.visible ? -9 : -19,
      );
      document.querySelector("#chapter")!.textContent =
        localize("s_1dabc83e7f");
      document.querySelector("#objective")!.textContent = done
        ? localize("s_4871c91a75")
        : this.rock?.visible
          ? localize("s_17f178670e")
          : !this.bridge.visible
            ? localize("s_8db14a849c")
            : localize("s_e78c58a3e8");
      document.querySelector("#objective-hint")!.textContent = done
        ? localize("s_ed8d61e3bf")
        : localize("s_3f3d9d6b7e");
      document.querySelector<HTMLElement>("#monster-marker")!.hidden = true;
    }
    const delta = this.goal.clone().sub(g.position);
    document.querySelector<HTMLElement>("#compass-arrow")!.style.transform =
      `rotate(${Math.atan2(delta.x, -delta.z) + g.yaw}rad)`;
    document.querySelector("#distance")!.textContent = localize(
      "s_3c3d75e788",
      Math.round(delta.length()),
    );
  }
}
