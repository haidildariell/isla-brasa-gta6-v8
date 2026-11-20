// pedestrians.js — Brasa Bay on foot: low-poly walkers with bobbing
// gaits strolling the sidewalks and the boardwalk, plus scatterable
// crowds for staged scenes. Walkers flee gunfire and sprint from cars
// that mount the pavement.

import * as THREE from 'three';
import { mulberry32, clamp } from './config.js';

const rng = mulberry32(9021);
const SHIRTS = [0xff5d7e, 0xffd23c, 0x2ee6c8, 0xff9a3c, 0x8f7bff, 0xf2f2f2, 0x7cc4ff, 0x7dff8a];
const SKIN = [0xf2c49b, 0xc98a5a, 0x8a5a34, 0x6e4226, 0xffd9b0];

export function makePerson(shirt, skinTone, pants = 0x2c3550) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.26),
    new THREE.MeshLambertMaterial({ color: pants }));
  legs.position.y = 0.39;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.3),
    new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.14;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8),
    new THREE.MeshLambertMaterial({ color: skinTone }));
  head.position.y = 1.72;
  g.add(head);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12),
    new THREE.MeshBasicMaterial({ color: 0x14081a, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.05;
  g.add(blob);
  g.userData = { legs, torso };
  return g;
}

export class PedSystem {
  constructor(scene, count = 26) {
    this.peds = [];
    this.scene = scene;
    for (let i = 0; i < count; i += 1) this.spawnWalker();
  }

  spawnWalker() {
    const onBlvd = rng() > 0.45;
    const mesh = makePerson(
      SHIRTS[Math.floor(rng() * SHIRTS.length)],
      SKIN[Math.floor(rng() * SKIN.length)],
    );
    const ped = {
      mesh,
      x: 0, z: 0, angle: rng() * Math.PI * 2,
      speed: 1.1 + rng() * 0.9, flee: 0, phase: rng() * 9,
      axis: onBlvd ? 'x' : 'z',
      line: 0, dir: rng() > 0.5 ? 1 : -1,
    };
    if (onBlvd) {
      ped.x = -320 + rng() * 640;
      ped.line = 118 + rng() * 16;
      ped.z = ped.line;
    } else {
      const avenues = [-305, -205, -105, -5, 95, 195, 295];
      ped.line = avenues[Math.floor(rng() * avenues.length)] + (rng() > 0.5 ? 10.6 : -10.6);
      ped.x = ped.line;
      ped.z = -300 + rng() * 380;
    }
    mesh.position.set(ped.x, 0, ped.z);
    this.scene.add(mesh);
    this.peds.push(ped);
    return ped;
  }

  // A standing/ milling crowd member for markets and staged frames.
  addBystander(x, z, angle = 0, shirt) {
    const mesh = makePerson(
      shirt ?? SHIRTS[Math.floor(rng() * SHIRTS.length)],
      SKIN[Math.floor(rng() * SKIN.length)],
    );
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    this.scene.add(mesh);
    const ped = { mesh, x, z, angle, speed: 0, flee: 0, phase: rng() * 9, axis: 'stay', line: 0, dir: 1 };
    this.peds.push(ped);
    return ped;
  }

  scare(x, z, radius = 26) {
    for (const p of this.peds) {
      if (Math.hypot(p.x - x, p.z - z) < radius) p.flee = 2.6;
    }
  }

  update(dt, t, threat) {
    for (const p of this.peds) {
      let sp = p.speed;
      if (p.flee > 0) {
        p.flee -= dt;
        sp = 4.4;
        const away = Math.atan2(p.x - (threat?.x ?? p.x), p.z - (threat?.z ?? p.z));
        p.angle = away;
        p.x += Math.sin(p.angle) * sp * dt;
        p.z += Math.cos(p.angle) * sp * dt;
      } else if (p.axis === 'x') {
        p.x += p.dir * sp * dt;
        p.angle = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (p.x > 335 || p.x < -335) p.dir *= -1;
        p.z = p.line + Math.sin(t * 0.5 + p.phase) * 0.8;
      } else if (p.axis === 'z') {
        p.z += p.dir * sp * dt;
        p.angle = p.dir > 0 ? 0 : Math.PI;
        if (p.z > 130 || p.z < -315) p.dir *= -1;
        p.x = p.line + Math.sin(t * 0.4 + p.phase) * 0.7;
      }
      p.x = clamp(p.x, -348, 348);
      p.z = clamp(p.z, -335, 165);
      p.mesh.position.set(p.x, Math.abs(Math.sin(t * 7 * Math.max(0.4, sp) + p.phase)) * 0.06, p.z);
      p.mesh.rotation.y = p.angle;
      if (sp > 0.2) p.mesh.userData.legs.rotation.x = Math.sin(t * 8 + p.phase) * 0.4;
    }
  }
}
