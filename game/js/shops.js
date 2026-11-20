// shops.js — three walk-up storefronts. Walk into the glow, press F,
// buy with number keys. Stock respects Respect rank locks, and the
// district standing discount applies at the local shop.
//   Brasa Armory      (Old Town)   — weapons + ammo + armour vests
//   Palma Spray & Go  (Las Palmas) — respray vouchers, nitro refill
//   Isla Fuel         (Financial)  — snacks (heal), armour, ammo

import { WEAPONS } from './weapons.js';
import { makeSign } from './city.js';

export const SHOPS = [
  {
    id: 'armory', name: 'BRASA ARMORY', district: 'oldtown',
    x: -64, z: -52, sign: 0xff5d7e, signZ: -46.4,
    blurb: 'Hardware for the working wheelman.',
  },
  {
    id: 'spray', name: 'PALMA SPRAY & GO', district: 'palmas',
    x: 96, z: 44, sign: 0x2ee6c8, signZ: 49.6,
    blurb: 'New colour, cold plates, full tank of shine.',
  },
  {
    id: 'fuel', name: 'ISLA FUEL', district: 'financial',
    x: 232, z: -84, sign: 0xffd23c, signZ: -78.4,
    blurb: 'Snacks, vests and loose rounds at 3 a.m. prices.',
  },
];

export function shopStock(shop, state) {
  const rows = [];
  if (shop.id === 'armory') {
    for (const w of WEAPONS) {
      if (w.melee && w.id === 'fists') continue;
      if (!state.arsenal.owned[w.id]) {
        rows.push({
          label: w.name, price: w.price, locked: state.ranks.level < w.rank,
          lockText: `RANK ${w.rank}`, act: () => { state.arsenal.owned[w.id] = true; },
        });
      } else if (!w.melee) {
        rows.push({
          label: `${w.name} ammo ×${w.mag * 2}`, price: Math.round(w.price * 0.12),
          act: () => state.arsenal.buyAmmo(w),
        });
      }
    }
    rows.push({ label: 'Armour vest (+50)', price: 500, act: () => { state.player.armour = Math.min(100, state.player.armour + 50); } });
  }
  if (shop.id === 'spray') {
    rows.push({
      label: 'Respray voucher (next car)', price: 300,
      act: () => { state.flags.sprayVoucher = true; },
    });
    rows.push({
      label: 'Nitro refill', price: 150,
      act: () => { if (state.player.inVehicle) state.player.inVehicle.nitro = 1; },
    });
    rows.push({ label: 'Armour vest (+50)', price: 550, act: () => { state.player.armour = Math.min(100, state.player.armour + 50); } });
  }
  if (shop.id === 'fuel') {
    rows.push({ label: 'Empanada (heal 35)', price: 25, act: () => state.player.heal(35) });
    rows.push({ label: 'Armour vest (+50)', price: 600, act: () => { state.player.armour = Math.min(100, state.player.armour + 50); } });
    const p9 = WEAPONS[2];
    rows.push({ label: `P9 ammo ×${p9.mag * 2}`, price: 60, act: () => state.arsenal.buyAmmo(p9) });
  }
  return rows;
}

export function buildShopfronts(scene) {
  for (const s of SHOPS) {
    scene.add(makeSign(s.name, s.sign, s.x, 5.6, s.signZ));
  }
}

export function nearestShop(x, z) {
  for (const s of SHOPS) {
    if (Math.hypot(x - s.x, z - s.z) < 6.5) return s;
  }
  return null;
}
