import { dayScore } from "../data/music";
export class IslandAudio {
  context?: AudioContext;
  music = 0.4;
  effects = 0.7;
  musicGain?: GainNode;
  fxGain?: GainNode;
  reverb?: ConvolverNode;
  noise?: AudioBuffer;
  next = 0;
  step = 0;
  pauseUntil = 0;
  async start() {
    if (!this.context) {
      const ctx = (this.context = new AudioContext()),
        master = ctx.createDynamicsCompressor();
      master.threshold.value = -12;
      master.ratio.value = 4;
      master.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.fxGain = ctx.createGain();
      this.musicGain.connect(master);
      this.fxGain.connect(master);
      this.reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, ctx.sampleRate * 1.4, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < d.length; i++)
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.17;
      }
      this.reverb.buffer = impulse;
      this.reverb.connect(this.musicGain);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    await this.context.resume();
    this.next = this.context.currentTime + 0.05;
  }
  note(
    midi: number,
    at: number,
    duration: number,
    volume: number,
    voice: "marimba" | "pluck" | "bass" | "flute" = "marimba",
    effect = false,
  ) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    const freq = 440 * 2 ** ((midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, at);
    osc.type =
      voice === "bass" ? "triangle" : voice === "pluck" ? "sawtooth" : "sine";
    if (voice === "marimba" || voice === "flute")
      osc.setPeriodicWave(
        ctx.createPeriodicWave(
          new Float32Array([0, 0, 0, 0, 0]),
          new Float32Array(
            voice === "marimba"
              ? [0, 1, 0.35, 0.12, 0.18]
              : [0, 1, 0.16, 0.07, 0.025],
          ),
        ),
      );
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      voice === "bass" ? 450 : voice === "pluck" ? 1900 : 5000,
      at,
    );
    filter.frequency.exponentialRampToValueAtTime(
      voice === "bass" ? 220 : 700,
      at + duration,
    );
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(effect ? this.fxGain! : this.musicGain!);
    if (!effect) gain.connect(this.reverb!);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  percussion(
    at: number,
    kind: "brush" | "hat" | "kick",
    volume: number,
    effect = false,
  ) {
    const ctx = this.context;
    if (!ctx || !this.noise) return;
    if (kind === "kick") {
      this.note(34, at, 0.15, volume, "bass", effect);
      return;
    }
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = "highpass";
    filter.frequency.value = kind === "hat" ? 6000 : 1600;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      at + (kind === "hat" ? 0.055 : 0.18),
    );
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effect ? this.fxGain! : this.musicGain!);
    source.start(at);
    source.stop(at + 0.25);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  update() {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    this.musicGain!.gain.setTargetAtTime(
      this.music * 0.55,
      ctx.currentTime,
      0.15,
    );
    this.fxGain!.gain.setTargetAtTime(
      this.effects * 0.65,
      ctx.currentTime,
      0.05,
    );
    if (this.next < ctx.currentTime - 0.3) this.next = ctx.currentTime + 0.03;
    const beat = 60 / dayScore.bpm,
      eighth = beat / 2;
    while (this.next < ctx.currentTime + 0.18) {
      const bar = Math.floor(this.step / 8) % 64,
        e = this.step % 8,
        phrase = Math.floor(bar / 8),
        root = dayScore.roots[bar % 8],
        minor = bar % 8 === 4 || bar % 8 === 6,
        third = minor ? 3 : 4,
        section = Math.floor(bar / 16);
      if (this.next >= this.pauseUntil) {
        if (e === 0 || e === 4)
          this.note(
            root - 12 + (e === 4 ? 7 : 0),
            this.next,
            beat * 0.85,
            0.14,
            "bass",
          );
        if (e === 0 || e === 3 || e === 6)
          [0, third, 7].forEach((n, i) =>
            this.note(
              root + 12 + n,
              this.next + i * 0.014,
              beat * 0.65,
              0.033,
              "pluck",
            ),
          );
        if (e % 2 === 1)
          this.note(
            root + 24 + [0, third, 7, 12][(e + phrase) % 4],
            this.next,
            eighth * 0.9,
            0.027,
            "pluck",
          );
        const motif = dayScore.motifs[(section + Math.floor(bar / 4)) % 4],
          melody = motif[(bar % 2) * 8 + e] + 60 + (phrase % 3 === 2 ? 12 : 0);
        if ((e + bar) % 7 !== 0 && !(section === 0 && bar < 4 && e % 2))
          this.note(
            melody,
            this.next,
            eighth * 1.6,
            0.09,
            section === 2 ? "flute" : "marimba",
          );
        if (e === 0 || e === 4) this.percussion(this.next, "kick", 0.075);
        if (e === 2 || e === 6) this.percussion(this.next, "brush", 0.025);
        if (bar > 7) this.percussion(this.next, "hat", e % 2 ? 0.012 : 0.019);
      }
      this.next += eighth;
      this.step++;
      if (this.step % (64 * 8) === 0) this.pauseUntil = this.next + 7;
    }
  }
  material(kind: string, action: "step" | "break" | "place") {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const midi =
      (
        {
          wood: 50,
          stone: 39,
          grass: 70,
          sand: 65,
          snow: 77,
          wool: 56,
          glass: 86,
          water: 61,
        } as Record<string, number>
      )[kind] || 58;
    const volume = action === "step" ? 0.05 : 0.17,
      variation = (Math.random() - 0.5) * 2;
    this.note(
      midi + variation,
      ctx.currentTime,
      action === "break" ? 0.18 : 0.09,
      volume,
      kind === "glass" ? "marimba" : "pluck",
      true,
    );
    if (["grass", "sand", "snow", "stone"].includes(kind))
      this.percussion(ctx.currentTime, "brush", volume * 0.55, true);
  }
  chime(root = 72) {
    const ctx = this.context;
    if (!ctx) return;
    [0, 4, 7, 12].forEach((n, i) =>
      this.note(
        root + n,
        ctx.currentTime + i * 0.085,
        0.65,
        0.13,
        "marimba",
        true,
      ),
    );
  }
  pause() {
    void this.context?.suspend();
  }
}
