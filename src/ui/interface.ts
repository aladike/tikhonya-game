import { block, blocks } from "../data/blocks";
import type { IslandGame } from "../engine/game";
import { decodeIsland } from "../save/format";
export const tile = (id: number) => {
  const b = block(id),
    t = b.top ?? b.tile;
  return `<span class="tile" style="background-position:${-(t % 8) * 32}px ${-Math.floor(t / 8) * 32}px" aria-hidden="true"></span>`;
};
export class Interface {
  toastTimer = 0;
  instructions = 0;
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
    game.onSave = (ok) => {
      document.querySelector("#save-status")!.textContent = ok
        ? "✓ Остров сохранён"
        : "Не удалось сохранить — скачай копию";
    };
    document.querySelector<HTMLButtonElement>("#play")!.onclick = () => {
      document.querySelector<HTMLElement>("#start")!.hidden = true;
      document.querySelector<HTMLElement>("#hud")!.hidden = false;
      void game.start();
      this.toast("Твой остров! Выбери блок и построй что захочешь.");
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
      game.flying = !game.flying;
      game.velocity.y = 0;
      this.toast(
        game.flying ? "Лети! Прыжок — выше, присесть — ниже" : "Полёт выключен",
      );
    };
    document.querySelector<HTMLButtonElement>("#debug-items")!.onclick = () =>
      this.inventory();
    this.renderBar();
    this.hud();
  }
  renderBar() {
    document.querySelector("#hotbar")!.innerHTML = this.game.bar
      .map(
        (id, i) =>
          `<button class="slot ${i === this.game.selected ? "selected" : ""}" data-slot="${i}" aria-label="Ячейка ${i + 1}: ${block(id).name}"><small>${i + 1}</small>${tile(id)}<em>∞</em></button>`,
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
  inventory() {
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
  settings() {
    const g = this.game;
    this.panel(
      `<h2>Твой остров</h2><label>Название <input id="world-name" maxlength="24" autocomplete="off"></label><label>Музыка <input id="music" type="range" min="0" max="1" step=".05" value="${g.audio.music}"></label><label>Звуки <input id="effects" type="range" min="0" max="1" step=".05" value="${g.audio.effects}"></label><label>Поворот пальцем <input id="touch-sensitivity" type="range" min=".25" max="3" step=".05" value="${g.input.touchSensitivity}"><small>Медленнее ← → Быстрее</small></label><label>Поворот мышью <input id="mouse-sensitivity" type="range" min=".25" max="3" step=".05" value="${g.input.mouseSensitivity}"></label><label>Картинка <select id="quality"><option value="auto">Автоматически</option><option value="low">Легче</option><option value="high">Красивее</option></select></label><div class="panel-buttons"><button id="export-save">Сохранить файл</button><button id="import-save">Загрузить файл</button></div><input class="file-input" id="save-file" type="file" accept=".json,application/json"><p id="backup-status">Весь остров хранится только на этом устройстве. Копия пригодится, если браузер очистит данные.</p><p id="offline-status"></p>`,
    );
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
        await g.store.save(saved);
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
      '<h2>Маленькие большие стройки</h2><div class="help-grid"><article><b>👆</b><h3>Поставь блок</h3><p>Тапни по нужной грани. Призрак показывает место. На компьютере — правая кнопка мыши.</p></article><article><b>✋</b><h3>Разбери</h3><p>Удерживай палец на блоке. На компьютере — удерживай левую кнопку мыши.</p></article><article><b>🎒</b><h3>Выбирай</h3><p>Рюкзак / E открывает все блоки. Ячейки 1–9 и колесо выбирают материал.</p></article><article><b>🪁</b><h3>Лети!</h3><p>Два прыжка подряд или кнопка полёта. Прыжок — вверх, присесть — вниз.</p></article></div><p>Слева — джойстик, справа — поворот камеры. WASD — шаг, Shift — бег, C — тихий шаг, Space — прыжок. F5 меняет вид, Esc отпускает мышь. Всё, что построишь, сохраняется.</p>',
    );
  }
  hud() {
    const g = this.game;
    document.querySelector("#selected-name")!.textContent = block(
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
    hint.innerHTML = `<b>${hints[this.instructions][0]}</b>${hints[this.instructions][1]}`;
    const debug = document.querySelector<HTMLElement>("#debug")!;
    if (new URLSearchParams(location.search).has("debug")) {
      debug.hidden = false;
      debug.querySelector("span")!.textContent =
        `${Math.round(g.fps)} FPS · ${g.renderer.info.render.calls} draw · день 10:00 · ${g.world.groups.size} чанков · ${Math.round(g.position.x)},${Math.round(g.position.y)},${Math.round(g.position.z)} · блоки ∞`;
    }
  }
}
