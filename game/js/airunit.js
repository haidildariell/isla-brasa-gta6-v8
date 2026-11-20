// airunit.js — FALCON, the BBPD helicopter that joins at 4 stars.
// It shadows the target from 26 units up, banks into turns, and throws
// a visible spotlight cone + ground pool that the player has to break
// out of. At 5 stars it also calls the target's position to dispatch
// twice as fast (handled via police heat in game.js).

import * as THREE from 'three';
import { clamp } from './config.js';

export function makeHeliMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x22304f, shininess: 80 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 5.4), bodyMat);
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.4, 5.44),
    new THREE.MeshBasicMaterial({ color: 0xffd23c }));
  stripe.position.y = -0.3;
  g.add(stripe);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), bodyMat);
  tail.position.set(0, 0.3, 4.6);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.7), bodyMat);
  fin.position.set(0, 0.7, 6.8);
  g.add(fin);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x11131f }));
  rotor.position.y = 1.15;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x11131f }));
  tailRotor.position.set(0.35, 0.7, 6.8);
  g.add(tailRotor);
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x0e0e16 });
  for (const s of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.4), skidMat);
    skid.position.set(s * 1.1, -1.15, 0);
    g.add(skid);
  }
  g.userData = { rotor, tailRotor };
  return g;
}

export class AirUnit {
  constructor(scene) {
    this.mesh = makeHeliMesh();
    this.active = false;
    this.pos = new THREE.Vector3(0, 30, 0);
    this.angle = 0;
    // Spotlight: translucent cone + bright pool disc on the ground.
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(9, 30, 20, 1, true), coneMat);
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(8.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.3, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.cone.visible = false;
    this.pool.visible = false;
    scene.add(this.mesh, this.cone, this.pool);
  }

  setActive(on) {
    this.active = on;
    this.mesh.visible = on;
    this.cone.visible = on;
    this.pool.visible = on;
  }

  update(dt, target, t) {
    if (!this.active) return;
    const hoverX = target.x + Math.sin(t * 0.24) * 9;
    const hoverZ = target.z + Math.cos(t * 0.19) * 9;
    this.pos.x += (hoverX - this.pos.x) * clamp(dt * 1.6, 0, 1);
    this.pos.z += (hoverZ - this.pos.z) * clamp(dt * 1.6, 0, 1);
    this.pos.y = this.holdY !== undefined ? this.holdY : 27 + Math.sin(t * 0.8) * 1.4;
    const want = Math.atan2(-(target.x - this.pos.x), -(target.z - this.pos.z));
    let diff = want - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * clamp(dt * 1.4, 0, 1);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle;
    this.mesh.rotation.z = clamp(diff * -0.4, -0.35, 0.35);
    this.mesh.userData.rotor.rotation.y = t * 31;
    this.mesh.userData.tailRotor.rotation.x = t * 41;
    // Spotlight tracks the target, lagging a touch so escapes feel fair.
    this.cone.position.set(
      (this.pos.x + target.x) / 2, this.pos.y - 14.4, (this.pos.z + target.z) / 2,
    );
    this.cone.rotation.z = (target.x - this.pos.x) * 0.012;
    this.cone.rotation.x = -(target.z - this.pos.z) * 0.012;
    this.pool.position.set(target.x, 0.22, target.z);
  }
}
