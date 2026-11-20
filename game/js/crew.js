// crew.js — Dario's three-person crew and their call-in abilities.
// Keys 1/2/3 while on foot or driving (the weapon wheel owns Q, digits
// pick guns only while the wheel is open, so there is no clash).
//   Tomas Rey  [1] Swap Plates — wanted level drops, heat resets
//   Tomas Rey  [2] Quick Fix   — current vehicle repaired on the spot
//   Lio Park   [3] Eyes Out    — police + rivals pinged, escape route lit

export const CREW = [
  { name: 'Tomas Rey', role: 'Mechanic', color: '#ffb03c' },
  { name: 'Lio Park', role: 'Lookout', color: '#2ee6c8' },
  { name: 'Vera Quintana', role: 'Handler', color: '#ff5d7e' },
];

export const ABILITIES = [
  { id: 'plates', label: 'Swap Plates', who: 'Tomas', key: '1', cd: 45, icon: 'PLT' },
  { id: 'fix', label: 'Quick Fix', who: 'Tomas', key: '2', cd: 40, icon: 'FIX' },
  { id: 'eyes', label: 'Eyes Out', who: 'Lio', key: '3', cd: 35, icon: 'EYE' },
];

export class CrewState {
  constructor() {
    this.timers = { plates: 0, fix: 0, eyes: 0 };
    this.eyesUntil = 0;
  }

  update(dt, now) {
    for (const k of Object.keys(this.timers)) this.timers[k] = Math.max(0, this.timers[k] - dt);
    this.eyesActive = now < this.eyesUntil;
  }

  ready(id) { return this.timers[id] <= 0; }

  use(id, now, rankLvl) {
    if (!this.ready(id)) return false;
    const base = ABILITIES.find((a) => a.id === id).cd;
    this.timers[id] = rankLvl >= 6 ? base * 0.6 : base;
    if (id === 'eyes') this.eyesUntil = now + 12;
    return true;
  }
}
