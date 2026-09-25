import { batchColored } from "../optimize";
import * as T from "three";
import type { IslandGame } from "./game";
import { Inventory, emptySlots } from "../items/inventory";
import { canCraft, craft } from "../items/crafting";
import { recipes, type Recipe } from "../data/recipes";
import { item } from "../data/items";
import { block } from "../data/blocks";
import { cycleAt, cycleLength } from "../data/cycle";
import {
  initialSurvival,
  type SurvivalSave,
  type Mode,
} from "../save/survival";
import type { IslandSave } from "../save/format";
import { Monsters } from "../entities/monsters";
import { lightAt } from "../world/light";
import { raycast, type Hit } from "../world/raycast";
export class Survival {
  mode: Mode;
  state: SurvivalSave;
  inventory: Inventory;
  monsters: Monsters;
  cooldown = 0;
  safeTime = 0;
  cooldownShot = 0;
  periodicSave = 15;
  barkTime = 0;
  magicTime = 0;
  cycle = cycleAt(0);
  puppy = new T.Group();
  puppyTail = new T.Group();
  recoveryMeshes: T.Mesh[] = [];
  lightCache = new Map<string, number>();
  lightTimer = 0;
  opened = "";
  chestLid: T.Mesh | null = null;
  lidAngle = 0;
  onOpen = (_kind: string, _key: string) => {};
  constructor(
    public game: IslandGame,
    saved: IslandSave | null,
  ) {
    this.mode = saved?.mode ?? "creative";
    this.state = saved?.survival ?? initialSurvival();
    this.inventory = new Inventory(this.state.slots, this.state.discovered);
    this.monsters = new Monsters(game);
    this.cycle = cycleAt(this.state.clock);
    if (this.mode !== "creative") {
      this.monsters.cube(this.puppy, "#E0A96D", 0, 0.4, 0, 0.65, 0.48, 0.9);
      this.monsters.cube(this.puppy, "#FFF7E8", 0, 0.75, 0.37, 0.52, 0.48, 0.5);
      for (const x of [-0.27, 0.27])
        this.monsters.cube(
          this.puppy,
          "#9C6B3F",
          x,
          0.72,
          0.3,
          0.15,
          0.44,
          0.3,
        );
      for (const x of [-0.15, 0.15])
        this.monsters.cube(
          this.puppy,
          "#3B2A4A",
          x,
          0.8,
          0.63,
          0.07,
          0.08,
          0.04,
        );
      this.monsters.cube(this.puppy, "#704445", 0, 0.61, 0.66, 0.13, 0.1, 0.06);
      this.monsters.cube(
        this.puppyTail,
        "#FFF7E8",
        0,
        0.2,
        0,
        0.15,
        0.45,
        0.15,
      );
      this.puppyTail.position.set(0, 0.6, -0.5);
      this.puppy.add(this.puppyTail);
      batchColored(this.puppy, [this.puppyTail]);
      this.puppy.position.set(135, 11, 205);
      this.puppy.visible = this.state.clock >= 20;
      game.scene.add(this.puppy);
      if (!Object.keys(saved?.chunks || {}).length && this.state.clock === 0) {
        game.world.set(137, 11, 205, 31);
        for (let x = 138; x <= 141; x++)
          for (let z = 203; z <= 205; z++) game.world.set(x, 10, z, 7);
      }
    }
    for (const d of this.state.drops || [])
      game.dropItem(d.id, new T.Vector3(...d.position));
    this.refreshRecovery();
    this.syncBar();
  }
  get creative() {
    return this.mode === "creative";
  }
  syncBar() {
    if (!this.creative)
      this.game.bar = this.inventory.slots.slice(0, 9).map((s) => s?.id ?? 0);
  }
  snapshot(): SurvivalSave {
    return {
      ...this.state,
      drops: this.creative
        ? []
        : this.game.drops.map((d) => ({
            id: d.id,
            position: d.mesh.position.toArray() as [number, number, number],
          })),
      slots: this.inventory.slots.map((s) => (s ? { ...s } : null)),
      discovered: [...this.inventory.discovered],
      chests: structuredClone(this.state.chests),
      furnaces: structuredClone(this.state.furnaces),
      recovery: structuredClone(this.state.recovery),
    };
  }
  grant(id: number, count = 1) {
    const before = this.inventory.discovered.has(id),
      left = this.inventory.add(id, count);
    this.syncBar();
    if (!before && left < count) {
      this.game.audio.chime(76);
      this.game.onToast(`Найдено: ${item(id).name}. Загляни в книгу рецептов!`);
    }
    this.game.saveSoon();
    return left;
  }
  miningTime(id: number) {
    if (this.creative) return 0.2;
    const tool = item(this.game.bar[this.game.selected]),
      b = block(id);
    if (b.material === "stone" && tool.tool !== "pick") return Infinity;
    const match =
      (b.material === "stone" && tool.tool === "pick") ||
      (b.material === "wood" && tool.tool === "axe") ||
      (["sand", "snow", "grass"].includes(b.material) &&
        tool.tool === "shovel");
    return match
      ? Math.max(0.15, 0.65 - (tool.tier || 1) * 0.12)
      : b.material === "wood"
        ? 0.6
        : 0.3;
  }
  consumeBlock(id: number) {
    if (this.creative) return true;
    const ok = this.inventory.remove(id, 1);
    this.syncBar();
    return ok;
  }
  light(x: number, y: number, z: number) {
    const k = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    let v = this.lightCache.get(k);
    if (v !== undefined) return v;
    v = lightAt(
      x,
      y,
      z,
      this.game.world.get.bind(this.game.world),
      this.game.world.lightSources.values(),
    );
    this.lightCache.set(k, v);
    return v;
  }
  visible(a: T.Vector3, b: T.Vector3) {
    const delta = b.clone().sub(a),
      distance = delta.length();
    return !raycast(
      a,
      delta.normalize(),
      (x, y, z) => (this.game.world.getSolid(x, y, z) ? 1 : 0),
      distance - 0.3,
    );
  }
  puppyNear(p: T.Vector3) {
    return this.state.puppy && p.distanceTo(this.puppy.position) < 8;
  }
  shot() {
    const held = item(this.game.bar[this.game.selected]);
    const wand =
      held.tool === "wand"
        ? held
        : this.inventory.slots
            .map((s) => item(s?.id ?? 0))
            .find((i) => i.tool === "wand");
    if (!wand && !this.creative) {
      this.game.onToast("Сделай пузырь-палочку в книге рецептов");
      return;
    }
    if (this.cooldownShot > 0) return;
    this.cooldownShot = wand?.tier === 2 ? 0.2 : 0.48;
    this.monsters.shoot(wand?.tier || 1);
  }
  use() {
    const g = this.game,
      held = item(g.bar[g.selected]);
    if (held.food) {
      if (this.creative || this.inventory.remove(held.id)) {
        this.state.stars = Math.min(5, this.state.stars + held.food);
        this.syncBar();
        g.audio.chime(72);
        g.particles.burst(
          g.position.clone().add(new T.Vector3(0, 1, 0)),
          "#FFD23F",
          16,
          true,
        );
        g.onToast(
          held.id === 121
            ? "Печенье-хохотушка: хи-хи! +2 звезды"
            : "Вкусно! Звёздочки вернулись.",
        );
      }
      return true;
    }
    if (held.tool === "wand") {
      this.shot();
      return true;
    }
    if (held.tool === "flash") {
      for (const m of this.monsters.mobs)
        if (
          m.kind === "shadow" &&
          m.position.distanceTo(g.position) < 10 &&
          this.visible(
            g.position.clone().add(new T.Vector3(0, 1, 0)),
            m.position.clone().add(new T.Vector3(0, 1, 0)),
          )
        )
          this.monsters.capture(m);
      g.audio.chime(80);
      g.particles.burst(
        g.position.clone().add(new T.Vector3(0, 1.5, 0)),
        "#FFF7E8",
        8,
      );
      return true;
    }
    if (held.id === 107) {
      if (this.inventory.remove(107)) this.monsters.distract();
      this.syncBar();
      return true;
    }
    return false;
  }
  interactBuildTarget(hit: Hit) {
    if ([31, 32, 33, 34].includes(hit.id)) return this.interact(hit);
    return false;
  }
  interact(hit: Hit | null) {
    const g = this.game;
    const near = this.state.recovery.findIndex(
      (b) => new T.Vector3(...b.position).distanceTo(g.position) < 3,
    );
    if (near >= 0) {
      const b = this.state.recovery[near];
      b.slots = b.slots.map((stack) => {
        if (!stack) return null;
        const left = this.inventory.add(stack.id, stack.count);
        return left ? { ...stack, count: left } : null;
      });
      if (!b.slots.some(Boolean)) this.state.recovery.splice(near, 1);
      this.refreshRecovery();
      this.syncBar();
      g.audio.chime(78);
      g.onToast("Вещи из пузыря вернулись!");
      g.saveSoon();
      return true;
    }
    if (hit) {
      const kind = block(hit.id).special,
        key = `${hit.x},${hit.y},${hit.z}`;
      if (["bench", "furnace", "chest"].includes(kind || "")) {
        this.opened = key;
        if (kind === "chest") this.state.chests[key] ??= emptySlots(27);
        if (kind === "furnace") this.state.furnaces[key] ??= [];
        if (kind === "chest") {
          if (this.chestLid) {
            this.chestLid.removeFromParent();
            this.chestLid.geometry.dispose();
            (this.chestLid.material as T.Material).dispose();
          }
          this.chestLid = new T.Mesh(
            new T.BoxGeometry(1, 0.12, 1).translate(0, 0, 0.5),
            new T.MeshStandardMaterial({ color: "#E0A96D" }),
          );
          this.chestLid.position.set(hit.x + 0.5, hit.y + 1, hit.z);
          g.scene.add(this.chestLid);
          this.lidAngle = 0;
        }
        this.onOpen(kind!, key);
        g.audio.material("wood", "place");
        g.particles.burst(
          new T.Vector3(hit.x + 0.5, hit.y + 1, hit.z + 0.5),
          "#FFD23F",
          6,
        );
        return true;
      }
      if (kind === "bed") {
        this.state.bed = [hit.x + 0.5, hit.y + 1, hit.z + 0.5];
        if (
          this.monsters.mobs.some(
            (m) => !m.float && m.position.distanceTo(g.position) < 12,
          )
        ) {
          g.onToast("Кто-то хихикает рядом — сначала отгони монстров");
          return true;
        }
        if (this.cycle.phase === "night" || this.cycle.phase === "sunset") {
          this.state.clock =
            (Math.floor(this.state.clock / cycleLength) + 1) * cycleLength;
          this.state.stars = 5;
          g.audio.chime(60);
          g.onToast("Доброе утро! Кровать запомнила дорогу домой.");
        } else g.onToast("Теперь это твоя кровать. Ночью можно поспать.");
        g.saveSoon();
        return true;
      }
    }
    if (
      !this.creative &&
      this.puppy.visible &&
      this.puppy.position.distanceTo(g.position) < 3
    ) {
      if (
        !this.state.puppy &&
        g.bar[g.selected] === 110 &&
        this.inventory.remove(110)
      ) {
        this.state.puppy = true;
        this.state.tutorial = 1;
        g.audio.chime(76);
        g.onToast("Щенок с тобой! Он ведёт к верстаку у лодки.");
        g.particles.burst(
          this.puppy.position.clone().add(new T.Vector3(0, 1, 0)),
          "#FF9CC7",
          20,
          true,
        );
        this.syncBar();
        g.saveSoon();
        return true;
      }
      if (this.state.puppy && !hit && g.bar[g.selected] === 0) {
        g.audio.chime(68);
        g.onToast("Гав! Щенок охраняет тебя.");
        return true;
      }
    }
    return this.use();
  }
  craft(recipe: Recipe, station?: string, key = "") {
    const inv = this.inventory;
    if (!canCraft(inv, recipe, station)) return false;
    if (recipe.station === "furnace") {
      const jobs = (this.state.furnaces[key] ??= []);
      if (jobs.length >= 8) return false;
      recipe.input.forEach(([id, n]) => inv.remove(id, n));
      jobs.push({ recipe: recipe.id, remaining: recipe.seconds || 6 });
    } else if (!craft(inv, recipe, station)) return false;
    this.syncBar();
    this.game.audio.chime(72);
    this.game.saveSoon();
    return true;
  }
  tickle(from: T.Vector3) {
    if (this.cooldown > 0 || this.creative) return;
    const g = this.game;
    this.cooldown = 2;
    this.safeTime = 0;
    this.state.stars = Math.max(0, this.state.stars - 1);
    const push = g.position.clone().sub(from);
    push.y = 0;
    push.normalize().multiplyScalar(0.65);
    const dest = g.position.clone().add(push);
    if (!g.world.getSolid(dest.x, dest.y, dest.z)) g.position.copy(dest);
    g.velocity.y = 3;
    g.audio.giggle();
    document
      .querySelector("#hud")
      ?.animate(
        [{ background: "#ff9cc744" }, { background: "transparent" }],
        450,
      );
    g.onToast("Хи-хи! Щекотно!");
    if (this.state.stars === 0) {
      const bag = this.inventory.slots
        .slice(9)
        .map((s) => (s && !item(s.id).tool ? { ...s } : null));
      if (bag.some(Boolean))
        this.state.recovery.push({
          position: g.position.toArray() as [number, number, number],
          slots: bag,
        });
      for (let i = 9; i < 36; i++)
        if (!item(this.inventory.slots[i]?.id ?? 0).tool)
          this.inventory.slots[i] = null;
      g.position.fromArray(this.state.bed);
      g.velocity.set(0, 0, 0);
      this.state.stars = 5;
      this.cooldown = 8;
      this.refreshRecovery();
      g.onToast("Защекотали! Ты дома. Вещи ждут в светящемся пузыре 🫧");
      g.particles.bubbleBurst(g.position.clone().add(new T.Vector3(0, 1, 0)));
    }
    g.saveSoon();
  }
  refreshRecovery() {
    for (const mesh of this.recoveryMeshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
    }
    this.recoveryMeshes = this.state.recovery.map((b) => {
      const mesh = new T.Mesh(
        new T.IcosahedronGeometry(0.65, 2),
        new T.MeshStandardMaterial({
          color: "#B0E7F6",
          emissive: "#47C7A5",
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.65,
        }),
      );
      mesh.position.fromArray(b.position).add(new T.Vector3(0, 1, 0));
      this.game.scene.add(mesh);
      return mesh;
    });
  }
  containerBroken(key: string) {
    const chest = this.state.chests[key];
    if (chest?.some(Boolean) || this.state.furnaces[key]?.length) {
      this.game.onToast("Сначала забери содержимое");
      return false;
    }
    delete this.state.chests[key];
    delete this.state.furnaces[key];
    return true;
  }
  update(dt: number) {
    const g = this.game;
    this.state.clock += dt;
    this.cycle = cycleAt(this.state.clock);
    this.cooldown -= dt;
    this.cooldownShot -= dt;
    this.magicTime -= dt;
    this.lightTimer -= dt;
    if (this.lightTimer <= 0) {
      this.lightCache.clear();
      this.lightTimer = 0.4;
    }
    if (!this.creative) {
      if (this.cycle.phase === "sunset" && !this.state.giftedLamp) {
        this.state.giftedLamp = true;
        this.grant(16, 2);
        g.audio.chime(65);
        g.onToast("Скоро ночь! Два фонаря в подарок — освети свой дом.");
      }
      const nights = Math.floor(this.state.clock / cycleLength);
      if (nights > this.state.nights) {
        this.state.nights = nights;
        this.grant(112, 1);
        g.audio.chime(76);
        g.onToast("Утренний подарок: искра за пережитую ночь!");
      }
      const pursued = this.monsters.mobs.some(
        (m) => m.noticed && !m.float && m.position.distanceTo(g.position) < 14,
      );
      this.safeTime = pursued ? 0 : this.safeTime + dt;
      if (this.safeTime > 15 && this.state.stars < 5) {
        this.state.stars = Math.min(5, this.state.stars + dt / 6);
      }
      this.puppy.visible = this.state.clock > 20;
      if (this.puppy.visible) {
        const target = !this.state.puppy
          ? g.position
          : this.state.tutorial < 2
            ? new T.Vector3(136, 11, 205)
            : g.position;
        const delta = target.clone().sub(this.puppy.position);
        delta.y = 0;
        if (delta.length() > 2) {
          const next = this.puppy.position
            .clone()
            .addScaledVector(delta.normalize(), dt * 3);
          let floor = Math.floor(this.puppy.position.y);
          while (floor > 0 && !g.world.getSolid(next.x, floor - 1, next.z))
            floor--;
          if (!g.world.getSolid(next.x, floor, next.z)) {
            next.y = floor;
            this.puppy.position.copy(next);
          }
        }
        this.puppy.rotation.y = Math.atan2(delta.x, delta.z);
        this.puppyTail.rotation.z = Math.sin(g.time * 10) * 0.6;
        this.barkTime -= dt;
        if (this.state.puppy && pursued && this.barkTime < 0) {
          this.barkTime = 6;
          g.audio.creature("puppy");
          g.onToast("Гав-гав! Щенок услышал хихиканье.");
        }
      }
      if (this.inventory.count(100) && this.state.puppy)
        this.state.tutorial = 2;
      const under = block(
        g.world.get(g.position.x, g.position.y - 0.1, g.position.z),
      );
      if (
        this.magicTime <= 0 &&
        (under.special === "drum" || under.special === "mirror")
      ) {
        this.magicTime = 5;
        for (const m of this.monsters.mobs)
          if (m.position.distanceTo(g.position) < 7) {
            m.stun = under.special === "drum" ? 3 : 2;
            m.mesh.rotation.y += Math.PI;
          }
        g.audio.chime(under.special === "drum" ? 48 : 84);
        g.onToast(
          under.special === "drum"
            ? "Сонный барабан: монстры слушают колыбельную"
            : "Зеркало смешинок: монстры строят рожицы!",
        );
      }
    }
    for (const [key, jobs] of Object.entries(this.state.furnaces)) {
      const job = jobs[0];
      if (!job) continue;
      job.remaining = Math.max(0, job.remaining - dt);
      if (job.remaining === 0) {
        const recipe = recipes.find((r) => r.id === job.recipe);
        if (!recipe) {
          jobs.shift();
          continue;
        }
        const p = key.split(",").map(Number);
        if (g.position.distanceTo(new T.Vector3(...p)) < 5) {
          const copy = new Inventory(this.inventory.slots, [
            ...this.inventory.discovered,
          ]);
          if (!copy.add(...recipe.output)) {
            this.inventory = copy;
            jobs.shift();
            this.syncBar();
            g.audio.chime(76);
            g.onToast(`Печка: ${recipe.name} готово!`);
            g.saveSoon();
          }
        }
      }
    }
    this.recoveryMeshes.forEach((m, i) => {
      m.position.y =
        this.state.recovery[i].position[1] +
        1 +
        Math.sin(g.time * 2 + i) * 0.15;
      m.rotation.y += dt;
      m.visible = m.position.distanceTo(g.position) < 50;
    });
    this.monsters.update(dt);
    g.audio.night = this.cycle.phase === "night";
    g.audio.chase = this.monsters.mobs.some(
      (m) => m.noticed && !m.float && m.position.distanceTo(g.position) < 12,
    );
    this.periodicSave -= dt;
    if (this.periodicSave <= 0) {
      this.periodicSave = 15;
      void g.save();
    }
  }
  visualUpdate(dt: number) {
    if (this.chestLid) {
      const open = !document.querySelector<HTMLElement>("#panel")!.hidden;
      this.lidAngle = T.MathUtils.lerp(
        this.lidAngle,
        open ? -1.15 : 0,
        1 - Math.exp(-dt * 9),
      );
      this.chestLid.rotation.x = this.lidAngle;
      if (!open && Math.abs(this.lidAngle) < 0.01) {
        this.chestLid.removeFromParent();
        this.chestLid.geometry.dispose();
        (this.chestLid.material as T.Material).dispose();
        this.chestLid = null;
      }
    }
  }
  hint() {
    if (this.creative) return "";
    if (this.state.tutorial < 1)
      return this.state.clock < 20
        ? "Ломай дерево удержанием. Скоро прибежит друг!"
        : "Щенок рядом! Выбери косточку и нажми «Действие».";
    if (this.state.tutorial < 2)
      return "Щенок ведёт к верстаку. Сделай доски и деревянную кирку в книге рецептов.";
    if (this.cycle.phase === "day")
      return "Построй дом до заката. Сделай пузырь-палочку и поставь фонари.";
    if (this.cycle.phase === "sunset")
      return "Зажги фонари! Стены и свет помогут пережить ночь.";
    return "Пузыри прогоняют монстров. Если тихо — можно поспать в кровати.";
  }
}
