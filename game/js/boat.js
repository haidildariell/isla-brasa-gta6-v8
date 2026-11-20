// boat.js — the Mako speedboat berthed at the marina pier. Drivable:
// throttle planes it up onto the swell, steering carves wide turns,
// and beaching (or the pier posts) ends the ride. Job 7 rides it.

import * as THREE from 'three';
import { clamp, angleLerp } from './config.js';
import { sampleWave } from './ocean.js';

export function makeBoatMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 7.6),
    new THREE.MeshPhongMaterial({ color: 0xff5d7e, shininess: 110, specular: 0xffd9a0 }));
  hull.position.y = 0.55;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4),
    new THREE.MeshPhongMaterial({ color: 0xff5d7e, shininess: 110 }));
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.55, -4.6);
  g.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 4.6),
    new THREE.MeshLambertMaterial({ color: 0xf7e3a1 }));
  deck.position.set(0, 1.12, 0.7);
  g.add(deck);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x1c1626 }));
  motor.position.set(0, 0.9, 3.9);
  g.add(motor);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 10.6),
    new THREE.MeshBasicMaterial({ color: 0x0a2e3e, transparent: true, opacity: 0.35, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -0.25;
  g.add(blob);
  return g;
}

export class Boat {
  constructor(scene) {
    this.mesh = makeBoatMesh();
    this.pos = new THREE.Vector3(-252, 0, 196);
    this.angle = Math.PI; // bow pointing back toward the pier channel
    this.speed = 0;
    this.occupied = false;
    scene.add(this.mesh);
    this.sync(0);
  }

  sync(t) {
    const bob = sampleWave(this.pos.x, this.pos.z, t);
    this.mesh.position.set(this.pos.x, 0.25 + bob * 0.7, this.pos.z);
    this.mesh.rotation.y = this.angle;
    this.mesh.rotation.z = Math.sin(t * 0.9 + this.pos.x) * 0.03 + this.heel;
    this.mesh.rotation.x = -clamp(this.speed * 0.006, -0.05, 0.12);
  }

  drive(dt, input, t) {
    this.heel = angleLerp(this.heel ?? 0, (input.steer ?? 0) * -0.16, 0.1);
    if (input.throttle > 0) this.speed += 13 * dt;
    else if (input.throttle < 0) this.speed -= 9 * dt;
    this.speed -= this.speed * 0.5 * dt;
    this.speed = clamp(this.speed, -6, 24);
    if (Math.abs(this.speed) > 0.5) {
      this.angle += (input.steer ?? 0) * 0.55 * dt * Math.sign(this.speed);
    }
    const fx = -Math.sin(this.angle);
    const fz = -Math.cos(this.angle);
    const nx = this.pos.x + fx * this.speed * dt;
    const nz = this.pos.z + fz * this.speed * dt;
    if (nz > 158 && nz < 420 && nx > -420 && nx < 420) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else {
      this.speed *= 0.4; // soft beach / world edge
    }
    this.sync(t);
  }
}
