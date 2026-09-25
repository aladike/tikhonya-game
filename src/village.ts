import { localize } from "./localize";
import * as T from "three";
import { clearGenerated, batchStatic } from "./optimize";
import type { Adventure } from "./adventure";
import { box, orb, home, flower, material } from "./models";
export const recipes = [
  {
    id: "doghouse",
    name: localize("s_53c1296f97"),
    icon: "⌂",
    cost: { wood: 3, stone: 2, flower: 1 },
    x: -5,
    z: 10,
    description: localize("s_6eabc17ef1"),
  },
  {
    id: "catbed",
    name: localize("s_1063732cb0"),
    icon: "☁",
    cost: { wood: 1, stone: 0, flower: 0 },
    x: 5,
    z: 10,
    description: localize("s_ce134ab56a"),
  },
  {
    id: "bowl",
    name: localize("s_7476538a35"),
    icon: "◡",
    cost: { wood: 0, stone: 2, flower: 0 },
    x: -8,
    z: 6,
    description: localize("s_cf610c3d5a"),
  },
  {
    id: "ball",
    name: localize("s_3dddbdae53"),
    icon: "●",
    cost: { wood: 1, stone: 0, flower: 0 },
    x: 8,
    z: 6,
    description: localize("s_0e82c832cb"),
  },
  {
    id: "garden",
    name: localize("s_df918df57d"),
    icon: "✿",
    cost: { wood: 0, stone: 1, flower: 1 },
    x: -10,
    z: 12,
    description: localize("s_58fbae14cc"),
  },
];
export class Village {
  group = new T.Group();
  buildingGroup = new T.Group();
  selected = -1;
  slots: T.Mesh[] = [];
  ball?: T.Mesh;
  activity = 0;
  constructor(public adventure: Adventure) {
    const a = adventure,
      g = a.game;
    g.scene.add(this.group);
    this.group.add(this.buildingGroup);
    recipes.forEach((r) => {
      const ring = new T.Mesh(
        new T.RingGeometry(1.25, 1.36, 32),
        new T.MeshBasicMaterial({
          color: "#f7dc97",
          transparent: true,
          opacity: 0.5,
          side: T.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(r.x, 0.06, r.z);
      this.group.add(ring);
      this.slots.push(ring);
    });
    const update = g.onUpdate,
      event = g.onEvent,
      hud = g.onHud,
      interact = g.onInteract,
      context = g.extraContext;
    g.onUpdate = (dt) => {
      update(dt);
      this.update(dt);
    };
    g.onEvent = (e) => {
      event(e);
      if (e === "delivery") this.returnHome();
    };
    g.onHud = () => {
      hud();
      this.hud();
    };
    g.onInteract = () => this.interact() || interact();
    g.extraContext = () => this.context() || context();
    document
      .querySelector(".top-actions")!
      .insertAdjacentHTML("afterbegin", localize("s_f6fbc75569"));
    document
      .querySelector("#village")!
      .addEventListener("click", () => this.menu());
    this.rebuild();
    if (a.state.day) this.returnHome(false);
    else this.group.visible = false;
  }
  returnHome(notify = true) {
    const a = this.adventure,
      g = a.game;
    g.setDay(true);
    a.changeZone(0, false);
    g.setDay(true);
    g.position.set(0, 0, 8);
    this.group.visible = true;
    this.rebuild();
    a.persist();
    if (notify) g.toast(localize("s_e37f8f685e"));
  }
  leave(zone = 0) {
    const a = this.adventure;
    this.selected = -1;
    a.game.setDay(false);
    a.changeZone(zone);
    this.group.visible = false;
    a.game.toast(localize("s_dfe42ab26e"));
    a.persist();
  }
  menu() {
    const a = this.adventure,
      g = a.game,
      s = a.state;
    if (!g.day) {
      a.panel(localize("s_58fea86300"));
      document.querySelector<HTMLButtonElement>("#return-home")!.onclick =
        () => {
          this.returnHome(false);
          a.resume();
        };
      return;
    }
    a.panel(
      localize(
        "s_a884f8ec70",
        s.inventory.wood,
        s.inventory.stone,
        s.inventory.flower,
        recipes
          .map(
            (r, i) =>
              `<button class="card-button" data-recipe="${i}">${r.icon} ${r.name}${s.buildings.includes(r.id) ? " ✓" : ""}<small>${s.buildings.includes(r.id) ? localize("s_d8f25cd65e") : `${r.cost.wood} ⌁ · ${r.cost.stone} ◆ · ${r.cost.flower} ✿ — ${r.description}`}</small></button>`,
          )
          .join(""),
      ),
    );
    document.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.recipe),
            r = recipes[i];
          if (s.buildings.includes(r.id)) {
            this.decorate(r.id);
            return;
          }
          if (!this.canBuild(i)) {
            document.querySelector(".badge")!.textContent =
              localize("s_297430b103");
            return;
          }
          this.selected = i;
          g.toast(localize("s_7298f7d83e"));
          a.resume();
        }),
    );
    document.querySelector<HTMLButtonElement>("#night-request")!.onclick = () =>
      this.request();
  }
  canBuild(i: number) {
    const cost = recipes[i].cost,
      s = this.adventure.state.inventory;
    return (
      s.wood >= cost.wood && s.stone >= cost.stone && s.flower >= cost.flower
    );
  }
  build(i: number) {
    const a = this.adventure,
      r = recipes[i];
    if (a.state.buildings.includes(r.id) || !this.canBuild(i)) return false;
    for (const key of ["wood", "stone", "flower"] as const)
      a.state.inventory[key] -= r.cost[key];
    a.state.buildings.push(r.id);
    this.selected = -1;
    this.rebuild();
    a.persist();
    a.game.sound.chime();
    a.game.toast(localize("s_d32551703e", r.name));
    return true;
  }
  decorate(id: string) {
    const a = this.adventure;
    a.panel(localize("s_0ce1b3f4f1"));
    document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          a.state.found = a.state.found.filter(
            (x) => !x.startsWith(`color-${id}-`),
          );
          a.state.found.push(`color-${id}-${b.dataset.color}`);
          this.rebuild();
          a.persist();
          a.resume();
        }),
    );
  }
  request() {
    const a = this.adventure;
    const built = a.state.buildings.includes("doghouse");
    a.panel(
      localize(
        "s_49425ff098",
        built ? localize("s_4b86502c14") : localize("s_2d386cc7b4"),
        built ? localize("s_c5d4233af4") : localize("s_2ca2d75e6e"),
      ),
    );
    document.querySelector<HTMLButtonElement>("#accept-request")!.onclick =
      () => {
        this.leave(built ? 1 : 0);
        a.resume();
      };
  }
  context() {
    const g = this.adventure.game;
    if (!g.day || g.hidden) return null;
    if (this.selected >= 0) {
      const r = recipes[this.selected];
      if (Math.hypot(g.position.x - r.x, g.position.z - r.z) < 2.3)
        return localize("s_2eaffea793");
    }
    if (Math.hypot(g.position.x, g.position.z - 10) < 2.7)
      return localize("s_59265d0f7d");
    if (
      this.adventure.companions.some(
        (p) => p.position.distanceTo(g.position) < 1.7,
      )
    )
      return localize("s_f129ca5d4d");
    return null;
  }
  interact() {
    const g = this.adventure.game;
    if (!g.day || g.hidden) return false;
    const context = this.context();
    if (context === localize("s_2eaffea793")) {
      this.build(this.selected);
      return true;
    }
    if (context === localize("s_59265d0f7d")) {
      this.menu();
      return true;
    }
    if (context === localize("s_f129ca5d4d")) {
      g.sound.chime();
      g.toast(localize("s_5517372551"));
      return true;
    }
    return false;
  }
  rebuild() {
    clearGenerated(this.buildingGroup);
    this.ball = undefined;
    const s = this.adventure.state;
    recipes.forEach((r, i) => {
      const built = s.buildings.includes(r.id);
      this.slots[i].visible = !built;
      if (!built) return;
      const group = new T.Group();
      group.position.set(r.x, 0, r.z);
      this.buildingGroup.add(group);
      const saved = s.found.find((x) => x.startsWith(`color-${r.id}-`));
      const color = ["#85b6a0", "#edb19a", "#b7a6d7"][
        Number(saved?.slice(-1) || 0)
      ];
      if (i === 0) {
        const h = home(group, 0, 0, color);
        h.scale.setScalar(0.44);
        orb(group, "#f9d99a", 0.5, 1.1, -0.9, 0.13, 0.15, 0.13, 1);
        orb(group, color, 0, 0.15, -0.5, 0.65, 0.12, 0.55);
      }
      if (i === 1) {
        box(group, "#9b7c62", 0, 0.2, 0, 1.8, 0.3, 1.5);
        orb(group, color, 0, 0.45, 0, 0.8, 0.22, 0.65);
      }
      if (i === 2) {
        const bowl = new T.Mesh(
          new T.TorusGeometry(0.5, 0.13, 6, 16),
          material(color),
        );
        bowl.rotation.x = Math.PI / 2;
        bowl.position.y = 0.2;
        group.add(bowl);
        orb(group, "#89c5d2", 0, 0.16, 0, 0.45, 0.04, 0.45);
      }
      if (i === 3) {
        this.ball = orb(group, color, 0, 0.35, 0, 0.36);
        for (const x of [-1, 1]) box(group, "#bca27b", x, 0.2, 0, 0.1, 0.4, 2);
      }
      if (i === 4)
        for (let j = 0; j < 5; j++)
          flower(group, Math.sin(j * 1.26), Math.cos(j * 1.26));
    });
    this.optimize();
  }
  optimize() {
    batchStatic(this.buildingGroup, this.ball ? [this.ball] : []);
  }
  update(dt: number) {
    const g = this.adventure.game;
    this.group.visible = g.day;
    if (!g.day) return;
    this.activity += dt;
    this.slots.forEach((slot, i) => {
      (slot.material as T.MeshBasicMaterial).opacity =
        this.selected === i ? 0.65 + Math.sin(g.time * 4) * 0.3 : 0.18;
      slot.scale.setScalar(this.selected === i ? 1.15 : 1);
    });
    this.adventure.companions.forEach((pet, i) => {
      const s = this.adventure.state,
        phase = Math.floor(this.activity / 7) % 3;
      let target: T.Vector3 | undefined;
      if (phase === 1 && s.buildings.includes("bowl"))
        target = new T.Vector3(-8, 0, 6);
      else if (i === 0 && phase === 2 && s.buildings.includes("ball"))
        target = new T.Vector3(
          8 + Math.sin(g.time * 1.6),
          0,
          6 + Math.cos(g.time * 1.6),
        );
      else if (s.buildings.includes(i === 0 ? "doghouse" : "catbed"))
        target = new T.Vector3(i === 0 ? -5 : 5, 0.25, 10);
      if (target) {
        pet.position.lerp(target, Math.min(1, dt * 4));
        pet.rotation.y = Math.atan2(
          target.x - pet.position.x,
          target.z - pet.position.z,
        );
        pet.rotation.z = phase === 0 ? 0.3 : 0;
        pet.scale.y = phase === 0 ? 0.72 : 1;
      }
    });
    if (this.ball) {
      this.ball.position.x = Math.sin(g.time * 1.6);
      this.ball.position.z = Math.cos(g.time * 1.6);
      this.ball.position.y = 0.35 + Math.abs(Math.sin(g.time * 3)) * 0.15;
    }
  }
  hud() {
    const g = this.adventure.game;
    if (!g.day) return;
    document.querySelector("#zone-name")!.textContent =
      localize("s_1ca4079222");
    document.querySelector("#chapter")!.textContent = localize("s_669d5ac5c7");
    document.querySelector("#objective")!.textContent =
      this.selected >= 0
        ? localize("s_275c61ec31")
        : this.adventure.state.buildings.length
          ? localize("s_dfb9eec60d")
          : localize("s_6770ab708b");
    document.querySelector("#objective-hint")!.textContent =
      this.selected >= 0
        ? localize("s_901fb24334")
        : this.adventure.state.buildings.length
          ? localize("s_4ad538ae6a")
          : localize("s_a25de0f8b1");
    document.querySelector<HTMLElement>("#monster-marker")!.hidden = true;
    document.querySelector<HTMLElement>("#enemy-marker")!.hidden = true;
    if (this.selected >= 0) {
      const r = recipes[this.selected],
        delta = new T.Vector3(r.x, 0, r.z).sub(g.position);
      document.querySelector<HTMLElement>("#compass-arrow")!.style.transform =
        `rotate(${Math.atan2(delta.x, -delta.z) + g.yaw}rad)`;
      document.querySelector("#distance")!.textContent = localize(
        "s_3c3d75e788",
        Math.round(delta.length()),
      );
    }
  }
}
