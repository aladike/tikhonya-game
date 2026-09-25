import * as T from 'three';
import type {Adventure} from './adventure';
import {box,orb,home,flower,material} from './models';
export const recipes=[
  {id:'doghouse',name:'Домик с ночником',icon:'⌂',cost:{wood:3,stone:2,flower:1},x:-5,z:10,description:'Щенок свернётся клубочком в своей кроватке.'},
  {id:'catbed',name:'Кошачья подушка',icon:'☁',cost:{wood:1,stone:0,flower:0},x:5,z:10,description:'Место для сладкого кошачьего сна.'},
  {id:'bowl',name:'Миска у ручья',icon:'◡',cost:{wood:0,stone:2,flower:0},x:-8,z:6,description:'Друзья будут приходить попить.'},
  {id:'ball',name:'Площадка с мячиком',icon:'●',cost:{wood:1,stone:0,flower:0},x:8,z:6,description:'Щенок обожает догонять мяч!'},
  {id:'garden',name:'Светящийся сад',icon:'✿',cost:{wood:0,stone:1,flower:1},x:-10,z:12,description:'Цветы и светлячки у дома.'},
];
export class Village {
  group=new T.Group();buildingGroup=new T.Group();selected=-1;slots:T.Mesh[]=[];ball?:T.Mesh;activity=0;
  constructor(public adventure:Adventure){
    const a=adventure,g=a.game;g.scene.add(this.group);this.group.add(this.buildingGroup);
    recipes.forEach(r=>{const ring=new T.Mesh(new T.RingGeometry(1.25,1.36,32),new T.MeshBasicMaterial({color:'#f7dc97',transparent:true,opacity:.5,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(r.x,.06,r.z);this.group.add(ring);this.slots.push(ring);});
    const update=g.onUpdate,event=g.onEvent,hud=g.onHud,interact=g.onInteract,context=g.extraContext;
    g.onUpdate=dt=>{update(dt);this.update(dt);};g.onEvent=e=>{event(e);if(e==='delivery')this.returnHome();};g.onHud=()=>{hud();this.hud();};g.onInteract=()=>this.interact()||interact();g.extraContext=()=>this.context()||context();
    document.querySelector('.top-actions')!.insertAdjacentHTML('afterbegin','<button id="village" class="icon-button" aria-label="Дом и постройки">⌂</button>');
    document.querySelector('#village')!.addEventListener('click',()=>this.menu());
    this.rebuild();if(a.state.day)this.returnHome(false);else this.group.visible=false;
  }
  returnHome(notify=true){const a=this.adventure,g=a.game;g.setDay(true);a.changeZone(0,false);g.setDay(true);g.position.set(0,0,8);this.group.visible=true;this.rebuild();a.persist();if(notify)g.toast('Вот это смелость! Рассвет. Цветок станет ночником щенка. Нажми ⌂ и выбери домик.');}
  leave(zone=0){const a=this.adventure;this.selected=-1;a.game.setDay(false);a.changeZone(zone);this.group.visible=false;a.game.toast('Вечер наступил по твоему желанию. Друзья идут с тобой!');a.persist();}
  menu(){
    const a=this.adventure,g=a.game,s=a.state;
    if(!g.day){a.panel('<span class="eyebrow">ДОМА ТЕБЯ ЖДУТ</span><h2>Тёплая поляна</h2><p>Можно вернуться в любое время. Найденное останется в рюкзаке.</p><button id="return-home" class="cta">Вернуться домой</button>');document.querySelector<HTMLButtonElement>('#return-home')!.onclick=()=>{this.returnHome(false);a.resume();};return;}
    a.panel(`<span class="eyebrow">ПОЛЯНА ДРУЗЕЙ</span><h2>Построим что-нибудь?</h2><p class="badge">⌁ ${s.inventory.wood} палочек · ◆ ${s.inventory.stone} камней · ✿ ${s.inventory.flower} цветов</p>${recipes.map((r,i)=>`<button class="card-button" data-recipe="${i}">${r.icon} ${r.name}${s.buildings.includes(r.id)?' ✓':''}<small>${s.buildings.includes(r.id)?'Изменить цвет и украшения':`${r.cost.wood} ⌁ · ${r.cost.stone} ◆ · ${r.cost.flower} ✿ — ${r.description}`}</small></button>`).join('')}<button id="night-request" class="cta">☾ Просьба друга · в лес</button>`);
    document.querySelectorAll<HTMLButtonElement>('[data-recipe]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.recipe),r=recipes[i];if(s.buildings.includes(r.id)){this.decorate(r.id);return;}if(!this.canBuild(i)){document.querySelector('.badge')!.textContent='Нужны ещё материалы. В лесу их подберёт собака (1).';return;}this.selected=i;g.toast('Выбрано! Подойди к светящемуся кругу и нажми ✋, чтобы поставить домик.');a.resume();});
    document.querySelector<HTMLButtonElement>('#night-request')!.onclick=()=>this.request();
  }
  canBuild(i:number){const cost=recipes[i].cost,s=this.adventure.state.inventory;return s.wood>=cost.wood&&s.stone>=cost.stone&&s.flower>=cost.flower;}
  build(i:number){const a=this.adventure,r=recipes[i];if(a.state.buildings.includes(r.id)||!this.canBuild(i))return false;for(const key of ['wood','stone','flower'] as const)a.state.inventory[key]-=r.cost[key];a.state.buildings.push(r.id);this.selected=-1;this.rebuild();a.persist();a.game.sound.chime();a.game.toast(`${r.name} готов! Смотри: друзья уже обживают поляну.`);return true;}
  decorate(id:string){const a=this.adventure;a.panel('<h2>Украсим домик</h2><p>Цвет крыши и подушки</p><div class="panel-buttons"><button data-color="0">Мята</button><button data-color="1">Персик</button><button data-color="2">Лаванда</button></div>');document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{a.state.found=a.state.found.filter(x=>!x.startsWith(`color-${id}-`));a.state.found.push(`color-${id}-${b.dataset.color}`);this.rebuild();a.persist();a.resume();});}
  request(){const a=this.adventure;const built=a.state.buildings.includes('doghouse');a.panel(`<span class="eyebrow">ПРОСЬБА ДРУГА</span><h2>${built?'Кошке хочется приключений':'Щенок мечтает о ночнике'}</h2><p>${built?'«У ручья потерялась янтарная пуговка. Найдём её? Заодно соберём материалы для поляны!»':'«Можно лунный цветок? С ним будет так уютно засыпать!»'}</p><button id="accept-request" class="cta">Берём друзей и идём!</button>`);document.querySelector<HTMLButtonElement>('#accept-request')!.onclick=()=>{this.leave(built?1:0);a.resume();};}
  context(){const g=this.adventure.game;if(!g.day||g.hidden)return null;if(this.selected>=0){const r=recipes[this.selected];if(Math.hypot(g.position.x-r.x,g.position.z-r.z)<2.3)return 'Поставить';}if(Math.hypot(g.position.x,g.position.z-10)<2.7)return 'У дома';if(this.adventure.companions.some(p=>p.position.distanceTo(g.position)<1.7))return 'Погладить';return null;}
  interact(){const g=this.adventure.game;if(!g.day||g.hidden)return false;const context=this.context();if(context==='Поставить'){this.build(this.selected);return true;}if(context==='У дома'){this.menu();return true;}if(context==='Погладить'){g.sound.chime();g.toast('Мур-р! Как хорошо, что ты рядом.');return true;}return false;}
  rebuild(){
    this.buildingGroup.clear();this.ball=undefined;const s=this.adventure.state;
    recipes.forEach((r,i)=>{const built=s.buildings.includes(r.id);this.slots[i].visible=!built;if(!built)return;const group=new T.Group();group.position.set(r.x,0,r.z);this.buildingGroup.add(group);const saved=s.found.find(x=>x.startsWith(`color-${r.id}-`));const color=['#85b6a0','#edb19a','#b7a6d7'][Number(saved?.slice(-1)||0)];
      if(i===0){const h=home(group,0,0,color);h.scale.setScalar(.44);orb(group,'#f9d99a',.5,1.1,-.9,.13,.15,.13,1);orb(group,color,0,.15,-.5,.65,.12,.55);}
      if(i===1){box(group,'#9b7c62',0,.2,0,1.8,.3,1.5);orb(group,color,0,.45,0,.8,.22,.65);}
      if(i===2){const bowl=new T.Mesh(new T.TorusGeometry(.5,.13,6,16),material(color));bowl.rotation.x=Math.PI/2;bowl.position.y=.2;group.add(bowl);orb(group,'#89c5d2',0,.16,0,.45,.04,.45);}
      if(i===3){this.ball=orb(group,color,0,.35,0,.36);for(const x of [-1,1])box(group,'#bca27b',x,.2,0,.1,.4,2);}
      if(i===4)for(let j=0;j<5;j++)flower(group,Math.sin(j*1.26),Math.cos(j*1.26));
    });
  }
  update(dt:number){
    const g=this.adventure.game;this.group.visible=g.day;if(!g.day)return;this.activity+=dt;
    this.slots.forEach((slot,i)=>{(slot.material as T.MeshBasicMaterial).opacity=this.selected===i?.65+Math.sin(g.time*4)*.3:.18;slot.scale.setScalar(this.selected===i?1.15:1);});
    this.adventure.companions.forEach((pet,i)=>{
      const s=this.adventure.state,phase=Math.floor(this.activity/7)%3;
      let target:T.Vector3|undefined;
      if(phase===1&&s.buildings.includes('bowl'))target=new T.Vector3(-8,0,6);
      else if(i===0&&phase===2&&s.buildings.includes('ball'))target=new T.Vector3(8+Math.sin(g.time*1.6),0,6+Math.cos(g.time*1.6));
      else if(s.buildings.includes(i===0?'doghouse':'catbed'))target=new T.Vector3(i===0?-5:5,.25,10);
      if(target){pet.position.lerp(target,Math.min(1,dt*4));pet.rotation.y=Math.atan2(target.x-pet.position.x,target.z-pet.position.z);pet.rotation.z=phase===0?.3:0;pet.scale.y=phase===0?.72:1;}
    });
    if(this.ball){this.ball.position.x=Math.sin(g.time*1.6);this.ball.position.z=Math.cos(g.time*1.6);this.ball.position.y=.35+Math.abs(Math.sin(g.time*3))*.15;}
  }
  hud(){const g=this.adventure.game;if(!g.day)return;document.querySelector('#zone-name')!.textContent='Домашняя поляна';document.querySelector('#chapter')!.textContent='ТЁПЛОЕ УТРО';document.querySelector('#objective')!.textContent=this.selected>=0?'Поставь в светящийся круг':this.adventure.state.buildings.length?'Дом для друзей':'Построй домик щенку';document.querySelector('#objective-hint')!.textContent=this.selected>=0?'Подойди к выделенному месту и нажми ✋.':this.adventure.state.buildings.length?'Погладь друзей, укрась домики. Ночь начнётся, когда ты захочешь: ⌂ → просьба друга.':'Нажми ⌂ наверху. Выбери домик, подойди к кругу и поставь его кнопкой ✋.';document.querySelector<HTMLElement>('#monster-marker')!.hidden=true;document.querySelector<HTMLElement>('#enemy-marker')!.hidden=true;
    if(this.selected>=0){const r=recipes[this.selected],delta=new T.Vector3(r.x,0,r.z).sub(g.position);document.querySelector<HTMLElement>('#compass-arrow')!.style.transform=`rotate(${Math.atan2(delta.x,-delta.z)+g.yaw}rad)`;document.querySelector('#distance')!.textContent=`${Math.round(delta.length())} м`;}
  }
}
