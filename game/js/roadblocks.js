// roadblocks.js — at 3+ stars the BBPD parks cruiser walls across
// the boulevard and the avenue mouths, and at 4+ lays spike strips.
// Blocks are placed ahead of the player's heading so a chase always
// has a decision in it; they clear when the wanted level drops.

import * as THREE from 'three';
import { boulevardZ } from './config.js';
import { Vehicle } from './vehicles.js';

export class RoadblockSystem {
  constructor(scene) {
    this.scene = scene;
    this.blocks = [];
    this.spikes = [];
    this.cool = 0;
  }

  maybeDeploy(dt, wanted, target) {
    this.cool -= dt;
    if (wanted < 3 || this.cool > 0 || this.blocks.length >= 2) return;
    this.cool = 16;
    const ahead = 78;
    const bx = target.x + Math.sin(target.angle ?? 0) * -ahead * -1;
    void bx;
    // Place across the boulevard near the target's x, offset ahead.
    const x = target.x + (target.facingX ?? 1) * ahead;
    const z = boulevardZ(x);
    const block = { x, z, cars: [], call: `RB-${this.blocks.length + 1}` };
    for (let i = -1; i <= 1; i += 1) {
      const car = new Vehicle('cruiser', 0xf4f6ff, x + i * 5.2, z + (i % 2) * 1.4, Math.PI / 2 + i * 0.14);
      this.scene.add(car.mesh);
      block.cars.push(car);
    }
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(17, 1.0, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xff7a2a }));
    barrier.position.set(x, 0.5, z + 4.6);
    this.scene.add(barrier);
    block.barrier = barrier;
    this.blocks.push(block);

    if (wanted >= 4) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(13, 0.14, 1.5),
        new THREE.MeshBasicMaterial({ color: 0x2b2b33 }));
      strip.position.set(x, 0.1, z - 6.5);
      this.scene.add(strip);
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(13, 0.2, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xd8d8e2 }));
      teeth.position.set(x, 0.16, z - 6.5);
      this.scene.add(teeth);
      this.spikes.push({ x, z: z - 6.5, mesh: strip, teeth });
    }
  }

  // Returns true when the player's car crosses a spike strip.
  checkSpikes(vehicle) {
    for (const s of this.spikes) {
      if (Math.abs(vehicle.pos.x - s.x) < 7 && Math.abs(vehicle.pos.z - s.z) < 1.6
        && Math.abs(vehicle.speed) > 3) {
        vehicle.damage(16);
        vehicle.speed *= 0.45;
        return true;
      }
    }
    return false;
  }

  colliders() {
    const out = [];
    for (const b of this.blocks) {
      out.push({ x: b.x, z: b.z, hw: 8.6, hd: 2.4 });
    }
    return out;
  }

  update(t) {
    for (const b of this.blocks) {
      for (const car of b.cars) {
        const bar = car.mesh.userData.lightbar;
        if (bar) {
          const phase = Math.sin(t * 11 + car.pos.x) > 0;
          bar.children[0].material.color.setHex(phase ? 0xff2233 : 0x661118);
          bar.children[1].material.color.setHex(phase ? 0x113366 : 0x2266ff);
        }
      }
    }
  }

  clear() {
    for (const b of this.blocks) {
      for (const car of b.cars) this.scene.remove(car.mesh);
      if (b.barrier) this.scene.remove(b.barrier);
    }
    for (const s of this.spikes) { this.scene.remove(s.mesh); this.scene.remove(s.teeth); }
    this.blocks = [];
    this.spikes = [];
  }
}
