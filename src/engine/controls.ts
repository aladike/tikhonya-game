import { lookDelta } from "./look";
export class Controls {
  keys = new Set<string>();
  actions = new Set<string>();
  x = 0;
  y = 0;
  power = 0;
  yaw = 0;
  pitch = 0;
  breaking = false;
  screen: { x: number; y: number } | null = null;
  touchMode = false;
  touchSensitivity = 1;
  mouseSensitivity = 1;
  pendingYaw = 0;
  pendingPitch = 0;
  private stick = -1;
  private look = -1;
  private origin = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private downAt = 0;
  private moved = false;
  private held = false;
  onPlace = () => {};
  onSelect = (_slot: number) => {};
  onWheel = (_delta: number) => {};
  constructor(public canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (["Space", "F5", "ControlLeft", "Tab"].includes(e.code))
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.actions.add(e.code);
      if (/^Digit[1-9]$/.test(e.code))
        this.onSelect(Number(e.code.slice(-1)) - 1);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.onWheel(Math.sign(e.deltaY));
      },
      { passive: false },
    );
    canvas.addEventListener("pointerdown", (e) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* Synthetic accessibility events may not own a pointer. */
      }
      this.touchMode = e.pointerType !== "mouse";
      if (!this.touchMode) {
        if (e.button === 0) {
          this.breaking = true;
          void canvas.requestPointerLock?.()?.catch(() => {});
        }
        if (e.button === 2) this.onPlace();
        return;
      }
      if (e.clientX < innerWidth * 0.42 && this.stick < 0) {
        this.stick = e.pointerId;
        this.origin = { x: e.clientX, y: e.clientY };
        const stick = document.querySelector<HTMLElement>("#stick")!;
        stick.hidden = false;
        stick.style.left = e.clientX + "px";
        stick.style.top = e.clientY + "px";
      } else if (this.look < 0) {
        this.look = e.pointerId;
        this.last = { x: e.clientX, y: e.clientY };
        this.screen = { ...this.last };
        this.downAt = performance.now();
        this.moved = false;
        this.held = false;
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.stick) {
        const dx = e.clientX - this.origin.x,
          dy = e.clientY - this.origin.y,
          len = Math.hypot(dx, dy);
        this.power = Math.min(1, len / 62);
        this.x = len ? (dx / len) * this.power : 0;
        this.y = len ? (dy / len) * this.power : 0;
        document.querySelector<HTMLElement>("#stick i")!.style.transform =
          `translate(${this.x * 36}px,${this.y * 36}px)`;
      } else if (
        e.pointerId === this.look ||
        document.pointerLockElement === canvas
      ) {
        const locked = document.pointerLockElement === canvas,
          dx = locked ? e.movementX : e.clientX - this.last.x,
          dy = locked ? e.movementY : e.clientY - this.last.y;
        if (
          !locked &&
          Math.hypot(e.clientX - this.screen!.x, e.clientY - this.screen!.y) > 9
        ) {
          this.moved = true;
          this.breaking = false;
        }
        if (locked || this.moved) {
          const delta = lookDelta(
            dx,
            dy,
            !locked,
            locked ? this.mouseSensitivity : this.touchSensitivity,
            Math.min(innerWidth, innerHeight),
          );
          if (locked) {
            this.yaw += delta.yaw;
            this.pitch += delta.pitch;
          } else {
            this.pendingYaw += delta.yaw;
            this.pendingPitch += delta.pitch;
          }
        }
        this.last = { x: e.clientX, y: e.clientY };
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        this.breaking = false;
        return;
      }
      if (e.pointerId === this.stick) {
        this.stick = -1;
        this.x = this.y = this.power = 0;
        document.querySelector<HTMLElement>("#stick")!.hidden = true;
      }
      if (e.pointerId === this.look) {
        if (!this.moved && !this.held && e.type === "pointerup") this.onPlace();
        this.look = -1;
        this.breaking = false;
        this.screen = null;
      }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }
  update(dt = 1 / 60) {
    const blend = 1 - Math.exp(-50 * dt);
    this.yaw += this.pendingYaw * blend;
    this.pitch += this.pendingPitch * blend;
    this.pendingYaw *= 1 - blend;
    this.pendingPitch *= 1 - blend;
    if (
      this.look >= 0 &&
      !this.moved &&
      performance.now() - this.downAt > 340
    ) {
      this.held = true;
      this.breaking = true;
    }
  }
  take(key: string) {
    const has = this.actions.has(key);
    this.actions.delete(key);
    return has;
  }
  clear() {
    this.keys.clear();
    this.actions.clear();
    this.breaking = false;
    this.x = this.y = this.power = this.yaw = this.pitch = 0;
    this.pendingYaw = this.pendingPitch = 0;
    this.look = this.stick = -1;
    this.screen = null;
    document.querySelector<HTMLElement>("#stick")?.setAttribute("hidden", "");
  }
  move() {
    let x =
        this.x +
        Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
      y =
        this.y +
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return {
      x,
      y,
      moving: len > 0.08,
      run: this.keys.has("ShiftLeft") || this.power > 0.82,
      quiet:
        this.keys.has("KeyC") ||
        this.keys.has("ControlLeft") ||
        (this.power > 0 && this.power < 0.4),
    };
  }
}
