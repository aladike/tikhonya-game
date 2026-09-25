export interface Save {
  version:2; delivered:number; carrying:boolean; zone:number; day:boolean;
  inventory:{wood:number;stone:number;flower:number}; found:string[]; buildings:string[]; friends:number[]; collection:string[];
  name:string; outfit:number; hat:number; bag:number; homeLevel:number; helpers:string[];
  music:number; effects:number; quality:'auto'|'low'|'high';
}
export const fresh=():Save=>({version:2,delivered:0,carrying:false,zone:0,day:false,inventory:{wood:0,stone:0,flower:0},found:[],buildings:[],friends:[],collection:['hero','bubul'],name:'Тихоня',outfit:0,hat:0,bag:0,homeLevel:0,helpers:['dog','cat'],music:.35,effects:.6,quality:'auto'});
const number=(v:unknown,max=9999)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const strings=(v:unknown)=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&/^[a-z0-9_-]{1,60}$/.test(x)))].slice(0,500):[];
export function decode(raw:string):Save {
  if(raw.length>100000)throw new Error('size');
  const v:unknown=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('format');
  const d=v as Record<string,unknown>;if(d.version!==1&&d.version!==2)throw new Error('version');
  const state=fresh(),inv=d.inventory&&typeof d.inventory==='object'?d.inventory as Record<string,unknown>:{};
  state.delivered=number(d.delivered);state.carrying=d.carrying===true;state.zone=number(d.zone,4);state.day=d.day===true;
  state.inventory={wood:number(inv.wood),stone:number(inv.stone),flower:number(inv.flower)};
  state.found=strings(d.found);state.buildings=strings(d.buildings);state.collection=strings(d.collection);state.helpers=strings(d.helpers).filter(x=>['dog','cat','fireflies','beetle','spider'].includes(x)).slice(0,3);
  state.friends=Array.isArray(d.friends)?[...new Set(d.friends.filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<4))]:[];
  state.name=typeof d.name==='string'?[...d.name].filter(c=>c.charCodeAt(0)>=32&&c!=='<'&&c!=='>').join('').slice(0,20)||'Тихоня':'Тихоня';
  state.outfit=number(d.outfit,3);state.hat=number(d.hat,2);state.bag=number(d.bag,2);state.homeLevel=number(d.homeLevel,5);
  for(const key of ['music','effects'] as const)if(typeof d[key]==='number')state[key]=Math.max(0,Math.min(1,d[key] as number));
  if(d.quality==='high'||d.quality==='low')state.quality=d.quality;
  return state;
}
export interface SaveStore {load():Save;save(state:Save):boolean}
const STORAGE_SLOT='tikhonya-save-v2';
export class LocalStore implements SaveStore {
  recovered=false;
  load(){try{const raw=localStorage.getItem(STORAGE_SLOT)||localStorage.getItem('tikhonya-save-v1');if(raw)return decode(raw);}catch{this.recovered=true;}return fresh();}
  save(state:Save){try{localStorage.setItem(STORAGE_SLOT,JSON.stringify(state));return true;}catch{return false;}}
}
