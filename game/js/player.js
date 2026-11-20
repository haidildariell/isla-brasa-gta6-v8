// player.js — Dario Venn on foot: WASD movement relative to the
// camera yaw, a simple run bob, building collision, and the handoff
// into vehicles and the boat. Health/armour live here; damage from
// combat and police goes through hurt() so armour absorbs first.

import * as THREE from 'three';
import { clamp } from './config.js';
import { makePerson } from './pedestrians.js';

export class Player {
  constructor(scene) {
    this.mesh = makePerson(0xff9a3c, 0xc98a5a, 0x22304a);
    // a duffel on the back — Dario's silhouette in every third-person shot
    const duffel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.24),
      new THREE.MeshLambertMaterial({ color: 0x2ee6c8 }));
    duffel.position.set(0, 1.2, -0.3);
    this.mesh.add(duffel);
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(-250, 0, 92);
    this.angle = 0;
    this.hp = 100;
    this.armour = 0;
    this.speed = 0;
    this.inVehicle = null;
    this.inBoat = false;
    this.dead = false;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.pos.x, this.pos.y ?? 0, this.pos.z);
    this.mesh.rotation.y = this.angle;
    this.mesh.visible = !this.inVehicle && !this.inBoat;
  }

  hurt(n) {
    if (this.dead) return;
    const absorbed = Math.min(this.armour, n * 0.65);
    this.armour -= absorbed;
    this.hp -= (n - absorbed);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  heal(n) { this.hp = clamp(this.hp + n, 0, 100); }

  // keys: set of codes; camYaw: camera orbit yaw. Returns speed for bob.
  walk(dt, keys, camYaw, colliders) {
    if (this.inVehicle || this.inBoat || this.dead) return 0;
    let ix = 0; let iz = 0;
    if (keys.has('KeyW')) iz -= 1;
    if (keys.has('KeyS')) iz += 1;
    if (keys.has('KeyA')) ix -= 1;
    if (keys.has('KeyD')) ix += 1;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const sp = run ? 8.4 : 5.2;
    this.speed = (ix || iz) ? sp : 0;
    if (ix || iz) {
      const len = Math.hypot(ix, iz);
      const lx = ix / len; const lz = iz / len;
      const sin = Math.sin(camYaw); const cos = Math.cos(camYaw);
      const wx = lx * cos - lz * sin;
      const wz = lx * sin + lz * cos;
      const nx = this.pos.x + wx * sp * dt;
      const nz = this.pos.z + wz * sp * dt;
      let blocked = false;
      for (const c of colliders) {
        if (Math.abs(nx - c.x) < c.hw + 0.5 && Math.abs(nz - c.z) < c.hd + 0.5) { blocked = true; break; }
      }
      if (!blocked) {
        this.pos.x = clamp(nx, -350, 350);
        this.pos.z = clamp(nz, -336, 160);
      }
      this.angle = Math.atan2(wx, wz);
    }
    this.syncMesh();
    return this.speed;
  }

  respawn(x, z) {
    this.hp = 100;
    this.dead = false;
    this.inVehicle = null;
    this.inBoat = false;
    this.pos.set(x, 0, z);
    this.syncMesh();
  }
}
