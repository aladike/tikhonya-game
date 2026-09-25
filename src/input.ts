export class Input {
  keys = new Set<string>();
  x = 0; y = 0; yaw = 0; pitch = 0; touchPower = 0;
  actions = new Set<string>();
  private stickId = -1;
  private lookId = -1;
  private origin = {x: 0, y: 0};
  private last = {x: 0, y: 0};
  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.actions.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
      if (e.pointerType !== 'mouse' && e.clientX < innerWidth / 2 && this.stickId === -1) {
        this.stickId = e.pointerId; this.origin = {x:e.clientX,y:e.clientY};
        const stick = document.querySelector<HTMLElement>('#stick')!;
        stick.hidden = false; stick.style.left = `${e.clientX}px`; stick.style.top = `${e.clientY}px`;
      } else {
        this.lookId = e.pointerId; this.last = {x:e.clientX,y:e.clientY};
        if (e.pointerType === 'mouse' && document.pointerLockElement === canvas) this.actions.add('KeyQ');
      }
    });
    canvas.addEventListener('dblclick', () => { try { void canvas.requestPointerLock?.(); } catch { /* drag camera stays available */ } });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId === this.stickId) {
        const dx = e.clientX-this.origin.x, dy=e.clientY-this.origin.y;
        const length=Math.hypot(dx,dy); this.touchPower=Math.min(1,length/65);
        this.x=length ? dx/length*this.touchPower : 0; this.y=length ? dy/length*this.touchPower : 0;
        document.querySelector<HTMLElement>('#stick span')!.style.transform=`translate(${this.x*40}px,${this.y*40}px)`;
      } else if (e.pointerId === this.lookId || document.pointerLockElement === canvas) {
        const locked=document.pointerLockElement === canvas;
        this.yaw -= (locked ? e.movementX : e.clientX-this.last.x)*.005;
        this.pitch += (locked ? e.movementY : e.clientY-this.last.y)*.003;
        this.last={x:e.clientX,y:e.clientY};
      }
    });
    const end=(e: PointerEvent) => {
      if(e.pointerId===this.stickId){this.stickId=-1;this.x=this.y=this.touchPower=0;document.querySelector<HTMLElement>('#stick')!.hidden=true;}
      if(e.pointerId===this.lookId)this.lookId=-1;
    };
    canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end);
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-key]')) button.addEventListener('pointerdown', e => {e.preventDefault();this.actions.add(button.dataset.key!);});
  }
  clear(){this.keys.clear();this.actions.clear();this.x=this.y=this.touchPower=0;this.stickId=this.lookId=-1;const stick=document.querySelector<HTMLElement>('#stick');if(stick)stick.hidden=true;}
  take(key: string){ const has=this.actions.has(key);this.actions.delete(key);return has; }
  move(){
    let x=this.x+Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
    let y=this.y+Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'));
    const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}
    const quiet=this.keys.has('KeyC')||this.keys.has('ControlLeft')||(this.touchPower>0&&this.touchPower<.4);
    const run=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')||this.touchPower>.82;
    return {x,y,quiet,run,moving:len>.08};
  }
}
