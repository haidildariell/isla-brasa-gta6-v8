// weapons.js — the six-slot arsenal. Slot order is fixed so the HUD
// bar, the weapon wheel and the save file all agree. The AR Carbine is
// rank-locked (Respect 7) and shows as a locked slot until then.

export const WEAPONS = [
  { id: 'fists', name: 'Fists', key: '1', dmg: 12, rate: 0.42, range: 2.6, mag: Infinity, price: 0, rank: 1, melee: true },
  { id: 'bat', name: 'Harbor Bat', key: '2', dmg: 26, rate: 0.55, range: 3.1, mag: Infinity, price: 120, rank: 1, melee: true },
  { id: 'p9', name: 'P9 Pistol', key: '3', dmg: 22, rate: 0.34, range: 68, mag: 12, price: 450, rank: 1 },
  { id: 'mako', name: 'Mako SMG', key: '4', dmg: 15, rate: 0.11, range: 58, mag: 30, price: 1400, rank: 2 },
  { id: 'breaker', name: '12G Breaker', key: '5', dmg: 46, rate: 0.95, range: 30, mag: 6, price: 2600, rank: 4 },
  { id: 'carbine', name: 'AR Carbine', key: '6', dmg: 30, rate: 0.16, range: 95, mag: 30, price: 5200, rank: 7 },
];

export class Arsenal {
  constructor() {
    this.owned = { fists: true, bat: false, p9: true };
    this.ammo = { p9: 48, mako: 0, breaker: 0, carbine: 0 };
    this.inMag = { p9: 12, mako: 30, breaker: 6, carbine: 30 };
    this.slot = 2; // P9 in hand at spawn
    this.cooldown = 0;
  }

  get current() { return WEAPONS[this.slot]; }

  unlocked(weapon, rankLvl) { return rankLvl >= weapon.rank; }

  canUse(weapon, rankLvl) {
    return this.owned[weapon.id] && this.unlocked(weapon, rankLvl);
  }

  select(i, rankLvl) {
    const w = WEAPONS[i];
    if (w && this.canUse(w, rankLvl)) { this.slot = i; return true; }
    return false;
  }

  // Attempt to fire; returns 'hit-window' timing info for combat.js.
  tryFire(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return false;
    const w = this.current;
    if (!w.melee) {
      if (this.inMag[w.id] <= 0) { this.reload(w); return false; }
      this.inMag[w.id] -= 1;
    }
    this.cooldown = w.rate;
    return true;
  }

  reload(w = this.current) {
    if (w.melee) return;
    const need = w.mag - this.inMag[w.id];
    const take = Math.min(need, this.ammo[w.id]);
    this.inMag[w.id] += take;
    this.ammo[w.id] -= take;
  }

  buyAmmo(w) {
    const pack = w.mag * 2;
    this.ammo[w.id] += pack;
    return pack;
  }

  serialize() { return { owned: this.owned, ammo: this.ammo, slot: this.slot }; }
  restore(data) {
    if (!data) return;
    Object.assign(this.owned, data.owned ?? {});
    Object.assign(this.ammo, data.ammo ?? {});
    this.slot = data.slot ?? 2;
    for (const w of WEAPONS) if (!w.melee) this.inMag[w.id] = Math.min(w.mag, this.inMag[w.id]);
  }
}
