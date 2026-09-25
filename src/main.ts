import "./ui/style.css";
import * as T from "three";
import { IslandGame } from "./engine/game";
import { IslandStore } from "./save/store";
import { Interface } from "./ui/interface";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="world" aria-label="Блочный остров"></canvas><div id="loading"><span>🌱 Растим твой остров…</span><progress max="100" value="5"></progress><small id="loading-detail">Готовим краски</small></div>
<div id="hud" hidden><header class="topbar"><div class="brand"><b>Тихоня</b><small id="world-label">Блочный остров</small></div><nav class="toolbar"><button id="camera" aria-label="Сменить вид" title="Сменить вид · F5">◉</button><button id="bag" aria-label="Рюкзак" title="Блоки · E">🎒</button><button id="help" aria-label="Как играть">?</button><button id="settings" aria-label="Настройки">⚙</button></nav></header><div id="hint" class="hint"></div><div id="save-status" class="status">Творческий режим · всё возможно</div><div class="survival-status"><span id="cycle-label"></span><strong id="courage"></strong><span id="recovery-compass"></span></div><div id="crosshair"></div><div id="target-name"></div><div class="hotbar-wrap"><div id="selected-name"></div><div id="hotbar"></div></div><div class="controls"><button id="bubble" aria-label="Пузырь" hidden>🫧<small>Пузырь</small></button><button id="fly" aria-label="Полёт">🪁<small>Полёт</small></button><button id="action" aria-label="Действие">✋<small>Действие</small></button><button id="quiet" aria-label="Присесть">↓<small>Тише / вниз</small></button><button id="jump" aria-label="Прыжок">↑<small>Прыжок</small></button></div><div class="desktop-tip">WASD — шаг · Shift — бег<br>ЛКМ — сломать · ПКМ — поставить</div><div id="toast" role="status"></div></div>
<div id="stick" hidden><i></i></div><div id="debug" hidden><span></span><button id="debug-items">Выдать блоки</button><button id="debug-night">Наступить ночь</button></div><div class="rotate-hint">↻ Поверни экран — так удобнее строить</div>
<section id="start" class="overlay start" hidden><div class="start-card"><div class="eyebrow">МАЛЕНЬКИЙ ОСТРОВ · БОЛЬШИЕ ИДЕИ</div><h1>Тихоня<small>Блочный остров</small></h1><p>Замок? Радужный мост?<br>А может, дом выше облаков?</p><div class="sparkle">🌷 🧱 ☀️</div><button id="play" class="primary cta">Начать строить</button><button id="worlds">Мои миры · начать выживание</button><p class="details">Твой мир. Твои правила.</p></div></section>
<div id="paused" class="overlay" hidden><section class="modal"><h2>Остров подождёт ☀</h2><button id="resume" class="primary cta">Продолжить строить</button></section></div><div id="panel" class="overlay" hidden><section class="modal"><button id="close-panel" class="close" aria-label="Закрыть">×</button><div id="panel-content"></div></section></div>`;
try {
  const [atlas, saved] = await Promise.all([
    new T.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}atlas.png`),
    new IslandStore().load(),
  ]);
  document.querySelector<HTMLProgressElement>("#loading progress")!.value = 25;
  const game = new IslandGame(
    document.querySelector<HTMLCanvasElement>("#world")!,
    atlas,
    saved,
  );
  new Interface(game);
  if (import.meta.env.DEV) Object.assign(window, { __island: game });
  if (saved)
    document.querySelector("#play")!.textContent = "Продолжить строить";
  const ready = window.setInterval(() => {
    document.querySelector<HTMLProgressElement>("#loading progress")!.value =
      Math.min(100, 25 + (game.world.groups.size / 9) * 75);
    document.querySelector("#loading-detail")!.textContent =
      `Складываем берега · ${Math.min(9, game.world.groups.size)} / 9`;
    if (game.world.error) {
      clearInterval(ready);
      document.querySelector("#loading-detail")!.textContent = game.world.error;
    } else if (game.world.groups.size >= 9) {
      clearInterval(ready);
      document.querySelector<HTMLElement>("#loading")!.hidden = true;
      document.querySelector<HTMLElement>("#start")!.hidden = false;
    }
  }, 100);
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((registration) => {
        const offer = () => {
          if (!registration.waiting || document.querySelector("#update-game"))
            return;
          const button = document.createElement("button");
          button.id = "update-game";
          button.textContent = "✦ Обновить остров";
          button.onclick = async () => {
            await game.save();
            registration.waiting?.postMessage("ACTIVATE_UPDATE");
          };
          document.body.append(button);
        };
        offer();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              offer();
          });
        });
        const controlled = !!navigator.serviceWorker.controller;
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (controlled && !reloaded) {
            reloaded = true;
            location.reload();
          }
        });
      })
      .catch(() =>
        game.onToast(
          "Не удалось подготовить офлайн-копию. Попробуй открыть игру ещё раз.",
        ),
      );
  }
} catch (error) {
  document.querySelector("#loading-detail")!.textContent =
    "Не удалось открыть остров. Обнови страницу или попробуй другой браузер.";
  if (import.meta.env.DEV) console.error(error);
}
