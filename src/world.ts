import * as T from 'three';
import {box,orb,material,home,flower,lantern} from './models';
export interface Obstacle {x:number;z:number;r:number}
export class World {
  group=new T.Group(); obstacles:Obstacle[]=[]; bushes:T.Vector3[]=[]; cameraObjects:T.Object3D[]=[];
  flowers:T.Group[]=[]; lanterns=[new T.Vector3(0,0,9),new T.Vector3(-5,0,-4)];
  fireflies:T.Points; house:T.Group;
  constructor(scene:T.Scene){
    scene.add(this.group);
    const ground=new T.Mesh(new T.CircleGeometry(34,64),material('#435e51'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;this.group.add(ground);
    const rim=new T.Mesh(new T.CylinderGeometry(34,32,2.5,64),material('#394b46'));rim.position.y=-1.3;this.group.add(rim);
    for(let i=0;i<28;i++){const z=14-i*1.1;orb(this.group,'#7f8064',Math.sin(i*.23)*1.4,-.06,z,2.2,.065,.85);}
    this.house=home(this.group);this.cameraObjects.push(...this.house.children);this.obstacles.push({x:0,z:14,r:2.5});
    for(const p of this.lanterns)lantern(this.group,p.x+1.6,p.z);
    let seed=817;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const trees: {x:number;z:number;s:number}[]=[];
    for(let i=0;i<140;i++){
      const a=random()*Math.PI*2,r=6+random()*26,x=Math.sin(a)*r,z=Math.cos(a)*r;
      if((Math.abs(x)<4&&z<17&&z>-20)||(Math.hypot(x,z-14)<5))continue;
      const s=.8+random()*.7;trees.push({x,z,s});this.obstacles.push({x,z,r:.48*s});
    }
    const trunk=new T.InstancedMesh(new T.CylinderGeometry(.2,.35,3,5),material('#7d6a5a'),trees.length);
    const leaves=new T.InstancedMesh(new T.ConeGeometry(2,4,7),material('#527d69'),trees.length);
    const tops=new T.InstancedMesh(new T.ConeGeometry(1.45,3,7),material('#70967a'),trees.length);
    const dummy=new T.Object3D();
    trees.forEach((t,i)=>{dummy.position.set(t.x,1.5*t.s,t.z);dummy.scale.setScalar(t.s);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);dummy.position.y=3.9*t.s;dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);dummy.position.y=5.4*t.s;dummy.updateMatrix();tops.setMatrixAt(i,dummy.matrix);});
    for(const mesh of [trunk,leaves,tops]){mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);this.cameraObjects.push(mesh);}
    for(const [x,z] of [[-2,5],[2,0],[-3,-7],[3,-12],[-6,-15],[7,4]]){
      this.bushes.push(new T.Vector3(x,0,z));for(let i=0;i<4;i++)orb(this.group,'#719979',x+(i%2)*.6-.3,.48,z+Math.floor(i/2)*.5,.8,.65,.75);
    }
    for(let i=0;i<34;i++){const a=random()*6.28,r=5+random()*23;const x=Math.sin(a)*r,z=Math.cos(a)*r;orb(this.group,'#92a59a',x,.25,z,.3+random()*.5,.4,.45);}
    const grass=new T.InstancedMesh(new T.ConeGeometry(.12,.45,3),material('#83a078'),400);
    for(let i=0;i<400;i++){const a=random()*6.28,r=3+random()*29;dummy.position.set(Math.sin(a)*r,.15,Math.cos(a)*r);dummy.scale.setScalar(.5+random());dummy.rotation.y=random()*6.28;dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}this.group.add(grass);
    for(const [x,z] of [[0,-17],[-7,-12],[6,-9]])this.flowers.push(flower(this.group,x,z));
    const pos=new Float32Array(80*3);for(let i=0;i<80;i++){pos[i*3]=(random()-.5)*45;pos[i*3+1]=.7+random()*3;pos[i*3+2]=(random()-.5)*45;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));this.fireflies=new T.Points(geo,new T.PointsMaterial({color:'#fff5a7',size:.105,transparent:true,opacity:.8}));this.group.add(this.fireflies);
    // A friendly moon hangs beyond the small forest.
    orb(this.group,'#fff2ca',-18,22,-27,2.4,2.4,2.4,.8);
    for(const [x,z] of [[-9,3],[7,-15],[-10,-8]]){box(this.group,'#806a52',x,.07,z,1.4,.14,.13);}
  }
  resolve(position:T.Vector3){
    const len=Math.hypot(position.x,position.z);if(len>30){position.x*=30/len;position.z*=30/len;}
    for(const o of this.obstacles){const dx=position.x-o.x,dz=position.z-o.z,d=Math.hypot(dx,dz),r=o.r+.36;if(d<r&&d>.001){position.x=o.x+dx/d*r;position.z=o.z+dz/d*r;}}
  }
}
