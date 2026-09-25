import * as T from 'three';
import type {Adventure} from './adventure';
import {zoneNames,names} from './adventure';
import type {Village} from './village';
import {monster,orb,box,home,flower,material} from './models';
import {stories,natureEntries,helperNames} from './content';
export class Story {
  decor=new T.Group();villageDecor=new T.Group();special=monster(2);gift=new T.Group();goal=new T.Vector3();
  awake=false;smell:T.Vector3[]=[];smellTime=0;smellSafe=0;rock?:T.Mesh;bridge=new T.Group();treehouse=new T.Group();
  sparkles=new T.Group();insects=new T.Group();trail:T.Mesh[]=[];lastZone=-1;
  constructor(public a:Adventure,public village:Village){
    const g=a.game;g.scene.add(this.decor,this.villageDecor,this.special.g,this.sparkles,this.insects);
    for(let i=0;i<14;i++){const dot=orb(this.sparkles,'#ffe7a4',0,.3,0,.045,.045,.045,1);dot.castShadow=false;}
    const update=g.onUpdate,hud=g.onHud,interact=g.onInteract,context=g.extraContext,event=g.onEvent;
    g.onUpdate=dt=>{update(dt);this.update(dt);};g.onHud=()=>{hud();this.hud();};g.onInteract=()=>this.interact()||interact();g.extraContext=()=>this.context()||context();g.onEvent=e=>{event(e);if(e==='delivery')this.refreshVillage();};
    const change=a.changeZone.bind(a);a.changeZone=(zone,save=true)=>{change(zone,save);this.buildZone();};
    a.map=()=>this.map();a.helpers=()=>this.helpers();const command=a.command.bind(a);a.command=key=>{if(['fetch','bark','scout'].includes(key)){const id=key==='scout'?'cat':'dog';if(!a.state.helpers.includes(id)){g.toast('Сначала выбери этого помощника в меню «Друзья».');return;}command(key);if(key==='scout'&&a.state.zone===0&&!a.state.friends.includes(0)){this.gift.position.y=0;g.toast('Кошка сняла игрушечный желудь с ветки! Ищи золотое свечение.');}}else this.ability(key);};
    document.querySelector('.top-actions')!.insertAdjacentHTML('afterbegin','<button id="book" class="icon-button" aria-label="Книга природы">▤</button>');document.querySelector('#book')!.addEventListener('click',()=>this.book());
    document.querySelector('#hud')!.insertAdjacentHTML('beforeend','<div id="story-marker" class="world-label" hidden></div><div id="special-marker" class="monster-marker" hidden></div><div id="journey"><span>✦</span><b id="friend-count">0 / 4</b><small>друзей для домика на дереве</small></div>');
    this.applyOutfit();this.buildZone();this.refreshVillage();
    if(a.state.zone>1)a.changeZone(a.state.zone,false);
  }
  owner(){return Math.min(this.a.state.zone,3);}
  targetMonster(){return this.owner()===0?this.a.game.bubul.g:this.owner()===1?this.a.enemy.g:this.special.g;}
  unlocked(zone:number){const s=this.a.state;return zone===0||zone===1&&s.delivered>0||zone>1&&zone<4&&s.friends.includes(zone-1)||zone===4&&s.friends.length===4;}
  buildZone(){
    const a=this.a,g=a.game,z=a.state.zone;this.lastZone=z;this.decor.clear();this.bridge=new T.Group();this.decor.add(this.bridge);this.rock=undefined;this.smell=[];
    this.special.g.visible=z===2||z===3;this.special.g.position.set(3,0,-9);
    if(z>=2){this.special.g.removeFromParent();this.special=monster(z===2?2:3);g.scene.add(this.special.g);this.special.g.position.set(3,0,-9);a.discover(z===2?'sonka':'nyuhach');}
    if(z===1){for(let i=0;i<9;i++)orb(this.decor,'#b6ced0',-9+i*2,.25,-6,.65,.4,.55);}
    if(z===2){for(let i=0;i<65;i++){const x=Math.sin(i*2.4)*(5+i%15),zz=Math.cos(i*2.4)*(4+i%19);flower(this.decor,x,zz,i%2?'#e7b1c3':'#e7d395').scale.setScalar(.6+i%3*.12);}for(let i=0;i<4;i++){orb(this.decor,'#ecd3b1',-10+i*7,.7,-8,1.4,.16,1);box(this.decor,'#a58c75',-10+i*7,.4,-8,.2,.8,.2);}}
    if(z===3){for(let i=0;i<16;i++){const x=(i%2?-1:1)*(7+i%5),zz=12-i*2;orb(this.decor,'#aaaeb6',x,.6,zz,1.5,.9,1);}
      const puddle=new T.Mesh(new T.CircleGeometry(2.2,24),new T.MeshStandardMaterial({color:'#75b4c2',roughness:.15}));puddle.rotation.x=-Math.PI/2;puddle.position.set(-3,.07,-5);this.decor.add(puddle);for(let i=0;i<6;i++)flower(this.decor,4+Math.sin(i),-9+Math.cos(i));}
    if(z===4){
      box(this.decor,'#624d3c',0,5,-20,3.8,10,3.5);for(let i=0;i<6;i++)orb(this.decor,'#6b966e',Math.sin(i)*3,10+i%2,-20+Math.cos(i)*3,3.5,1.8,3);
      for(const x of [-4,4]){box(this.decor,'#a18a68',x,.5,-4,5,1,2);box(this.decor,'#567c76',x,.08,-11,25,.15,3);}
      this.rock=orb(this.decor,'#b6b4a5',0,.7,-4,1.6,1.5,1.2);
      for(let i=0;i<8;i++)box(this.bridge,'#e6d5ac',0,.18,-9-i*.55,2.8,.16,.42);
      for(const x of [-1.5,1.5])box(this.bridge,'#e6d5ac',x,.8,-11,.07,.07,4);
      this.bridge.visible=a.state.found.includes('puzzle-bridge');this.rock.visible=!a.state.found.includes('puzzle-rock');
      this.buildTreehouse();
    }
    this.gift=new T.Group();this.decor.add(this.gift);if(z<4){const s=stories[z];this.gift.position.set(s.x,z===0?1.8:0,s.z);orb(this.gift,['#d9ae6d','#ffeac1','#dac0d7','#b4d6a8'][z],0,.6,0,.38,z===2?.15:.35,.3,.5);const ring=new T.Mesh(new T.RingGeometry(.65,.75,32),new T.MeshBasicMaterial({color:'#ffe6a3',transparent:true,opacity:.7,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;this.gift.add(ring);this.gift.visible=!a.state.found.includes(`gift-${z}`)&&!a.state.friends.includes(z);}
    this.trail=[];for(let i=0;i<16;i++){const dot=orb(this.decor,'#d4c49e',0,.08,0,.12,.035,.12,.2);dot.visible=false;this.trail.push(dot);}
    if(z<4&&a.state.friends.includes(z))g.toast(`${names[z]} уже твой друг. Можно исследовать дальше — открой карту ♧.`);
  }
  buildTreehouse(){this.treehouse.removeFromParent();this.treehouse=new T.Group();this.decor.add(this.treehouse);if(!this.a.state.buildings.includes('treehouse'))return;const h=home(this.treehouse,0,-20,'#e6c797');h.position.y=5;h.scale.setScalar(1.05);box(this.treehouse,'#b59974',0,4.9,-20,7,.3,6);for(let i=0;i<12;i++)box(this.treehouse,'#d7bd8d',0,.2+i*.4,-15-i*.35,1.6,.13,.3);for(let i=0;i<7;i++)flower(this.treehouse,-2+i*.65,-17).position.y=5;}
  refreshVillage(){
    this.villageDecor.clear();const s=this.a.state;
    s.friends.forEach((id,i)=>{const p=monster(id);p.g.position.set(-9+i*6,0,17);p.g.scale.setScalar(.8);this.villageDecor.add(p.g);if(s.buildings.includes(`friendhouse-${id}`)){const h=home(this.villageDecor,-9+i*6,19,['#baa5d2','#dfbb8d','#e0bad0','#acd1ad'][id]);h.scale.setScalar(.55);}});
    for(let level=0;level<s.homeLevel;level++){const x=level%2===0?-3.2:3.2,y=level>2?3:0;const h=home(this.villageDecor,x,14,'#d4bd93');h.scale.setScalar(.6);h.position.y=y;}if(s.homeLevel===5)for(let i=0;i<6;i++)flower(this.villageDecor,i*.6-1.5,14).position.y=5;
  }
  context(){const a=this.a,g=a.game,z=a.state.zone;if(g.hidden||g.day)return null;
    if(z===4){if(g.position.z< -16&&!a.state.buildings.includes('treehouse'))return 'Дом на дереве';if(this.rock?.visible&&g.position.distanceTo(this.rock.position)<3)return 'Позвать жука';if(!this.bridge.visible&&Math.abs(g.position.z+9)<2)return 'Позвать паука';return null;}
    if(this.gift.visible&&this.gift.position.distanceTo(g.position)<2.6)return z===0&&this.gift.position.y>1?'Позвать кошку':'Взять подарок';
    if(g.position.distanceTo(this.targetMonster().position)<2.8&&!a.state.friends.includes(z))return a.state.found.includes(`gift-${z}`)?'Подарить':'Поговорить';return null;
  }
  interact(){const a=this.a,g=a.game,z=a.state.zone,context=this.context();if(!context)return false;
    if(context==='Позвать кошку'){a.command('scout');return true;}if(context==='Позвать жука'){this.ability('beetle');return true;}if(context==='Позвать паука'){this.ability('spider');return true;}
    if(context==='Взять подарок'){this.gift.visible=false;a.state.found.push(`gift-${z}`);g.sound.chime();g.toast(`Нашлась ${stories[z].gift}! Подойди к ${stories[z].name} и подари её.`);a.persist();return true;}
    if(context==='Поговорить'){a.panel(`<span class="eyebrow">${stories[z].title}</span><h2>${stories[z].name}</h2><p>${stories[z].line}</p><p>${stories[z].hint}</p>`);return true;}
    if(context==='Подарить'){a.state.friends.push(z);a.state.inventory.wood+=3;a.state.inventory.stone+=2;a.state.inventory.flower++;for(const id of ['fireflies','beetle','spider'].slice(0,z+1))a.discover(id);if(a.state.helpers.length<3&&z===0)a.state.helpers.push('fireflies');g.friendlyBubul=a.state.friends.includes(0);g.sound.chime();g.toast(stories[z].reward);a.persist();this.refreshVillage();this.book();return true;}
    if(context==='Дом на дереве'){this.finish();return true;}return false;
  }
  finish(){const a=this.a;if(a.state.friends.length<4){a.game.toast('Дом на дереве построим всей командой. Найди четырёх друзей.');return;}a.state.buildings.push('treehouse');this.buildTreehouse();a.persist();a.game.sound.chime();a.panel('<span class="eyebrow">ВСЕ ДОМА</span><h2>Дом на Старом дереве!</h2><p>Бубуль слушает ветер. Глазастик зажигает фонари. Сонька устроилась на подушке. Нюхач принёс цветы.</p><p>В лесу больше нет чужих. Есть друзья — и ещё столько мест для приключений.</p><button id="celebrate" class="cta">Ура! Продолжить исследовать</button>');document.querySelector<HTMLButtonElement>('#celebrate')!.onclick=()=>a.resume();}
  ability(id:string){const a=this.a,g=a.game;if(!a.state.helpers.includes(id)){g.toast(`Нужен помощник: ${helperNames[id]}. Выбери его в меню «Друзья».`);return;}
    if(id==='fireflies'){g.toast('Светлячки зажгли дорожку к цели.');return;}
    if(id==='beetle'&&a.state.zone===4&&this.rock?.visible&&g.position.distanceTo(this.rock.position)<5){this.rock.visible=false;a.state.found.push('puzzle-rock');g.toast('Жук отодвинул камень! Проход открыт.');}
    else if(id==='spider'&&a.state.zone===4&&Math.abs(g.position.z+9)<4){this.bridge.visible=true;a.state.found.push('puzzle-bridge');g.toast('Паук сплёл мост. Вперёд, к Старому дереву!');}else g.toast('Друг рядом. Его умение пригодится у Старого дерева.');a.persist();
  }
  map(){const a=this.a;a.panel(`<span class="eyebrow">ОДНА БОЛЬШАЯ ИСТОРИЯ</span><h2>Куда отправимся?</h2><button class="card-button" id="map-home">⌂ Домашняя поляна<small>Строить, украшать и отдыхать</small></button>${zoneNames.map((n,i)=>`<button class="card-button" data-story-zone="${i}" ${this.unlocked(i)?'':'disabled'}>${['☾','≈','✿','◆','⌂'][i]} ${n}<small>${this.unlocked(i)?i===4?'Вместе построим дом на дереве':a.state.friends.includes(i)?'Друг найден ✓ · секреты ещё ждут':stories[i].title:i===1?'Принеси цветок домой':i===4?'Подружись со всеми четырьмя монстрами':`Помоги ${names[i-1]}`}</small></button>`).join('')}`);document.querySelector<HTMLButtonElement>('#map-home')!.onclick=()=>{this.village.returnHome(false);a.resume();};document.querySelectorAll<HTMLButtonElement>('[data-story-zone]').forEach(b=>b.onclick=()=>{this.village.leave(Number(b.dataset.storyZone));a.resume();});}
  helpers(){const a=this.a;const unlocked=['dog','cat',...['fireflies','beetle','spider'].filter((_,i)=>a.state.friends.includes(i))];a.panel(`<span class="eyebrow">ВМЕСТЕ ВЕСЕЛЕЕ · ДО ТРЁХ ДРУЗЕЙ</span><h2>Твоя команда</h2><div class="panel-buttons">${unlocked.map(id=>`<button data-helper="${id}">${a.state.helpers.includes(id)?'✓ ':''}${helperNames[id]}</button>`).join('')}</div><p id="helper-hint">Выбери до трёх помощников. Нажми на выбранного, чтобы оставить его отдыхать.</p>${a.state.helpers.includes('dog')?'<button class="card-button" data-command="fetch">🐕 Принеси</button><button class="card-button" data-command="bark">🐕 Гавкни там</button>':''}${a.state.helpers.includes('cat')?'<button class="card-button" data-command="scout">🐈 Разведай сверху</button>':''}${a.state.helpers.filter(x=>!['dog','cat'].includes(x)).map(id=>`<button class="card-button" data-command="${id}">${helperNames[id]} · помочь</button>`).join('')}`);
    document.querySelectorAll<HTMLButtonElement>('[data-helper]').forEach(b=>b.onclick=()=>{const id=b.dataset.helper!;if(a.state.helpers.includes(id))a.state.helpers=a.state.helpers.filter(x=>x!==id);else if(a.state.helpers.length<3)a.state.helpers.push(id);else{document.querySelector('#helper-hint')!.textContent='В команде уже трое. Отпусти одного отдыхать, затем выбери нового.';return;}a.persist();this.helpers();});document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b=>b.onclick=()=>{a.command(b.dataset.command!);a.resume();});
  }
  book(){const a=this.a,s=a.state;a.panel(`<span class="eyebrow">${s.friends.length} / 4 ДРУЗЕЙ · ${s.collection.length} НАХОДОК</span><h2>Книга природы</h2><div class="panel-buttons"><button id="wardrobe">Мой персонаж</button><button id="grow-home">Дом и друзья</button></div><div class="help-grid">${Object.entries(natureEntries).filter(([id])=>s.collection.includes(id)).map(([id,[icon,name,desc]])=>`<article><b>${icon}</b><h3>${name}${s.friends.includes(['bubul','glazastik','sonka','nyuhach'].indexOf(id))?' ♡':''}</h3><p>${desc}</p></article>`).join('')}</div>`);document.querySelector<HTMLButtonElement>('#wardrobe')!.onclick=()=>this.wardrobe();document.querySelector<HTMLButtonElement>('#grow-home')!.onclick=()=>this.growHome();}
  wardrobe(){const a=this.a;a.panel('<h2>Мой персонаж</h2><label>Игровое имя <input id="character-name" type="text" maxlength="20" autocomplete="off"></label><label>Одежда <select id="outfit"><option value="0">Мёд</option><option value="1">Мята</option><option value="2">Ягодка</option><option value="3">Небо</option></select></label><label>Шапочка <select id="hat"><option value="0">Зелёная</option><option value="1">Лиловая</option><option value="2">Без шапки</option></select></label><label>Рюкзак <select id="bag"><option value="0">Бирюза</option><option value="1">Персик</option><option value="2">Лимон</option></select></label><p>Придумай имя героя. Оно остаётся только на устройстве.</p>');const name=document.querySelector<HTMLInputElement>('#character-name')!;name.value=a.state.name;name.oninput=()=>{a.state.name=name.value.slice(0,20);a.persist();};for(const key of ['outfit','hat','bag'] as const){const field=document.querySelector<HTMLSelectElement>(`#${key}`)!;field.value=String(a.state[key]);field.onchange=()=>{a.state[key]=Number(field.value);this.applyOutfit();a.persist();};}}
  applyOutfit(){const g=this.a.game,s=this.a.state;g.hero.coat.material=material(['#eeb55e','#8bc4a6','#c48db2','#8eb6d4'][s.outfit]);g.hero.arms.forEach(m=>m.material=g.hero.coat.material);g.hero.hat.visible=s.hat!==2;g.hero.hat.material=material(s.hat===1?'#b5a0d1':'#afc99f');g.hero.bag.material=material(['#7daba1','#e4aa91','#dbc67e'][s.bag]);}
  growHome(){const a=this.a,s=a.state,levels=['Кухня','Комната животных','Мастерская','Башня','Сад на крыше'];a.panel(`<h2>Дом становится больше</h2><p>${s.inventory.wood} палочек · ${s.inventory.stone} камней</p><button id="home-upgrade" class="card-button" ${s.homeLevel>=5?'disabled':''}>${levels[s.homeLevel]||'Дом полностью обустроен ✓'}<small>1 палочка + 1 камушек</small></button>${s.friends.map(id=>`<button data-friendhouse="${id}" class="card-button" ${s.buildings.includes(`friendhouse-${id}`)?'disabled':''}>Домик: ${names[id]}<small>${s.buildings.includes(`friendhouse-${id}`)?'Уже живёт на поляне':'1 палочка + 1 камушек'}</small></button>`).join('')}<p id="home-note">Постройки появятся на домашней поляне.</p>`);const pay=()=>{if(s.inventory.wood<1||s.inventory.stone<1){document.querySelector('#home-note')!.textContent='Нужна палочка и камушек. Собака поможет найти их в лесу.';return false;}s.inventory.wood--;s.inventory.stone--;return true;};document.querySelector<HTMLButtonElement>('#home-upgrade')!.onclick=()=>{if(s.homeLevel>=5||!pay())return;s.homeLevel++;this.refreshVillage();a.persist();this.growHome();};document.querySelectorAll<HTMLButtonElement>('[data-friendhouse]').forEach(b=>b.onclick=()=>{if(!pay())return;s.buildings.push(`friendhouse-${b.dataset.friendhouse}`);this.refreshVillage();a.persist();this.growHome();});}
  update(dt:number){
    const a=this.a,g=a.game,z=a.state.zone;this.decor.visible=!g.day;this.villageDecor.visible=g.day;g.friendlyBubul=a.state.friends.includes(0);
    a.companions.forEach((p,i)=>p.visible=g.day||a.state.helpers.includes(i===0?'dog':'cat'));
    this.special.g.visible=!g.day&&(z===2||z===3);this.sparkles.visible=!g.day&&a.state.helpers.includes('fireflies');
    const target=this.goal.clone().sub(g.position);this.sparkles.children.forEach((p,i)=>{const f=(i+1)/16;p.position.copy(g.position).addScaledVector(target,f);p.position.y=.35+Math.sin(g.time*2+i)*.12;});
    this.insects.clear();for(const [i,id] of ['beetle','spider'].entries())if(a.state.helpers.includes(id)){const body=orb(this.insects,id==='beetle'?'#c1ab65':'#a09dba',g.position.x+1.2+i*.4,.2,g.position.z+1.6,.18,.12,.25);body.rotation.y=g.time;}
    if(g.day)return;
    if(z===4){
      g.bubul.g.visible=false;a.enemy.g.visible=false;
      if(this.rock?.visible&&g.position.z< -2.4){g.position.z=-2.4;g.toast('Камень тяжёлый. Позови жука: Друзья → Жук → помочь.');}
      if(!this.bridge.visible&&g.position.z< -8.5){g.position.z=-8.5;g.toast('Дальше ручей. Паук сплетёт мостик!');}return;
    }
    if(a.state.found.includes(`gift-${z}`)&&!a.state.friends.includes(z)){
      // A carried gift is a peace offering: approaching for the conversation is safe.
      if(g.position.distanceTo(this.targetMonster().position)<5){if(z===0)g.friendlyBubul=true;a.enemyTimer=0;}
    }
    if(z<2)return;
    g.bubul.g.visible=false;a.enemy.g.visible=false;
    if(a.state.friends.includes(z)||a.state.found.includes(`gift-${z}`))return;
    const pet=this.special.g,p=pet.position,delta=g.position.clone().sub(p),moving=g.input.move().moving;
    if(z===2){this.awake=Math.sin(g.time*.8)>.15;pet.scale.y=this.awake?1:.8;if(this.awake&&moving&&!g.hidden&&delta.length()<12){p.addScaledVector(delta.normalize(),dt*4.8);pet.rotation.y=Math.atan2(delta.x,delta.z);}}
    else {
      this.smellTime+=dt;this.smellSafe=Math.max(0,this.smellSafe-dt);
      if(g.hidden||Math.hypot(g.position.x+3,g.position.z+5)<2.2||Math.hypot(g.position.x-4,g.position.z+9)<2){this.smell=[];this.smellSafe=4;}
      if(this.smellTime>.45){this.smellTime=0;if(moving&&this.smellSafe===0)this.smell.push(g.position.clone());if(this.smell.length>16)this.smell.shift();}
      const next=this.smell[0];if(next){const direction=next.clone().sub(p);direction.y=0;if(direction.length()<.6)this.smell.shift();else{p.addScaledVector(direction.normalize(),dt*3.7);pet.rotation.y=Math.atan2(direction.x,direction.z);}}
      this.trail.forEach((dot,i)=>{dot.visible=!!this.smell[i];if(this.smell[i]){dot.position.copy(this.smell[i]);dot.position.y=.08;}});
    }
    g.world.resolve(p);pet.rotation.z=Math.sin(g.time*6)*.04;
    if(!g.hidden&&g.catchTime===0&&p.distanceTo(g.position)<1.15){g.position.copy(g.checkpoint);g.catchTime=2;g.toast(`${names[z]} щекочет носом. Пуф! Ещё разок — все находки с тобой.`);this.smell=[];a.persist();}
  }
  hud(){
    const a=this.a,g=a.game,z=a.state.zone;document.querySelector('#friend-count')!.textContent=`${a.state.friends.length} / 4`;
    const label=document.querySelector<HTMLElement>('#story-marker')!,marker=document.querySelector<HTMLElement>('#special-marker')!;label.hidden=marker.hidden=true;
    if(g.day)return;
    if(z<4){
      const friend=a.state.friends.includes(z),carried=a.state.found.includes(`gift-${z}`);
      this.goal.copy(friend?new T.Vector3(0,0,10):carried?this.targetMonster().position:this.gift.position);
      if(!g.carrying&&g.delivered>0){document.querySelector('#chapter')!.textContent=`ИСТОРИЯ ${z+1} · ${names[z]}`;document.querySelector('#objective')!.textContent=friend?'Новый друг! Куда дальше?':carried?`Подари: ${stories[z].gift}`:stories[z].title;document.querySelector('#objective-hint')!.textContent=friend?'Открой карту ♧: тебя ждёт новая тропинка. Или возвращайся домой строить.':carried?'Подойди к другу и нажми ✋. С подарком он не станет тебя ловить.':stories[z].hint;}
      else if(g.carrying)this.goal.set(0,0,10);else this.goal.copy(g.world.flowers.find(f=>f.visible)!.position);
      const point=this.goal.clone().add(new T.Vector3(0,1.7,0)).project(g.camera);label.hidden=point.z>1||Math.abs(point.x)>.85||Math.abs(point.y)>.85;label.style.left=`${(point.x*.5+.5)*innerWidth}px`;label.style.top=`${(-point.y*.5+.5)*innerHeight}px`;label.textContent=g.carrying?'⌂ Домой':g.delivered===0?'✿ Цветок':friend?'⌂ Домой':carried?'♡ Подарить':'✦ Здесь подарок';
      if(z>=2){const p=this.special.g.position.clone().add(new T.Vector3(0,2.8,0)).project(g.camera);marker.hidden=p.z>1||Math.abs(p.x)>1;marker.style.left=`${(p.x*.5+.5)*innerWidth}px`;marker.style.top=`${(-p.y*.5+.5)*innerHeight}px`;marker.textContent=friend?'♡':z===2?(this.awake?'Замри!':'Сплю…'):this.smellSafe>0?'Потерял след':'Нюх-нюх';document.querySelector<HTMLElement>('#monster-marker')!.hidden=true;}
      if(z===0&&a.state.friends.includes(0))document.querySelector('#monster-marker')!.textContent='♡';
    }else{
      const done=a.state.buildings.includes('treehouse');this.goal.set(0,0,this.rock?.visible?-4:!this.bridge.visible?-9:-19);document.querySelector('#chapter')!.textContent='БОЛЬШАЯ МЕЧТА';document.querySelector('#objective')!.textContent=done?'Все друзья дома':this.rock?.visible?'Жук поможет с камнем':!this.bridge.visible?'Паук построит мост':'Построй дом на дереве';document.querySelector('#objective-hint')!.textContent=done?'Можно продолжать прогулки, украшать поляну и искать секреты.':'Собери команду через «Друзья». Подойди к препятствию и нажми ✋.';document.querySelector<HTMLElement>('#monster-marker')!.hidden=true;
    }
    const delta=this.goal.clone().sub(g.position);document.querySelector<HTMLElement>('#compass-arrow')!.style.transform=`rotate(${Math.atan2(delta.x,-delta.z)+g.yaw}rad)`;document.querySelector('#distance')!.textContent=`${Math.round(delta.length())} м`;
  }
}
