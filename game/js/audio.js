// audio.js — a tiny synthesized sound engine on WebAudio. No samples:
// engine hum follows speed, gunshots are filtered noise bursts, the
// siren is a two-tone oscillator, pickups and UI are square blips.
// Music sequencing lives in radio.js but plays through here.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: sawtooth through a lowpass, pitch tracks speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(lp).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
      // Siren: slow two-tone.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain).connect(this.master);
      this.sirenOsc.start();
      this.started = true;
    } catch { /* audio unavailable — game stays silent */ }
  }

  engine(speedRatio, driving) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedRatio * 0.05 : 0, t, 0.1);
  }

  siren(on, t) {
    if (!this.started) return;
    this.sirenOsc.frequency.value = 640 + Math.sin(t * 5.2) * 190;
    this.sirenGain.gain.setTargetAtTime(on ? 0.016 : 0, this.ctx.currentTime, 0.2);
  }

  blip(freq = 660, dur = 0.09, type = 'square', vol = 0.12) {
    if (!this.started) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  shot(kind = 'pistol') {
    if (!this.started) return;
    const dur = kind === 'shotgun' ? 0.22 : kind === 'smg' ? 0.07 : 0.12;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = kind === 'shotgun' ? 900 : 2400;
    const g = this.ctx.createGain();
    g.gain.value = kind === 'shotgun' ? 0.5 : 0.3;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  cash() { this.blip(880, 0.08, 'square', 0.1); setTimeout(() => this.blip(1320, 0.12, 'square', 0.1), 70); }
  hurt() { this.blip(140, 0.16, 'sawtooth', 0.16); }
  checkpoint() { this.blip(1040, 0.1, 'triangle', 0.14); }
}
