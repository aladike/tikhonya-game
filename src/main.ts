import './style.css';
import {ru} from './strings';
import {Game} from './game';
import {Adventure} from './adventure';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<canvas id="world" aria-label="Трёхмерная лесная поляна"></canvas>
<div id="leaves" hidden></div><div id="context-prompt" hidden></div>
<div id="hud" hidden>
  <header class="topbar"><a class="brand" href="#" aria-label="Тихоня">✦ <span>${ru.title}<small>${ru.subtitle}</small></span></a><div class="top-actions"><span class="pill">✿ <b id="flower-count">0</b></span><button id="help" class="icon-button" aria-label="${ru.help}">?</button><button id="settings" class="icon-button" aria-label="${ru.settings}">⚙</button></div></header>
  <section class="quest"><span class="eyebrow" id="chapter">${ru.chapter}</span><h2 id="objective">${ru.quest}</h2><p id="objective-hint">${ru.questHint}</p><div class="quest-bottom"><span class="little-moon">☾</span><span id="zone-name">${ru.night}</span><span class="quest-dots">· · ·</span></div></section>
  <div class="compass"><span id="compass-arrow">↑</span><small id="distance"></small></div>
  <div class="bottom-info"><span class="status-dot"></span><span id="mode">${ru.walk}</span><span class="desktop-hint">WASD · C — тише</span></div>
  <div class="actions"><button data-key="KeyQ" class="action small"><span>◈</span><small>${ru.throw}</small><kbd>Q</kbd></button><button data-key="KeyE" class="action primary"><span>✋</span><small id="action-label">${ru.action}</small><kbd>E</kbd></button><button data-key="Space" class="action"><span>↟</span><small>${ru.jump}</small><kbd>Space</kbd></button></div>
  <div id="enemy-marker" class="monster-marker" hidden>☀</div><div id="monster-marker" class="monster-marker" hidden>?</div><div id="stick" hidden><span></span></div><div id="debug"></div>
</div>
<div id="toast" role="status"></div>
<section id="start" class="start-screen"><div class="start-card"><div class="edition">ИСТОРИИ ЛУННОГО ЛЕСА <span>✦</span></div><h1>${ru.title}<span>${ru.subtitle}</span></h1><p class="tagline">${ru.tagline}</p><p class="intro">${ru.intro}</p><button id="play" class="cta">${ru.play}<span>↗</span></button><div class="start-note">Без спешки. Без страха. Вместе с друзьями.</div></div><div class="postcard"><span>☾</span><p>В каждом шорохе —<br>маленькое чудо.</p><small>ЛУННЫЙ ЛЕС · 01</small></div><div class="start-footer">ДЛЯ МАЛЕНЬКИХ И БОЛЬШИХ ИССЛЕДОВАТЕЛЕЙ <span>звук включится после касания ♫</span></div></section>
<div id="paused" class="modal-backdrop" hidden><section class="modal"><span class="modal-symbol">☾</span><h2>${ru.pause}</h2><button id="resume" class="cta">${ru.resume}</button></section></div>
<div id="panel" class="modal-backdrop" hidden><section class="modal"><button id="close-panel" class="close" aria-label="Закрыть">×</button><div id="panel-content"></div></section></div>
<div class="rotate-hint">↻ ${ru.turn}</div>`;
let game:Game;
try { game=new Game(document.querySelector<HTMLCanvasElement>('#world')!); }
catch { app.innerHTML=`<main class="loading"><h1>☾</h1><p>${ru.failure}</p><p>Обнови страницу, чтобы попробовать ещё раз.</p></main>`;throw new Error('WebGL initialization failed'); }
const showPanel=(html:string)=>{game.paused=true;game.input.clear();game.sound.pause();document.exitPointerLock?.();document.querySelector('#panel-content')!.innerHTML=html;document.querySelector<HTMLElement>('#panel')!.hidden=false;};
const resume=()=>{game.paused=false;game.input.clear();void game.sound.start();document.querySelector<HTMLElement>('#paused')!.hidden=true;document.querySelector<HTMLElement>('#panel')!.hidden=true;};
document.querySelector('#play')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#start')!.hidden=true;document.querySelector<HTMLElement>('#hud')!.hidden=false;game.start();});
document.querySelector('#resume')!.addEventListener('click',resume);document.querySelector('#close-panel')!.addEventListener('click',resume);
document.querySelector('#help')!.addEventListener('click',()=>showPanel(`<span class="eyebrow">МАЛЕНЬКАЯ ПАМЯТКА</span><h2>${ru.help}</h2><div class="help-grid"><article><b>👣</b><h3>Крадись</h3><p>Маленький шаг джойстика или C — Бубуль тебя не услышит.</p></article><article><b>🌿</b><h3>Прячься</h3><p>У кустика нажми действие. Даже совсем рядом ты в безопасности.</p></article><article><b>◈</b><h3>Отвлекай</h3><p>Поверни камеру в сторону и брось шишку — Бубуль пойдёт на звук.</p></article><article><b>✿</b><h3>Исследуй</h3><p>Найди светящийся цветок, подбери и принеси домой.</p></article></div><p>${ru.controls}</p><p>${ru.touch}</p><p>Перетаскивай мышь для камеры; двойной щелчок захватывает указатель, Esc отпускает.</p>`));
document.querySelector('#settings')!.addEventListener('click',()=>{showPanel(`<h2>${ru.settings}</h2><label>Музыка <input id="music" type="range" min="0" max="1" step=".05" value="${game.sound.music}"></label><label>Звуки леса <input id="effects" type="range" min="0" max="1" step=".05" value="${game.sound.effects}"></label><p>Игра ничего не отправляет. Здесь только ты и лес.</p>`);for(const key of ['music','effects'] as const)document.querySelector<HTMLInputElement>(`#${key}`)!.addEventListener('input',e=>game.sound[key]=Number((e.target as HTMLInputElement).value));});
export {game,showPanel,resume};
// Development-only inspection surface; eliminated from production bundles.
if(import.meta.env.DEV)Object.assign(window,{__game:game});

export const adventure=new Adventure(game,showPanel,resume);
if(import.meta.env.DEV)Object.assign(window,{__adventure:adventure});
