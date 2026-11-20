// police.js — the BBPD pursuit machine. Wanted level (0..5) decides
// how many cruisers roll and which roles they take:
//   PURSUIT  — sits on the target's tail and matches speed
//   RAMMING  — aims at a point ahead of the target to cut it off
//   FLANKING — swings wide and closes from the side street
// Units spawn off-screen on the road grid, despawn when the player
// breaks line of sight long enough at low heat, and feed the dispatch
// panel with named units (BRASA-07 etc).

import { clamp, dist2d } from './config.js';
import { Vehicle } from './vehicles.js';

const ROLES = ['PURSUIT', 'RAMMING', 'FLANKING'];
const UNITS_FOR_STARS = [0, 2, 3, 4, 6, 8];

export class PoliceSystem {
  constructor(scene) {
    this.scene = scene;
    this.units = [];
    this.wanted = 0;
    this.heat = 0; // builds with crimes, cools when unseen
    this.unseenTime = 0;
    this.nextUnit = 7;
    this.flash = 0;
  }

  setWanted(n) {
    this.wanted = clamp(Math.round(n), 0, 5);
  }

  addHeat(n) {
    this.heat = clamp(this.heat + n, 0, 100);
    const implied = this.heat > 82 ? 5 : this.heat > 62 ? 4 : this.heat > 42 ? 3 : this.heat > 22 ? 2 : this.heat > 6 ? 1 : 0;
    if (implied > this.wanted) this.setWanted(implied);
  }

  spawnUnit(target) {
    // Spawn on a road 70–110 units away, never in plain view.
    const avenues = [-315, -215, -115, -15, 85, 185, 285];
    const ax = avenues[Math.floor(Math.random() * avenues.length)];
    const fromNorth = Math.random() > 0.5;
    const x = Math.abs(ax - target.x) > 40 ? ax : target.x + (Math.random() > 0.5 ? 85 : -85);
    const z = clamp(target.z + (fromNorth ? -95 : 95), -320, 120);
    const car = new Vehicle('cruiser', 0xf4f6ff, x, z, 0);
    this.scene.add(car.mesh);
    const unit = {
      car,
      call: `BRASA-${String(this.nextUnit).padStart(2, '0')}`,
      role: ROLES[this.units.length % ROLES.length],
    };
    this.nextUnit += 3;
    this.units.push(unit);
    return unit;
  }

  update(dt, target, colliders, t) {
    this.flash = t;
    const want = UNITS_FOR_STARS[this.wanted];
    if (this.wanted > 0 && this.units.length < want) {
      if (Math.random() < dt * 1.4) this.spawnUnit(target);
    }
    // Escape logic: unseen at 1–2 stars cools the heat away.
    let seen = false;
    for (const u of this.units) {
      if (dist2d(u.car.pos.x, u.car.pos.z, target.x, target.z) < 55) seen = true;
    }
    if (!seen && this.wanted > 0 && this.wanted <= 2) {
      this.unseenTime += dt;
      if (this.unseenTime > 7) {
        this.setWanted(0);
        this.heat = 0;
        this.unseenTime = 0;
      }
    } else this.unseenTime = 0;

    if (this.wanted === 0 && this.units.length) {
      for (const u of this.units) this.scene.remove(u.car.mesh);
      this.units = [];
    }

    for (const u of this.units) {
      const c = u.car;
      const d = dist2d(c.pos.x, c.pos.z, target.x, target.z);
      // Role offsets relative to the target's heading.
      let tx = target.x; let tz = target.z;
      const back = u.role === 'PURSUIT' ? 9 : u.role === 'RAMMING' ? -14 : 4;
      const side = u.role === 'FLANKING' ? (u.call.charCodeAt(6) % 2 ? 13 : -13) : 0;
      tx += Math.sin(target.angle ?? 0) * back + Math.cos(target.angle ?? 0) * side;
      tz += Math.cos(target.angle ?? 0) * back - Math.sin(target.angle ?? 0) * side;
      const dx = tx - c.pos.x;
      const dz = tz - c.pos.z;
      const wantAngle = Math.atan2(-dx, -dz);
      let diff = wantAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const ramBoost = u.role === 'RAMMING' && d < 30 ? 1.25 : 1;
      c.drive(dt, {
        throttle: d > 6 ? 1 : 0.2,
        steer: clamp(diff * 1.7, -1, 1),
        brake: Math.abs(c.speed) > 40 * ramBoost,
      }, colliders);
      if (c.speed > 41 * ramBoost) c.speed = 41 * ramBoost;
      // Light bar strobes alternate red/blue.
      const bar = c.mesh.userData.lightbar;
      if (bar) {
        const phase = Math.sin(t * 11 + u.call.charCodeAt(6)) > 0;
        bar.children[0].material.color.setHex(phase ? 0xff2233 : 0x661118);
        bar.children[1].material.color.setHex(phase ? 0x113366 : 0x2266ff);
      }
      // Contact: shove + a little damage both ways.
      if (d < 3.4 && target.vehicle) {
        target.vehicle.damage(4 * dt * 10 * 0.1);
        c.speed *= 0.92;
      }
    }
  }

  bustCheck(target) {
    if (this.wanted === 0) return false;
    let close = 0;
    for (const u of this.units) {
      if (dist2d(u.car.pos.x, u.car.pos.z, target.x, target.z) < 9) close += 1;
    }
    const targetSlow = !target.vehicle || Math.abs(target.vehicle.speed) < 2.2;
    return close >= 2 && targetSlow;
  }

  clear() {
    for (const u of this.units) this.scene.remove(u.car.mesh);
    this.units = [];
    this.setWanted(0);
    this.heat = 0;
  }
}
