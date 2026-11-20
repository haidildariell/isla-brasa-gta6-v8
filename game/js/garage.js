// garage.js — the safehouse garage: store up to four cars with a
// condition %, and buy services — repair, armour plating, nitro
// fitting, respray. Owned upgrades live on the vehicle records so
// they survive save/load. Rank gates: nitro Respect 3, armour 5.

export const GARAGE_SERVICES = [
  { id: 'repair', name: 'Full Repair', price: 260, rank: 1, desc: 'Condition back to 100%' },
  { id: 'armour', name: 'Armour Plating', price: 1800, rank: 5, desc: 'Damage taken cut hard' },
  { id: 'nitro', name: 'Nitro Kit', price: 1200, rank: 3, desc: 'Hold SHIFT in the car to boost' },
  { id: 'respray', name: 'Respray', price: 300, rank: 1, desc: 'New colour — and cold plates for the heat' },
];

const SPRAY_COLORS = [0xff5d3c, 0x2ee6c8, 0xffd23c, 0x8f7bff, 0x7dff8a, 0xf2f2f2, 0x2266cc];

export class Garage {
  constructor() {
    this.stored = []; // {modelKey, color, condition, armour, hasNitro, name}
    this.sprayIdx = 0;
  }

  store(vehicle) {
    if (this.stored.length >= 4) return false;
    this.stored.push({
      modelKey: vehicle.modelKey,
      color: vehicle.mesh.userData.paintMat.color.getHex(),
      condition: Math.round(vehicle.condition),
      armour: vehicle.armour,
      hasNitro: vehicle.hasNitro,
      name: vehicle.spec.name,
    });
    return true;
  }

  take(index) {
    return this.stored.splice(index, 1)[0] ?? null;
  }

  buy(serviceId, vehicle, state) {
    const svc = GARAGE_SERVICES.find((s) => s.id === serviceId);
    if (!svc || !vehicle) return { ok: false, why: 'No car in the garage bay' };
    if (state.ranks.level < svc.rank) return { ok: false, why: `Needs Respect rank ${svc.rank}` };
    const free = serviceId === 'respray' && state.ranks.level >= 8;
    const price = free ? 0 : svc.price;
    if (state.cash < price) return { ok: false, why: 'Not enough cash' };
    state.cash -= price;
    if (serviceId === 'repair') vehicle.repair(true);
    if (serviceId === 'armour') vehicle.armour = 12;
    if (serviceId === 'nitro') vehicle.hasNitro = true;
    if (serviceId === 'respray') {
      this.sprayIdx = (this.sprayIdx + 1) % SPRAY_COLORS.length;
      vehicle.mesh.userData.paintMat.color.setHex(SPRAY_COLORS[this.sprayIdx]);
    }
    return { ok: true, why: `${svc.name} fitted — $${price}` };
  }

  serialize() { return this.stored; }
  restore(data) { this.stored = Array.isArray(data) ? data : []; }
}
