// activities.js — free-roam side work between story jobs:
//   Taxi fares: a gold beacon picks a passenger up, a teal one is the
//     drop; pay scales with distance and a clean, quick run.
//   Crown cases: five glowing briefcases hidden around the bay pay
//     cash + RP once each per run and feed completion %.
// Both are announced through the HUD side-tag so the left panel's
// "NEXT" line always has something honest to point at.

import * as THREE from 'three';
import { dist2d, mulberry32 } from './config.js';

const rng = mulberry32(31337);

const CASE_SPOTS = [
  { x: -300, z: -300, label: 'Marina lookout' },
  { x: 300, z: -290, label: 'Row helipad stairs' },
  { x: 150, z: 128, label: 'Palmas boardwalk end' },
  { x: -30, z: -160, label: 'Old Town arcade' },
  { x: 262, z: 210, label: 'East buoy dock' },
];

function beacon(color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 9, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
    }));
  return m;
}

export class Activities {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.fare = null;
    this.fareBeacon = beacon(0xffd23c);
    this.fareBeacon.visible = false;
    scene.add(this.fareBeacon);
    this.cases = CASE_SPOTS.map((s) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xffd23c }));
      mesh.position.set(s.x, 0.9, s.z);
      scene.add(mesh);
      return { ...s, mesh, taken: false };
    });
    this.casesTaken = 0;
  }

  offerFare(playerPos) {
    if (this.fare) return;
    const spots = [
      { x: -180, z: 40 }, { x: 60, z: -90 }, { x: 210, z: -30 },
      { x: -90, z: -200 }, { x: 130, z: 40 }, { x: -250, z: -120 },
    ];
    const from = spots[Math.floor(rng() * spots.length)];
    let to = spots[Math.floor(rng() * spots.length)];
    if (to === from) to = spots[(spots.indexOf(from) + 2) % spots.length];
    this.fare = { phase: 'pickup', from, to, pay: 0, time: 0 };
    this.fareBeacon.position.set(from.x, 4.5, from.z);
    this.fareBeacon.material.color.setHex(0xffd23c);
    this.fareBeacon.visible = true;
    return this.fare;
  }

  update(dt, t, playerPos, inVehicle, hud) {
    for (const c of this.cases) {
      if (c.taken) continue;
      c.mesh.rotation.y = t * 1.6;
      c.mesh.position.y = 0.9 + Math.sin(t * 2 + c.x) * 0.15;
      if (dist2d(playerPos.x, playerPos.z, c.x, c.z) < 3.2) {
        c.taken = true;
        c.mesh.visible = false;
        this.casesTaken += 1;
        this.fx.burst(c.x, 1.2, c.z, 0xffd23c, 14, 3.4);
        hud.toast(`CROWN CASE ${this.casesTaken}/5 — +$350 · +25 RP (${c.label})`);
        return { type: 'case', cash: 350, rp: 25 };
      }
    }
    const f = this.fare;
    if (!f) return null;
    f.time += dt;
    this.fareBeacon.rotation.y = t;
    if (f.phase === 'pickup' && inVehicle && dist2d(playerPos.x, playerPos.z, f.from.x, f.from.z) < 7) {
      f.phase = 'drop';
      const d = dist2d(f.from.x, f.from.z, f.to.x, f.to.z);
      f.pay = Math.round(180 + d * 2.1);
      this.fareBeacon.position.set(f.to.x, 4.5, f.to.z);
      this.fareBeacon.material.color.setHex(0x2ee6c8);
      hud.toast(`Passenger aboard — fare $${f.pay} if you keep it clean`);
      return { type: 'pickup' };
    }
    if (f.phase === 'drop' && dist2d(playerPos.x, playerPos.z, f.to.x, f.to.z) < 7) {
      const pay = f.pay;
      this.fare = null;
      this.fareBeacon.visible = false;
      hud.toast(`FARE PAID — $${pay}`);
      return { type: 'fare', cash: pay, rp: 18 };
    }
    return null;
  }
}
