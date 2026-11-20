// ranks.js — Respect ranks 1..8. Jobs, races and side work pay RP;
// each rank unlocks hardware, garage services or a new crew trick.
// The HUD rank card always shows the next unlock so the grind reads.

export const RANKS = [
  { lvl: 1, title: 'Dock Hand', rp: 0, unlock: 'Fists, Harbor Bat, P9 Pistol' },
  { lvl: 2, title: 'Runner', rp: 120, unlock: 'Mako SMG at Brasa Armory' },
  { lvl: 3, title: 'Wheelman', rp: 300, unlock: 'Garage nitro fitting' },
  { lvl: 4, title: 'Fixer', rp: 560, unlock: '12G Breaker shotgun' },
  { lvl: 5, title: 'Smuggler', rp: 900, unlock: 'Garage armour plating' },
  { lvl: 6, title: 'Shot Caller', rp: 1350, unlock: 'Crew: faster ability cooldowns' },
  { lvl: 7, title: 'Kingpin\u2019s Right Hand', rp: 1950, unlock: 'AR Carbine at Brasa Armory' },
  { lvl: 8, title: 'Brasa Kingpin', rp: 2800, unlock: 'The crown — free resprays forever' },
];

export class RankState {
  constructor() {
    this.rp = 0;
  }

  get level() {
    let lvl = 1;
    for (const r of RANKS) if (this.rp >= r.rp) lvl = r.lvl;
    return lvl;
  }

  get current() { return RANKS[this.level - 1]; }

  get next() { return RANKS[this.level] ?? null; }

  progress() {
    const cur = this.current;
    const nxt = this.next;
    if (!nxt) return 1;
    return (this.rp - cur.rp) / (nxt.rp - cur.rp);
  }

  // Returns the new rank record when RP crosses a threshold, else null.
  addRP(n) {
    const before = this.level;
    this.rp += n;
    return this.level > before ? this.current : null;
  }

  has(lvl) { return this.level >= lvl; }
}
