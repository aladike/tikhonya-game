import * as T from 'three';
const materials = new Map<string,T.MeshStandardMaterial>();
export function material(color: string, glow=0) {
  const key=color+glow;
  if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.9,flatShading:true,emissive:color,emissiveIntensity:glow}));
  return materials.get(key)!;
}
const sphereGeo = new T.IcosahedronGeometry(1,1);
const boxGeo = new T.BoxGeometry(1,1,1);
export function orb(parent:T.Object3D,color:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx,glow=0){
  const mesh=new T.Mesh(sphereGeo,material(color,glow));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
}
export function box(parent:T.Object3D,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){
  const mesh=new T.Mesh(boxGeo,material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function person(){
  const g=new T.Group();
  const coat=orb(g,'#eeb55e',0,.82,0,.43,.56,.29);
  orb(g,'#f6d5b0',0,1.55,0,.34,.35,.32);
  orb(g,'#653e39',0,1.77,-.04,.36,.2,.34);
  orb(g,'#653e39',-.27,1.49,-.11,.13,.29,.17);orb(g,'#653e39',.27,1.49,-.11,.13,.29,.17);
  orb(g,'#263d41',-.12,1.58,.288,.033);orb(g,'#263d41',.12,1.58,.288,.033);
  orb(g,'#e99078',-.22,1.47,.25,.065,.033,.022);orb(g,'#e99078',.22,1.47,.25,.065,.033,.022);
  const hat=orb(g,'#afc99f',0,1.93,-.015,.4,.19,.36);orb(hat,'#f9df80',0,1,0,.2);
  const bag=box(g,'#7daba1',0,.9,-.29,.43,.48,.22);
  const legs=[box(g,'#304e58',-.18,.26,0,.19,.5,.22),box(g,'#304e58',.18,.26,0,.19,.5,.22)];
  const arms=[orb(g,'#eeb55e',-.43,.8,.02,.13,.35,.14),orb(g,'#eeb55e',.43,.8,.02,.13,.35,.14)];
  return {g,coat,hat,bag,legs,arms};
}
export function monster(kind=0){
  const g=new T.Group();const color=['#ac9cd7','#e7aa78','#dba6bc','#8bb3a3'][kind];
  orb(g,color,0,.95,0,.88,1,.68);orb(g,color,-.65,1.65,0,.27,.45,.26);orb(g,color,.65,1.65,0,.27,.45,.26);
  orb(g,'#eddbc6',0,.85,.54,.56,.55,.21);
  for(const x of [-.3,.3]){orb(g,'#fff1d3',x,1.36,.55,.2,.22,.1);orb(g,'#39424f',x,1.37,.64,kind===0?.14:.085,kind===0?.04:.1,.045);}
  orb(g,'#eea2a0',0,1.08,.72,.18,.1,.1);orb(g,color,-.95,.8,0,.22,.45,.24);orb(g,color,.95,.8,0,.22,.45,.24);
  const legs=[orb(g,color,-.42,.18,.12,.3,.25,.37),orb(g,color,.42,.18,.12,.3,.25,.37)];
  return {g,legs};
}
export function home(parent:T.Object3D,x=0,z=14,color='#d9ac79'){
  const g=new T.Group();g.position.set(x,0,z);parent.add(g);
  box(g,color,0,1.5,0,4,3,3.6);
  const roof=new T.Mesh(new T.ConeGeometry(3.6,2,4),material('#6a9990'));roof.position.y=3.6;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  box(g,'#576f65',0,.9,-1.84,.95,1.8,.1);box(g,'#f8cd70',-1.23,1.7,-1.86,.72,.72,.12);box(g,'#f8cd70',1.23,1.7,-1.86,.72,.72,.12);
  box(g,'#a47762',1,4,0,.5,1.5,.5);return g;
}
export function flower(parent:T.Object3D,x:number,z:number,color='#a7f4e0'){
  const g=new T.Group();g.position.set(x,0,z);parent.add(g);
  box(g,'#6cb29c',0,.5,0,.055,1,.055);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;orb(g,color,Math.sin(a)*.22,1+Math.cos(a)*.19,0,.19,.2,.1,.65);}
  orb(g,'#f9dc84',0,1,0,.11,.11,.14,1);return g;
}
export function lantern(parent:T.Object3D,x:number,z:number){
  const g=new T.Group();g.position.set(x,0,z);parent.add(g);box(g,'#926b52',0,.75,0,.12,1.5,.12);box(g,'#ffe1a0',0,1.65,0,.35,.44,.35);
  const light=new T.PointLight('#ffcc7c',5,8,2);light.position.y=1.8;g.add(light);return g;
}
