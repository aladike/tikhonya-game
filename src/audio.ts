export class Sound {
  context?: AudioContext;
  music = 0.35;
  effects = 0.6;
  private timer = 0;
  private note = 0;
  async start() {
    this.context ??= new AudioContext();
    await this.context.resume();
  }
  tone(frequency: number, length = 0.2, volume = 0.15, music = false) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(
      volume * (music ? this.music : this.effects),
      ctx.currentTime + 0.03,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + length + 0.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  chime() {
    this.tone(659, 0.4);
    setTimeout(() => this.tone(880, 0.6), 130);
  }
  update(dt: number, day: boolean) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.65;
    const notes = day
      ? [262, 330, 392, 523, 392, 330, 294, 392]
      : [220, 330, 440, 494, 440, 330, 294, 330];
    this.tone(notes[this.note++ % notes.length], 1.5, 0.065, true);
  }
  pause() {
    void this.context?.suspend();
  }
}
