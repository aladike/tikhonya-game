import * as T from 'three';
import type {Game} from './game';
import {box,orb,monster} from './models';
import {LocalStore,decode,type Save} from './save';
export const zoneNames=['Лунный лес','Серебряный ручей','Цветочный луг','Каменные холмы','Старое дерево'];
export const names=['Бубуль','Глазастик','Сонька','Нюхач'];
export class Adventure {
  state:Save;store=new LocalStore();zoneGroup=new T.Group();companions:T.Group[]=[];enemy=monster(1);beam:T.Mesh;
  items:{id:string;kind:'wood'|'stone'|'secret';mesh:T.Group}[]=[];
  enemyTarget=new T.Vector3(5,0,-7);enemyState='patrol';enemyTimer=0;dogTarget:T.Vector3|null=null;dogCommand='';catTimer=0;saveTimer=0;
  constructor(public game:Game,public panel:(html:string)=>void,public resume:()=>void){
    this.state=this.store.load();game.delivered=this.state.delivered;game.carrying=this.state.carrying;game.sound.music=this.state.music;game.sound.effects=this.state.effects;
    game.scene.add(this.zoneGroup,this.enemy.g);this.enemy.g.visible=false;
    this.beam=new T.Mesh(new T.CircleGeometry(7,32,-.45,.9),new T.MeshBasicMaterial({color:'#ffe2a0',transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}));this.beam.rotation.x=-Math.PI/2;this.beam.rotation.z=-Math.PI/2;this.beam.position.y=.09;this.enemy.g.add(this.beam);
    for(let i=0;i<2;i++){
      const g=new T.Group(),color=i===0?'#c69469':'#ded0b1';orb(g,color,0,.4,0,.28,.28,.5);orb(g,color,0,.72,.4,.29);orb(g,'#384c48',0,.7,.65,.07);
      for(const x of [-.19,.19]){orb(g,color,x,i===0?.83:1,.35,.1,i===0?.23:.16,.12);orb(g,'#263b38',x*.65,.78,.63,.03);}
      for(const x of [-.2,.2])for(const z of [-.28,.27])box(g,color,x,.18,z,.09,.35,.1);
      orb(g,color,0,.55,-.52,.08,.1,.35);g.position.set(i*2-1,0,7);game.scene.add(g);this.companions.push(g);
    }
    game.onEvent=e=>this.event(e);game.onUpdate=dt=>this.update(dt);game.onHud=()=>this.hud();game.onInteract=()=>this.interact();game.extraContext=()=>this.context();
    document.querySelector('.top-actions')!.insertAdjacentHTML('afterbegin','<button id="map" class="icon-button" aria-label="Карта леса">♧</button>');
    document.querySelector('.actions')!.insertAdjacentHTML('afterbegin','<button id="helpers" class="action small"><span>♧</span><small>Друзья</small><kbd>1–3</kbd></button>');
    document.querySelector('#map')!.addEventListener('click',()=>this.map());document.querySelector('#helpers')!.addEventListener('click',()=>this.helpers());
    this.changeZone(this.state.zone>1?0:this.state.zone,false);game.setDay(this.state.day);
    const oldSettings=document.querySelector('#settings')!;oldSettings.replaceWith(oldSettings.cloneNode(true));document.querySelector('#settings')!.addEventListener('click',()=>this.settings());
    if(this.state.delivered>0)document.querySelector('#play')!.textContent='Продолжить приключение';
    if(this.store.recovered)game.toast('Сохранение не удалось прочитать. Можно восстановить резервную копию в настройках.');
  }
  persist(){this.state.delivered=this.game.delivered;this.state.carrying=this.game.carrying;this.state.music=this.game.sound.music;this.state.effects=this.game.sound.effects;this.state.day=this.game.day;if(!this.store.save(this.state))this.game.toast('Не удалось сохранить на устройстве. Сделай резервную копию в настройках.');}
  event(e:string){if(e==='delivery'){this.state.inventory.flower++;this.state.inventory.wood+=3;this.state.inventory.stone+=2;this.discover('moonflower');}if(e==='flower')this.discover('moonflower');if(e==='caught')this.enemyTimer=0;if(e==='noise'&&this.game.lastNoise.distanceTo(this.enemy.g.position)<13){this.enemyTarget.copy(this.game.lastNoise);this.enemyState='investigate';this.enemyTimer=3;}if(e!=='noise')this.persist();}
  discover(id:string){if(!this.state.collection.includes(id))this.state.collection.push(id);}
  changeZone(zone:number,save=true){
    this.state.zone=zone;this.zoneGroup.clear();this.items=[];this.game.position.set(0,0,8);this.game.checkpoint.set(0,0,8);this.game.hidden=false;this.game.velocityY=0;this.game.yaw=0;
    this.game.bubul.g.visible=zone===0&&!this.game.day;this.enemy.g.visible=zone===1&&!this.game.day;this.enemy.g.position.set(zone===0?8:4,0,-10);
    if(zone===1){
      const water=box(this.zoneGroup,'#73aeb5',0,.04,-6,45,.08,4);water.material=new T.MeshStandardMaterial({color:'#76b5c2',metalness:.25,roughness:.25});
      for(let i=0;i<7;i++)box(this.zoneGroup,'#c1a77b',0,.16,-9+i,3,.17,.85);
      for(const x of [-2,2])box(this.zoneGroup,'#a58e66',x,.7,-6,.1,.1,7);
      this.discover('glazastik');
    }
    for(let i=0;i<8;i++){
      const kind=i===7?'secret':i%2===0?'wood':'stone',id=`z${zone}-${i}`;
      if(this.state.found.includes(id))continue;
      const g=new T.Group();g.position.set(i%2===0?-4:5,0,5-i*3);
      if(kind==='wood')box(g,'#d5ba88',0,.25,0,.8,.16,.16);else orb(g,kind==='secret'?'#f8d697':'#b9c7ba',0,.35,0,.3,.3,.3,kind==='secret'?.3:0);
      this.zoneGroup.add(g);this.items.push({id,kind,mesh:g});
    }
    document.querySelector('#zone-name')!.textContent=zoneNames[zone];this.game.toast(`${zoneNames[zone]} · ${zone===1?'Не попадай в свет Глазастика. Кусты укроют тебя!':'Бубуль слышит шум. Маленькие шаги — тихие.'}`);if(save)this.persist();
  }
  context(){if(this.game.hidden)return null;const item=this.items.find(i=>i.mesh.visible&&i.mesh.position.distanceTo(this.game.position)<1.8);return item?'Подобрать':null;}
  interact(){const item=this.items.find(i=>i.mesh.visible&&i.mesh.position.distanceTo(this.game.position)<1.8);if(!item||this.game.hidden)return false;this.collect(item);return true;}
  collect(item:typeof this.items[number]){item.mesh.visible=false;this.state.found.push(item.id);if(item.kind==='secret'){this.discover(`secret-${this.state.zone}`);this.game.toast('Секрет! Янтарная пуговка для Книги природы.');}else{this.state.inventory[item.kind]++;this.game.toast(item.kind==='wood'?'Палочка для будущего домика!':'Гладкий камушек в рюкзаке!');}this.game.sound.chime();this.persist();}
  map(){this.panel(`<span class="eyebrow">ТРОПИНКИ ПРИКЛЮЧЕНИЙ</span><h2>Карта леса</h2>${zoneNames.slice(0,2).map((n,i)=>`<button class="card-button" data-zone="${i}" ${i>0&&this.game.delivered===0?'disabled':''}>${i===0?'☾':'≈'} ${n}<small>${i===1&&this.game.delivered===0?'Принеси первый цветок, чтобы открыть ручей':'Прогуляться по тропинке →'}</small></button>`).join('')}`);document.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach(b=>b.onclick=()=>{this.changeZone(Number(b.dataset.zone));this.resume();});}
  helpers(){this.panel('<span class="eyebrow">ТЫ НЕ ОДНА</span><h2>Лесные помощники</h2><button class="card-button" data-command="fetch">🐕 Принеси<small>Собака подберёт ближайшую находку.</small></button><button class="card-button" data-command="bark">🐕 Гавкни там<small>Отвлечёт монстра в направлении камеры.</small></button><button class="card-button" data-command="scout">🐈 Разведай сверху<small>Кошка укажет, где монстр и секреты.</small></button>');document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b=>b.onclick=()=>{this.command(b.dataset.command!);this.resume();});}
  command(command:string){
    const g=this.game;
    if(command==='fetch'){const item=this.items.filter(i=>i.mesh.visible).sort((a,b)=>a.mesh.position.distanceTo(g.position)-b.mesh.position.distanceTo(g.position))[0];if(item){this.dogTarget=item.mesh.position.clone();this.dogCommand=item.id;g.toast('Собака: уже бегу!');}else g.toast('Здесь всё найдено. Хороший пёс!');}
    if(command==='bark'){this.dogTarget=g.position.clone().add(new T.Vector3(-Math.sin(g.yaw)*8,0,-Math.cos(g.yaw)*8));this.dogCommand='bark';}
    if(command==='scout'){this.catTimer=8;g.toast(`Кошка разведала: ${names[this.state.zone===0?0:1]} ${Math.round(g.position.distanceTo(this.state.zone===0?g.bubul.g.position:this.enemy.g.position))} м от тебя. Секреты — возле камушков!`);this.discover('cat');}
    this.discover('dog');this.persist();
  }
  update(dt:number){
    const g=this.game;
    if(g.input.take('Digit1'))this.command('fetch');if(g.input.take('Digit2'))this.command('bark');if(g.input.take('Digit3'))this.command('scout');
    this.saveTimer+=dt;if(this.saveTimer>20){this.saveTimer=0;this.persist();}
    this.catTimer=Math.max(0,this.catTimer-dt);
    if(!g.day)this.companions.forEach((pet,i)=>{
      const target=i===0&&this.dogTarget?this.dogTarget:g.position.clone().add(new T.Vector3(i===0?-1.2:1.2,0,1.4));const delta=target.clone().sub(pet.position);delta.y=0;
      if(delta.length()>.5){pet.position.addScaledVector(delta.normalize(),dt*4.6);pet.rotation.y=Math.atan2(delta.x,delta.z);}pet.position.y=i===1&&this.catTimer>0?2+Math.sin(g.time)*.1:Math.abs(Math.sin(g.time*8+i))*.05;
      if(i===0&&this.dogTarget&&pet.position.distanceTo(this.dogTarget)<.8){if(this.dogCommand==='bark'){g.noise(this.dogTarget,10);g.sound.tone(240,.2,.15);}else{const item=this.items.find(x=>x.id===this.dogCommand);if(item&&item.mesh.visible)this.collect(item);}this.dogTarget=null;}
    });
    if(this.state.zone<=1&&!g.day){
      this.enemy.g.visible=true;g.bubul.g.visible=this.state.zone===0;this.enemyTimer=Math.max(0,this.enemyTimer-dt);
      const p=this.enemy.g.position;const delta=g.position.clone().sub(p);const angle=Math.atan2(delta.x,delta.z);const turn=Math.atan2(Math.sin(angle-this.enemy.g.rotation.y),Math.cos(angle-this.enemy.g.rotation.y));
      if(!g.hidden&&delta.length()<8&&Math.abs(turn)<.45){this.enemyTimer=4;this.enemyState='chase';}
      if(this.enemyTimer>0&&!g.hidden){const direction=this.enemyState==='investigate'?this.enemyTarget.clone().sub(p).normalize():delta.normalize();p.addScaledVector(direction,dt*(this.enemyState==='investigate'?2:4.2));this.enemy.g.rotation.y+=T.MathUtils.clamp(turn,-dt*2,dt*2);}else{this.enemyState='patrol';this.enemy.g.rotation.y+=dt*.4;p.x=(this.state.zone===0?9:4)+Math.sin(g.time*.15)*3;}
      if(!g.hidden&&g.catchTime===0&&p.distanceTo(g.position)<1.1){g.position.copy(g.checkpoint);g.catchTime=2;g.toast('Глазастик обнял тебя. Пуф! Все находки остались с тобой.');this.enemyTimer=0;this.persist();}
      this.beam.visible=true;
    }else this.enemy.g.visible=false;
  }
  hud(){
    document.querySelector('#zone-name')!.textContent=zoneNames[this.state.zone];
    if(!this.game.carrying){document.querySelector('#chapter')!.textContent='ПОДАРОК ДЛЯ ЩЕНКА · 1 / 3';document.querySelector('#objective-hint')!.textContent='Щенку нужен ночник. Иди к светящемуся цветку → нажми ✋ → вернись домой. C — тихий шаг, Q — отвлечь.';}
    const enemyMarker=document.querySelector<HTMLElement>('#enemy-marker')!;enemyMarker.hidden=true;
    if(this.enemy.g.visible&&!this.game.day){const marker=enemyMarker,p=this.enemy.g.position.clone().add(new T.Vector3(0,2.9,0)).project(this.game.camera);marker.hidden=p.z>1||Math.abs(p.x)>1;marker.style.left=`${(p.x*.5+.5)*innerWidth}px`;marker.style.top=`${(-p.y*.5+.5)*innerHeight}px`;marker.textContent=this.enemyState==='chase'?'!':this.enemyState==='investigate'?'?':'☀';}
  }
  settings(){
    const g=this.game;this.panel(`<h2>Настройки</h2><label>Музыка <input id="music" type="range" min="0" max="1" step=".05" value="${g.sound.music}"></label><label>Звуки леса <input id="effects" type="range" min="0" max="1" step=".05" value="${g.sound.effects}"></label><h3>Резервная копия</h3><p>Прогресс хранится только здесь. Сохрани файл, чтобы перенести приключение на другое устройство.</p><div class="panel-buttons"><button id="export-save">Сохранить файл</button><button id="import-save">Загрузить файл</button><input id="save-file" class="file-input" type="file" accept=".json,application/json"></div><p class="save-note" id="save-status">Никакие игровые данные не отправляются в интернет.</p>`);
    for(const key of ['music','effects'] as const)document.querySelector<HTMLInputElement>(`#${key}`)!.oninput=e=>{g.sound[key]=Number((e.target as HTMLInputElement).value);this.persist();};
    document.querySelector<HTMLButtonElement>('#export-save')!.onclick=()=>{this.persist();const url=URL.createObjectURL(new Blob([JSON.stringify(this.state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='tikhonya-adventure.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);document.querySelector('#save-status')!.textContent='Резервная копия готова. Сохрани файл в «Файлы».';};
    const input=document.querySelector<HTMLInputElement>('#save-file')!;document.querySelector<HTMLButtonElement>('#import-save')!.onclick=()=>input.click();
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('size');const state=decode(await file.text());if(!this.store.save(state))throw new Error('storage');location.reload();}catch{document.querySelector('#save-status')!.textContent='Не удалось загрузить копию. Проверь файл; текущее приключение сохранено.';}};
  }
}
