// races.js — three street races with glowing checkpoint rings, three
// AI rivals running the same course, and a live position readout.
// Win by reaching the final ring first; positions update as rivals
// pass checkpoints. Gold rings idle on the map as race starters.

import * as THREE from 'three';
import { boulevardZ, dist2d } from './config.js';
import { Vehicle } from './vehicles.js';

export const RACES = [
  {
    id: 'burn', name: 'Boulevard Burn', laps: 'Sprint', prize: 1200, rp: 90,
    start: { x: -240, z: 0 },
    points: [
      { x: -140, z: 0 }, { x: -40, z: 0 },
      { x: 30, z: 60 }, { x: 90, z: 0 },
      { x: 160, z: -40 }, { x: 230, z: 0 },
    ],
    get pointsFull() { return this.points; },
  },
  {
    id: 'row', name: 'Financial Row GP', laps: 'Circuit', prize: 2000, rp: 130,
    start: { x: 200, z: -260 },
    points: [
      { x: 285, z: -205 }, { x: 285, z: -45 }, { x: 185, z: -45 },
      { x: 85, z: -125 }, { x: 185, z: -205 }, { x: 200, z: -262 },
    ],
  },
  {
    id: 'marina', name: 'Marina Mile', laps: 'Sprint', prize: 900, rp: 70,
    start: { x: -300, z: -240 },
    points: [
      { x: -215, z: -125 }, { x: -300, z: -45 }, { x: -215, z: 35 },
      { x: -260, z: 0 }, { x: -200, z: 60 },
    ],
  },
];

// Boulevard Burn checkpoints follow the curve for the hero shot.
RACES[0].points = [
  { x: -150, z: boulevardZ(-150) }, { x: -60, z: boulevardZ(-60) },
  { x: 30, z: boulevardZ(30) }, { x: 110, z: boulevardZ(110) },
  { x: 190, z: boulevardZ(190) }, { x: 260, z: boulevardZ(260) },
];
RACES[0].start = { x: -235, z: boulevardZ(-235) };

function makeRing(color = 0xffd23c) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.42, 10, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  const glow = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -2.4;
  ring.add(glow);
  return ring;
}

export class RaceSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = null;
    this.startRings = RACES.map((r) => {
      const ring = makeRing(0xffd23c);
      ring.position.set(r.start.x, 3, r.start.z);
      scene.add(ring);
      return ring;
    });
    this.cpRing = makeRing(0x2ee6c8);
    this.cpRing.visible = false;
    scene.add(this.cpRing);
  }

  nearestStart(x, z) {
    for (const r of RACES) if (dist2d(x, z, r.start.x, r.start.z) < 12) return r;
    return null;
  }

  begin(race, playerVehicle) {
    this.active = {
      race, cp: 0, time: 0, finished: false,
      rivals: [],
      playerProgress: 0,
    };
    const cols = [0xff2a3c, 0x2ee6c8, 0xf2f2f2];
    for (let i = 0; i < 3; i += 1) {
      const v = new Vehicle('rival', cols[i],
        race.start.x + (i - 1) * 6, race.start.z + 9 + (i % 2) * 5, Math.PI / 2);
      this.scene.add(v.mesh);
      this.active.rivals.push({ car: v, cp: 0, progress: 0, skill: 0.86 + i * 0.07 });
    }
    this.showCheckpoint();
    return this.active;
  }

  showCheckpoint() {
    const a = this.active;
    if (!a) return;
    const p = a.race.points[a.cp];
    if (!p) { this.cpRing.visible = false; return; }
    this.cpRing.position.set(p.x, 3, p.z);
    // Face the ring toward the driver approaching from the last point.
    const prev = a.cp > 0 ? a.race.points[a.cp - 1] : a.race.start;
    const tx = p.x - prev.x;
    const tz = p.z - prev.z;
    this.cpRing.rotation.set(0, Math.atan2(-tx, -tz), 0);
    this.cpRing.visible = true;
  }

  update(dt, t, playerVehicle, colliders) {
    for (const ring of this.startRings) {
      ring.rotation.y = t * 0.8;
      ring.visible = !this.active;
    }
    this.cpRing.position.y = 3 + Math.sin(t * 2.2) * 0.3;
    const a = this.active;
    if (!a || a.finished) return null;
    a.time += dt;
    const target = a.race.points[a.cp];
    // Player progress.
    if (target && playerVehicle) {
      if (dist2d(playerVehicle.pos.x, playerVehicle.pos.z, target.x, target.z) < 8.5) {
        a.cp += 1;
        this.showCheckpoint();
        if (a.cp >= a.race.points.length) {
          a.finished = true;
          return { type: 'player-finish', position: this.position(playerVehicle) };
        }
        return { type: 'checkpoint', cp: a.cp, total: a.race.points.length };
      }
    }
    // Rivals chase the same rings.
    for (const r of a.rivals) {
      const rt = a.race.points[r.cp] ?? a.race.points[a.race.points.length - 1];
      const dx = rt.x - r.car.pos.x;
      const dz = rt.z - r.car.pos.z;
      if (Math.hypot(dx, dz) < 9 && r.cp < a.race.points.length) r.cp += 1;
      const want = Math.atan2(-dx, -dz);
      let diff = want - r.car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.car.drive(dt, {
        throttle: 0.92,
        steer: Math.max(-1, Math.min(1, diff * 1.8)),
        brake: Math.abs(r.car.speed) > 38 * r.skill,
      }, colliders);
      if (r.car.speed > 38 * r.skill) r.car.speed = 38 * r.skill;
      r.progress = r.cp + 1 - Math.min(0.99, Math.hypot(dx, dz) / 220);
    }
    if (playerVehicle && target) {
      const d = Math.hypot(target.x - playerVehicle.pos.x, target.z - playerVehicle.pos.z);
      a.playerProgress = a.cp + 1 - Math.min(0.99, d / 220);
    }
    return null;
  }

  position(playerVehicle) {
    const a = this.active;
    if (!a || !playerVehicle) return 1;
    let pos = 1;
    for (const r of a.rivals) if (r.progress > a.playerProgress) pos += 1;
    return pos;
  }

  end() {
    if (!this.active) return;
    for (const r of this.active.rivals) this.scene.remove(r.car.mesh);
    this.active = null;
    this.cpRing.visible = false;
  }
}
