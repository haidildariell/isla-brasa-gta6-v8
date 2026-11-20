// districts.js — the four neighbourhoods of Brasa Bay: bounds, banner
// flavour, map colours and the player's standing in each. Standing is
// earned by finishing jobs and races inside a district and unlocks a
// small discount at its shop.

import { WORLD } from './config.js';

export const DISTRICTS = [
  {
    id: 'marina', name: 'MARINA DISTRICT', sub: 'PIERS · BOATS · QUIET MONEY',
    color: '#2ee6c8', x0: -345, x1: -118, z0: -330, z1: 150,
    blurb: 'Fishing hulls, the Mako berth and the safehouse pier.',
  },
  {
    id: 'oldtown', name: 'OLD TOWN', sub: 'PLAZAS · ARCADES · LOS CORALES TURF',
    color: '#ff9a3c', x0: -118, x1: -12, z0: -330, z1: 150,
    blurb: 'Colonial blocks where Los Corales collect their rent.',
  },
  {
    id: 'palmas', name: 'LAS PALMAS', sub: 'BEACHFRONT · BOARDWALK · MARKET',
    color: '#ff5d7e', x0: -12, x1: 178, z0: -330, z1: 175,
    blurb: 'The postcard strip: market stalls, palms and the boulevard.',
  },
  {
    id: 'financial', name: 'FINANCIAL ROW', sub: 'TOWERS · VAULTS · REGENT HOTEL',
    color: '#8f7bff', x0: 178, x1: 345, z0: -330, z1: 150,
    blurb: 'Glass towers, the night vault and the Regent Hotel.',
  },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  if (z >= 150) return DISTRICTS[2];
  return DISTRICTS[1];
}

export class DistrictTracker {
  constructor(hud) {
    this.hud = hud;
    this.current = null;
    this.standing = { marina: 0, oldtown: 0, palmas: 0, financial: 0 };
  }

  update(x, z) {
    const d = districtAt(x, z);
    if (d !== this.current) {
      this.current = d;
      this.hud.showDistrict(d.name, d.sub);
    }
    return d;
  }

  addStanding(id, n) {
    this.standing[id] = Math.min(100, (this.standing[id] ?? 0) + n);
  }

  discount(id) {
    return (this.standing[id] ?? 0) >= 50 ? 0.1 : 0;
  }
}

export { WORLD };
