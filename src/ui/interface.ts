import { item } from "../data/items";
import { recipes } from "../data/recipes";
import { canCraft } from "../items/crafting";
import { initialSurvival, type Mode } from "../save/survival";
import { IslandStore } from "../save/store";
import { block, blocks } from "../data/blocks";
import type { IslandGame } from "../engine/game";
import { decodeIsland } from "../save/format";
export const tile = (id: number) => {
  if (id >= 100)
    return `<span class="item-icon" aria-hidden="true">${item(id).icon || "✨"}</span>`;
  if (id === 0) return `<span class="empty-slot">·</span>`;
  const b = block(id),
    t = b.top ?? b.tile;
  return `<span class="tile" style="background-position:${-(t % 8) * 32}px ${-Math.floor(t / 8) * 32}px" aria-hidden="true"></span>`;
};
export class Interface {
  toastTimer = 0;
  instructions = 0;
  inventorySelection = -1;
  barSignature = "";
  constructor(public game: IslandGame) {
    game.onPickup = (id, point) => {
      const el = document.createElement("div");
      el.className = "pickup";
      el.innerHTML = tile(id);
      el.style.left = (point.x * 0.5 + 0.5) * innerWidth + "px";
      el.style.top = (-point.y * 0.5 + 0.5) * innerHeight + "px";
      document.body.append(el);
      const target = document
        .querySelector(`[data-slot="${game.selected}"]`)!
        .getBoundingClientRect();
      const from = el.getBoundingClientRect();
      const animation = el.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform: `translate(${target.x - from.x + 10}px,${target.y - from.y + 10}px) scale(.5)`,
            opacity: 0,
          },
        ],
        { duration: 450, easing: "ease-in" },
      );
      animation.onfinish = () => el.remove();
    };
    game.onToast = (text) => this.toast(text);
    game.onHud = () => this.hud();
    game.onPause = () => {
      if (
        game.started &&
        !document.querySelector<HTMLElement>("#panel")!.hidden
      )
        return;
      document.querySelector<HTMLElement>("#paused")!.hidden = !game.started;
    };
    game.onInventory = () => this.inventory();
    game.survival.onOpen = (kind, key) => this.inventory(kind, key);
    game.onSave = (ok) => {
      document.querySelector("#save-status")!.textContent = ok
        ? "✓ Остров сохранён"
        : "Не удалось сохранить — скачай копию";
    };
    document.querySelector<HTMLButtonElement>("#play")!.onclick = () => {
      document.querySelector<HTMLElement>("#start")!.hidden = true;
      document.querySelector<HTMLElement>("#hud")!.hidden = false;
      void game.start();
      this.toast(
        game.survival.creative
          ? "Твой остров! Выбери блок и построй что захочешь."
          : "Новый день! Найди дерево и приготовься к ночи.",
      );
    };
    document.querySelector<HTMLButtonElement>("#resume")!.onclick = () =>
      this.resume();
    document.querySelector<HTMLButtonElement>("#close-panel")!.onclick = () =>
      this.resume();
    document.querySelector<HTMLButtonElement>("#bag")!.onclick = () =>
      this.inventory();
    document.querySelector<HTMLButtonElement>("#settings")!.onclick = () =>
      this.settings();
    document.querySelector<HTMLButtonElement>("#help")!.onclick = () =>
      this.help();
    document.querySelector<HTMLButtonElement>("#camera")!.onclick = () =>
      (game.thirdPerson = !game.thirdPerson);
    for (const [id, key] of [
      ["jump", "Space"],
      ["action", "KeyF"],
      ["bubble", "KeyQ"],
    ]) {
      const b = document.querySelector<HTMLButtonElement>("#" + id)!;
      b.onpointerdown = (e) => {
        e.preventDefault();
        game.input.actions.add(key);
        game.input.keys.add(key);
        b.setPointerCapture(e.pointerId);
      };
      b.onpointerup = b.onpointercancel = () => game.input.keys.delete(key);
    }
    const quiet = document.querySelector<HTMLButtonElement>("#quiet")!;
    quiet.onpointerdown = (e) => {
      e.preventDefault();
      game.input.keys.add("KeyC");
      quiet.setPointerCapture(e.pointerId);
    };
    quiet.onpointerup = quiet.onpointercancel = () =>
      game.input.keys.delete("KeyC");
    document.querySelector<HTMLButtonElement>("#fly")!.onclick = () => {
      if (!game.survival.creative) return;
      game.flying = !game.flying;
      game.velocity.y = 0;
      this.toast(
        game.flying ? "Лети! Прыжок — выше, присесть — ниже" : "Полёт выключен",
      );
    };
    document.querySelector<HTMLButtonElement>("#debug-items")!.onclick = () => {
      if (!game.survival.creative)
        for (const id of [6, 7, 4, 16, 13, 108, 111, 112, 113, 114, 115, 105])
          game.survival.grant(id, item(id).tool ? 1 : 16);
      this.inventory();
    };
    document.querySelector<HTMLButtonElement>("#worlds")!.onclick = () =>
      void this.worlds();
    const nightButton =
      document.querySelector<HTMLButtonElement>("#debug-night")!;
    nightButton.onclick = () => {
      game.survival.state.clock =
        Math.floor(game.survival.state.clock / 720) * 720 + 480;
      this.resume();
    };
    this.renderBar();
    this.hud();
  }
  renderBar() {
    document.querySelector("#hotbar")!.innerHTML = this.game.bar
      .map(
        (id, i) =>
          `<button class="slot ${i === this.game.selected ? "selected" : ""}" data-slot="${i}" aria-label="Ячейка ${i + 1}: ${item(id).name}"><small>${i + 1}</small>${tile(id)}<em>${this.game.survival.creative ? "∞" : this.game.survival.inventory.slots[i]?.count || ""}</em></button>`,
      )
      .join("");
    document.querySelectorAll<HTMLButtonElement>("[data-slot]").forEach(
      (b) =>
        (b.onclick = () => {
          this.game.selected = Number(b.dataset.slot);
          this.renderBar();
        }),
    );
  }
  toast(text: string) {
    const el = document.querySelector("#toast")!;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => el.classList.remove("show"),
      3500,
    );
  }
  panel(html: string) {
    document.querySelector("#panel-content")!.innerHTML = html;
    document.querySelector<HTMLElement>("#panel")!.hidden = false;
    this.game.pause();
    document.querySelector<HTMLElement>("#paused")!.hidden = true;
  }
  resume() {
    document.querySelector<HTMLElement>("#panel")!.hidden = true;
    document.querySelector<HTMLElement>("#paused")!.hidden = true;
    void this.game.start();
  }
  inventory(station = "", key = "") {
    if (!this.game.survival.creative || station) {
      this.survivalInventory(station, key);
      return;
    }

    this.panel(
      `<span class="eyebrow">Творческая мастерская · бесконечные блоки</span><h2>Что построим?</h2><p>Нажми на блок — он займёт выбранную ячейку внизу.</p><div class="palette">${blocks
        .slice(1)
        .map(
          (b) =>
            `<button data-block="${b.id}" aria-label="${b.name}">${tile(b.id)}<span>${b.name}</span></button>`,
        )
        .join("")}</div>`,
    );
    document.querySelectorAll<HTMLButtonElement>("[data-block]").forEach(
      (b) =>
        (b.onclick = () => {
          this.game.bar[this.game.selected] = Number(b.dataset.block);
          this.renderBar();
          this.resume();
          void this.game.save();
        }),
    );
  }

  survivalInventory(station: string, key: string) {
    const g = this.game,
      s = g.survival,
      inv = s.inventory;
    const available = recipes.filter((r) =>
      r.input.some(([id]) => inv.discovered.has(id)),
    );
    const slotHTML = (
      stack: { id: number; count: number } | null,
      index: number,
      kind = "inv",
    ) =>
      `<button class="bag-slot ${kind === "inv" && index === this.inventorySelection ? "selected" : ""}" data-${kind}="${index}" aria-label="${stack ? item(stack.id).name : "Пустая ячейка"}">${tile(stack?.id || 0)}<small>${stack?.count || ""}</small></button>`;
    const chest = station === "chest" ? s.state.chests[key] || [] : null;
    const jobs = s.state.furnaces[key] || [];
    this
      .panel(`<span class="eyebrow">${station === "bench" ? "Верстак" : station === "furnace" ? "Печка" : station === "chest" ? "Сундук" : "Рюкзак"} · ${s.mode === "peaceful" ? "Мирное выживание" : "Выживание"}</span><h2>Вещи и рецепты</h2><p>Нажми вещь, затем ячейку назначения. Первые 9 ячеек — хотбар.</p>
      <div class="bag-grid">${inv.slots.map((stack, i) => slotHTML(stack, i)).join("")}</div>
      ${chest ? `<h3>Сундук · нажми вещь, чтобы забрать</h3><p>Выбери вещь в рюкзаке и нажми «В сундук».</p><button id="deposit">В сундук</button><div class="bag-grid">${chest.map((stack, i) => slotHTML(stack, i, "chest")).join("")}</div>` : ""}
      ${station === "furnace" ? `<p>Печка работает, пока ты играешь. Подойди к ней за готовыми вещами.</p><p>${jobs.map((j) => `${recipes.find((r) => r.id === j.recipe)?.name || "Рецепт"}: ${Math.ceil(j.remaining)} с`).join(" · ") || "Печка свободна"}</p>` : ""}
      <h3>Книга рецептов</h3><div class="recipe-grid">${available.map((r) => `<button data-recipe="${r.id}" ${canCraft(inv, r, station) ? "" : "disabled"}>${tile(r.output[0])}<b>${r.name} ×${r.output[1]}</b><small>${r.input.map(([id, n]) => `${item(id).name}: ${inv.count(id)}/${n}`).join(" · ")}${r.station && r.station !== station ? ` · Нужен ${r.station === "bench" ? "верстак" : "печка"}` : ""}</small></button>`).join("")}</div>`);
    document.querySelectorAll<HTMLButtonElement>("[data-inv]").forEach(
      (b) =>
        (b.onclick = () => {
          const index = Number(b.dataset.inv);
          if (this.inventorySelection < 0) this.inventorySelection = index;
          else {
            inv.move(this.inventorySelection, index);
            this.inventorySelection = -1;
            s.syncBar();
            void g.save();
          }
          this.survivalInventory(station, key);
        }),
    );
    document.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach(
      (b) =>
        (b.onclick = () => {
          const recipe = recipes.find((r) => r.id === b.dataset.recipe)!;
          if (!s.craft(recipe, station, key))
            this.toast("Освободи ячейку или проверь ингредиенты");
          this.survivalInventory(station, key);
        }),
    );
    if (chest) {
      document.querySelector<HTMLButtonElement>("#deposit")!.onclick = () => {
        const slot = inv.slots[this.inventorySelection];
        if (!slot) {
          this.toast("Сначала выбери вещь");
          return;
        }
        let left = slot.count;
        for (let i = 0; i < 27 && left; i++) {
          const target = chest[i];
          if (!target) {
            chest[i] = { ...slot, count: left };
            left = 0;
          } else if (target.id === slot.id && !item(slot.id).tool) {
            const n = Math.min(64 - target.count, left);
            target.count += n;
            left -= n;
          }
        }
        if (left) slot.count = left;
        else inv.slots[this.inventorySelection] = null;
        this.inventorySelection = -1;
        s.syncBar();
        void g.save();
        this.survivalInventory(station, key);
      };
      document.querySelectorAll<HTMLButtonElement>("[data-chest]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = Number(b.dataset.chest),
              stack = chest[i];
            if (stack) {
              const left = inv.add(stack.id, stack.count);
              chest[i] = left ? { ...stack, count: left } : null;
              s.syncBar();
              void g.save();
              this.survivalInventory(station, key);
            }
          }),
      );
    }
  }
  async worlds() {
    const g = this.game;
    if (g.started) await g.save();
    const store = g.store,
      slots = await store.list();
    const modeNames = {
      creative: "Творческий",
      peaceful: "Мирное выживание",
      survival: "Выживание",
    };
    this.panel(
      '<h2>Твои три острова</h2><p>Каждый мир сохраняется отдельно. Творческий остров можно оставить и начать выживание рядом.</p><div id="world-list" class="world-list"></div>',
    );
    const list = document.querySelector("#world-list")!;
    slots.forEach((saved, index) => {
      const button = document.createElement("button");
      button.dataset.world = String(index);
      if (saved) {
        if (saved.preview) {
          const img = document.createElement("img");
          img.src = saved.preview;
          img.alt = "";
          button.append(img);
        }
        const label = document.createElement("span");
        label.textContent = `${saved.name} · ${modeNames[saved.mode || "creative"]} · ${new Date(saved.updated).toLocaleDateString("ru")}`;
        button.append(label);
        button.onclick = () => {
          new IslandStore().select(index);
          location.reload();
        };
      } else {
        button.textContent = `＋ Новый остров ${index + 1}`;
        button.onclick = () => this.newWorld(index);
      }
      list.append(button);
    });
  }
  newWorld(slot: number) {
    this.panel(
      `<h2>Каким будет остров?</h2><label>Название <input id="new-world-name" maxlength="24" value="Остров приключений"></label><label>Режим <select id="new-world-mode"><option value="survival">Выживание · монстры ночью</option><option value="peaceful">Мирное выживание · без монстров</option><option value="creative">Творческий · бесконечные блоки и полёт</option></select></label><button class="primary" id="create-world">Создать остров</button>`,
    );
    document.querySelector<HTMLButtonElement>("#create-world")!.onclick =
      async () => {
        const mode = document.querySelector<HTMLSelectElement>(
          "#new-world-mode",
        )!.value as Mode;
        const name =
          document.querySelector<HTMLInputElement>("#new-world-name")!.value ||
          "Остров приключений";
        const saved = decodeIsland(
          JSON.stringify({
            version: 2,
            kind: "tikhonya-island",
            name,
            seed: crypto.getRandomValues(new Uint32Array(1))[0],
            position: [128.5, 11.05, 206.5],
            yaw: 0,
            pitch: -0.15,
            chunks: {},
            bar: [1, 7, 9, 12, 13, 14, 16, 17, 18],
            selected: 0,
            mode,
            survival: initialSurvival(),
            music: this.game.audio.music,
            effects: this.game.audio.effects,
            quality: this.game.quality,
            touchSensitivity: this.game.input.touchSensitivity,
            mouseSensitivity: this.game.input.mouseSensitivity,
          }),
        );
        // Slot is empty; an existing island is never overwritten by creation.
        const store = new IslandStore();
        store.select(slot);
        await store.save(saved);
        location.reload();
      };
  }
  settings() {
    const g = this.game;
    this.panel(
      `<h2>Твой остров</h2><button id="change-world">Мои миры · сменить режим</button><label>Название <input id="world-name" maxlength="24" autocomplete="off"></label><label>Музыка <input id="music" type="range" min="0" max="1" step=".05" value="${g.audio.music}"></label><label>Звуки <input id="effects" type="range" min="0" max="1" step=".05" value="${g.audio.effects}"></label><label>Поворот пальцем <input id="touch-sensitivity" type="range" min=".25" max="3" step=".05" value="${g.input.touchSensitivity}"><small>Медленнее ← → Быстрее</small></label><label>Поворот мышью <input id="mouse-sensitivity" type="range" min=".25" max="3" step=".05" value="${g.input.mouseSensitivity}"></label><label>Картинка <select id="quality"><option value="auto">Автоматически</option><option value="low">Легче</option><option value="high">Красивее</option></select></label><div class="panel-buttons"><button id="export-save">Сохранить файл</button><button id="import-save">Загрузить файл</button></div><input class="file-input" id="save-file" type="file" accept=".json,application/json"><p id="backup-status">Весь остров хранится только на этом устройстве. Копия пригодится, если браузер очистит данные.</p><p id="offline-status"></p>`,
    );
    document.querySelector<HTMLButtonElement>("#change-world")!.onclick = () =>
      void this.worlds();
    const name = document.querySelector<HTMLInputElement>("#world-name")!;
    name.value = g.name;
    name.onchange = () => {
      g.name = name.value.slice(0, 24) || "Солнечный остров";
      void g.save();
    };
    for (const key of ["music", "effects"] as const)
      document.querySelector<HTMLInputElement>("#" + key)!.oninput = (e) => {
        g.audio[key] = Number((e.target as HTMLInputElement).value);
        void g.save();
      };
    for (const [id, key] of [
      ["touch-sensitivity", "touchSensitivity"],
      ["mouse-sensitivity", "mouseSensitivity"],
    ] as const)
      document.querySelector<HTMLInputElement>("#" + id)!.oninput = (e) => {
        g.input[key] = Number((e.target as HTMLInputElement).value);
        void g.save();
      };
    const quality = document.querySelector<HTMLSelectElement>("#quality")!;
    quality.value = g.quality;
    quality.onchange = () => {
      g.setQuality(quality.value as "auto" | "low" | "high");
      void g.save();
    };
    document.querySelector<HTMLButtonElement>("#export-save")!.onclick = () => {
      const data = JSON.stringify(g.snapshot()),
        url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        );
      const a = document.createElement("a");
      a.href = url;
      a.download = "tikhonya-island.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      document.querySelector("#backup-status")!.textContent =
        "Копия острова скачана.";
    };
    const input = document.querySelector<HTMLInputElement>("#save-file")!;
    document.querySelector<HTMLButtonElement>("#import-save")!.onclick = () =>
      input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > 16_000_000) throw new Error("size");
        const saved = decodeIsland(await file.text());
        await g.savePending;
        await g.store.save(saved);
        g.allowSave = false;
        location.reload();
      } catch {
        document.querySelector("#backup-status")!.textContent =
          "Этот файл не похож на сохранение блочного острова.";
      }
    };
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.getRegistration().then((r) => {
        const el = document.querySelector("#offline-status");
        if (el)
          el.textContent = r?.active
            ? "✓ Можно играть без интернета"
            : "Для офлайн-игры один раз открой опубликованную версию.";
      });
  }
  help() {
    this.panel(
      '<h2>Маленькие большие стройки</h2><div class="help-grid"><article><b>👆</b><h3>Поставь блок</h3><p>Тапни по нужной грани. Призрак показывает место. На компьютере — правая кнопка мыши.</p></article><article><b>✋</b><h3>Разбери</h3><p>Удерживай палец на блоке. На компьютере — удерживай левую кнопку мыши.</p></article><article><b>🎒</b><h3>Выбирай</h3><p>Рюкзак / E открывает все блоки. Ячейки 1–9 и колесо выбирают материал.</p></article><article><b>🪁</b><h3>Лети!</h3><p>Два прыжка подряд или кнопка полёта. Прыжок — вверх, присесть — вниз.</p></article></div><p>Слева — джойстик, справа — поворот камеры. WASD — шаг, Shift — бег, C — тихий шаг, Space — прыжок. Q или кнопка 🫧 — пузыри (можно удерживать). F5 меняет вид, Esc отпускает мышь. Всё, что построишь, сохраняется.</p>',
    );
  }
  hud() {
    const g = this.game;
    const signature = JSON.stringify([
      g.bar,
      g.survival.creative ? null : g.survival.inventory.slots.slice(0, 9),
    ]);
    if (signature !== this.barSignature) {
      this.barSignature = signature;
      this.renderBar();
    }
    document.querySelector("#selected-name")!.textContent = item(
      g.bar[g.selected],
    ).name;
    document
      .querySelectorAll<HTMLElement>("[data-slot]")
      .forEach((b) =>
        b.classList.toggle("selected", Number(b.dataset.slot) === g.selected),
      );
    document.querySelector("#target-name")!.textContent = g.target
      ? block(g.target.id).name
      : "";
    document.querySelector("#world-label")!.textContent = g.name;
    document.querySelector("#fly small")!.textContent = g.flying
      ? "На землю"
      : "Полёт";
    const hints = [
      [
        "Твой первый замок",
        "Удерживай блок — он рассыплется. Тап / правая кнопка — поставить.",
      ],
      [
        "Выбирай любые цвета",
        "Открой рюкзак 🎒. Здесь есть стекло, фонари и цветы.",
      ],
      [
        "Выше облаков",
        "Два прыжка подряд включают полёт. Попробуй построить башню!",
      ],
    ];
    if (g.world.changed.size > 0)
      this.instructions = Math.max(this.instructions, 1);
    if (g.time > 50) this.instructions = 2;
    const hint = document.querySelector("#hint")!;
    hint.innerHTML = g.survival.creative
      ? `<b>${hints[this.instructions][0]}</b>${hints[this.instructions][1]}`
      : `<b>${g.survival.cycle.night ? "Ночь на острове" : "Успеть до заката"}</b>${g.survival.hint()}`;
    document.querySelector<HTMLElement>("#fly")!.hidden = !g.survival.creative;
    document.querySelector<HTMLElement>("#bubble")!.hidden =
      g.survival.creative;
    const cycle = g.survival.cycle,
      phaseNames = {
        day: "☀ День",
        sunset: "🌇 Закат",
        night: "🌙 Ночь",
        dawn: "🌅 Рассвет",
      };
    document.querySelector("#cycle-label")!.textContent =
      `${phaseNames[cycle.phase]} ${cycle.day} · ${String(Math.floor(cycle.hour)).padStart(2, "0")}:${String(Math.floor((cycle.hour % 1) * 60)).padStart(2, "0")}`;
    document.querySelector("#courage")!.textContent = g.survival.creative
      ? "Творческий"
      : g.survival.mode === "peaceful"
        ? "Мирный · " + "★".repeat(Math.ceil(g.survival.state.stars))
        : "★".repeat(Math.ceil(g.survival.state.stars)) +
          "☆".repeat(5 - Math.ceil(g.survival.state.stars));
    const recovery = g.survival.state.recovery;
    const compass = document.querySelector("#recovery-compass")!;
    if (recovery.length) {
      const nearest = [...recovery].sort(
        (a, b) =>
          Math.hypot(
            a.position[0] - g.position.x,
            a.position[2] - g.position.z,
          ) -
          Math.hypot(
            b.position[0] - g.position.x,
            b.position[2] - g.position.z,
          ),
      )[0];
      const dx = nearest.position[0] - g.position.x,
        dz = nearest.position[2] - g.position.z,
        rawAngle = Math.atan2(dx, dz) - g.yaw,
        angle = Math.atan2(Math.sin(rawAngle), Math.cos(rawAngle));
      compass.textContent = `🫧 Вещи: ${Math.round(Math.hypot(dx, dz))} м · ${Math.abs(angle) < 0.7 ? "сзади" : Math.abs(angle) > 2.4 ? "вперёд" : angle > 0 ? "справа" : "слева"}`;
    } else compass.textContent = "";
    const debug = document.querySelector<HTMLElement>("#debug")!;
    if (new URLSearchParams(location.search).has("debug")) {
      debug.hidden = false;
      debug.querySelector("span")!.textContent =
        `${Math.round(g.fps)} FPS · ${g.renderer.info.render.calls} draw · ${phaseNames[cycle.phase]} · ${g.world.groups.size} чанков · ${Math.round(g.position.x)},${Math.round(g.position.y)},${Math.round(g.position.z)} · ${g.survival.creative ? "блоки ∞" : "выживание"}`;
    }
  }
}
