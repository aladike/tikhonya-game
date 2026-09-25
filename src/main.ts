import { localize } from "./localize";
import "./style.css";
import { ru } from "./strings";
import { Game } from "./game";
import { Adventure } from "./adventure";
import { Village } from "./village";
import { Story } from "./story";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = localize(
  "s_61d30b4014",
  ru.title,
  ru.subtitle,
  ru.help,
  ru.settings,
  ru.chapter,
  ru.quest,
  ru.questHint,
  ru.night,
  ru.walk,
  ru.throw,
  ru.action,
  ru.jump,
  ru.title,
  ru.subtitle,
  ru.tagline,
  ru.intro,
  ru.play,
  ru.pause,
  ru.resume,
  ru.turn,
);
let game: Game;
try {
  game = new Game(document.querySelector<HTMLCanvasElement>("#world")!);
} catch {
  app.innerHTML = localize("s_a3655f0d22", ru.failure);
  throw new Error("WebGL initialization failed");
}
const showPanel = (html: string) => {
  game.paused = true;
  game.input.clear();
  game.sound.pause();
  document.exitPointerLock?.();
  document.querySelector("#panel-content")!.innerHTML = html;
  document.querySelector<HTMLElement>("#panel")!.hidden = false;
};
const resume = () => {
  game.paused = false;
  game.input.clear();
  void game.sound.start();
  document.querySelector<HTMLElement>("#paused")!.hidden = true;
  document.querySelector<HTMLElement>("#panel")!.hidden = true;
};
document.querySelector("#play")!.addEventListener("click", () => {
  document.querySelector<HTMLElement>("#start")!.hidden = true;
  document.querySelector<HTMLElement>("#hud")!.hidden = false;
  game.start();
});
document.querySelector("#resume")!.addEventListener("click", resume);
document.querySelector("#close-panel")!.addEventListener("click", resume);
document
  .querySelector("#help")!
  .addEventListener("click", () =>
    showPanel(localize("s_89f6d50483", ru.help, ru.controls, ru.touch)),
  );
document.querySelector("#settings")!.addEventListener("click", () => {
  showPanel(
    localize("s_71415f2a78", ru.settings, game.sound.music, game.sound.effects),
  );
  for (const key of ["music", "effects"] as const)
    document
      .querySelector<HTMLInputElement>(`#${key}`)!
      .addEventListener(
        "input",
        (e) => (game.sound[key] = Number((e.target as HTMLInputElement).value)),
      );
});
export { game, showPanel, resume };
// Development-only inspection surface; eliminated from production bundles.
if (import.meta.env.DEV) Object.assign(window, { __game: game });

export const adventure = new Adventure(game, showPanel, resume);
if (import.meta.env.DEV) Object.assign(window, { __adventure: adventure });

export const village = new Village(adventure);
if (import.meta.env.DEV) Object.assign(window, { __village: village });

export const story = new Story(adventure, village);
if (import.meta.env.DEV) Object.assign(window, { __story: story });
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((registration) => {
        const offer = () => {
          if (!registration.waiting) return;
          const button = document.createElement("button");
          button.id = "update-game";
          button.textContent = localize("s_8046df5ca7");
          button.onclick = () => {
            adventure.persist();
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
        let refreshed = false;
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hadController && !refreshed) {
            refreshed = true;
            location.reload();
          }
        });
      })
      .catch(() => game.toast(localize("s_38f173a414")));
  });
}

document
  .querySelectorAll<HTMLButtonElement>(".icon-button")
  .forEach(
    (button) => (button.title = button.getAttribute("aria-label") || ""),
  );
document.querySelector("#map")!.textContent = "⌖";
document.querySelector("#helpers > span")!.textContent = "🐾";
