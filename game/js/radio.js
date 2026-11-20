// radio.js — three synthesized stations on the WebAudio engine.
// Each station is a chord progression + bassline + hats generated
// live, so the soundtrack never repeats a file and works offline.
// Pressing T cycles stations; the HUD toast names the track playing.

export const STATIONS = [
  {
    id: 'palma', name: 'PALMA FM 98.1', genre: 'Sunset House',
    tracks: ['Neon Tide — Coral Club', 'Golden Hour Drive — Vela', 'Boardwalk Hearts — Mio Sol'],
    root: 110, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [4, 7, 11]], tempo: 0.46,
  },
  {
    id: 'corales', name: 'RADIO CORALES 103.7', genre: 'Street Latin Trap',
    tracks: ['Rey de la Brasa — El Faro', 'Sin Placas — Dario V (bootleg)', 'Marina Nights — La Perla'],
    root: 98, chords: [[0, 3, 7], [0, 3, 7], [8, 12, 15], [7, 10, 14]], tempo: 0.4,
  },
  {
    id: 'velvet', name: 'VELVET ROW 91.3', genre: 'Smooth Jazz & Soul',
    tracks: ['Regent Lobby — The Quintana Trio', 'Blue Hour — Sadie Vale', 'Vault of Stars — Orso'],
    root: 87.3, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], tempo: 0.62,
  },
];

export class Radio {
  constructor(audio, hud) {
    this.audio = audio;
    this.hud = hud;
    this.idx = 0;
    this.trackIdx = 0;
    this.on = true;
    this.step = 0;
    this.timer = 0;
  }

  get station() { return STATIONS[this.idx]; }

  cycle() {
    this.idx = (this.idx + 1) % STATIONS.length;
    this.trackIdx = 0;
    this.step = 0;
    this.announce();
  }

  announce() {
    const s = this.station;
    this.hud.showRadio(`📻 ${s.name} · ${s.genre}`, `♪ ${s.tracks[this.trackIdx]}`);
  }

  // Called from the game loop; schedules one 8th-note step at a time.
  update(dt) {
    if (!this.on || !this.audio.started) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const s = this.station;
    this.timer = s.tempo;
    const bar = Math.floor(this.step / 8) % s.chords.length;
    const chord = s.chords[bar];
    const sub = this.step % 8;
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (sub === 0) {
      for (const n of chord) {
        const f = s.root * 2 * Math.pow(2, n / 12);
        this.tone(f, s.tempo * 7, 'triangle', 0.045);
      }
      if (bar === 0 && this.step > 0 && (this.step / 32) % 2 === 0) {
        this.trackIdx = (this.trackIdx + 1) % s.tracks.length;
        this.hud.showRadio(`📻 ${s.name} · ${s.genre}`, `♪ ${s.tracks[this.trackIdx]}`);
      }
    }
    if (sub % 2 === 0) {
      const bassNote = chord[0];
      this.tone(s.root * Math.pow(2, bassNote / 12), s.tempo * 1.6, 'sine', 0.11);
    }
    if (sub % 2 === 1) this.hat();
    this.step += 1;
  }

  tone(freq, dur, type, vol) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(this.audio.master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  hat() {
    const ctx = this.audio.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(f).connect(g).connect(this.audio.master);
    src.start();
  }
}
