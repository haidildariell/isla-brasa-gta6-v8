// vehicles.js — car meshes (built from boxes, but shaped: nose, cabin,
// wheels, lit lamps, soft blob shadow) and the arcade Vehicle physics
// every driver in the game shares: player, traffic, police, rivals.

import * as THREE from 'three';
import { clamp, angleLerp } from './config.js';

const shadowTex = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    grad.addColorStop(0, 'rgba(20,8,16,0.55)');
    grad.addColorStop(1, 'rgba(20,8,16,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    tex = new THREE.CanvasTexture(cv);
    return tex;
  };
})();

export const CAR_MODELS = {
  comet: { name: 'Comet GT', w: 2.0, l: 4.4, top: 46, accel: 22, grip: 3.4 },
  sedan: { name: 'Palma Sedan', w: 2.0, l: 4.6, top: 36, accel: 15, grip: 2.8 },
  taxi: { name: 'Brasa Cab', w: 2.0, l: 4.6, top: 36, accel: 15, grip: 2.8 },
  van: { name: 'Coral Van', w: 2.2, l: 5.2, top: 30, accel: 12, grip: 2.4 },
  cruiser: { name: 'BBPD Cruiser', w: 2.05, l: 4.8, top: 44, accel: 21, grip: 3.2 },
  rival: { name: 'Corales Fang', w: 2.0, l: 4.5, top: 43, accel: 20, grip: 3.2 },
};

export function makeCarMesh(modelKey, colorHex) {
  const spec = CAR_MODELS[modelKey];
  const g = new THREE.Group();
  const paint = new THREE.MeshPhongMaterial({ color: colorHex, shininess: 90, specular: 0xffcf9a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1626 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x2a3d66, shininess: 160, specular: 0xffe0b0 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.62, spec.l), paint);
  body.position.y = 0.62;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.92, 0.4, 0.9), paint);
  nose.position.set(0, 0.5, -spec.l / 2 + 0.3);
  g.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.82, 0.55, spec.l * 0.44), glass);
  cabin.position.set(0, 1.16, 0.18);
  g.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheels = [];
  for (const [wx, wz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx * (spec.w / 2 - 0.05), 0.36, wz * (spec.l / 2 - 0.85));
    wheels.push(w);
    g.add(w);
  }

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), lightMat);
    hl.position.set(s * spec.w * 0.3, 0.62, -spec.l / 2 - 0.02);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff2a3c }));
    tl.position.set(s * spec.w * 0.3, 0.66, spec.l / 2 + 0.02);
    g.add(tl);
  }

  const blob = new THREE.Mesh(new THREE.PlaneGeometry(spec.w + 1.7, spec.l + 1.7),
    new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.06;
  g.add(blob);

  let lightbar = null;
  if (modelKey === 'cruiser') {
    lightbar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xff2233 }));
    red.position.x = -0.32;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.x = 0.32;
    lightbar.add(red, blue);
    lightbar.position.set(0, 1.52, 0.18);
    g.add(lightbar);
    const band = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.02, 0.3, spec.l * 0.5),
      new THREE.MeshBasicMaterial({ color: 0xf4f6ff }));
    band.position.y = 0.64;
    g.add(band);
  }
  if (modelKey === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffd23c }));
    sign.position.set(0, 1.52, 0.18);
    g.add(sign);
  }

  g.userData = { wheels, lightbar, paintMat: paint };
  return g;
}

export class Vehicle {
  constructor(modelKey, colorHex, x, z, angle = 0) {
    this.spec = CAR_MODELS[modelKey];
    this.modelKey = modelKey;
    this.mesh = makeCarMesh(modelKey, colorHex);
    this.pos = new THREE.Vector3(x, 0, z);
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.condition = 100;
    this.nitro = 1;
    this.hasNitro = false;
    this.armour = 0;
    this.dead = false;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle;
  }

  // input: {throttle -1..1, steer -1..1, brake, nitro}
  drive(dt, input, colliders) {
    if (this.dead) { this.speed = 0; this.syncMesh(); return; }
    const s = this.spec;
    if (input.throttle > 0) this.speed += s.accel * input.throttle * dt;
    else if (input.throttle < 0) this.speed += s.accel * 0.62 * input.throttle * dt;
    const drag = input.brake ? 3.2 : 0.55;
    this.speed -= this.speed * drag * dt;
    if (!input.throttle) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 4 * dt);
    let top = s.top;
    if (input.nitro && this.hasNitro && this.nitro > 0 && this.speed > 4) {
      top *= 1.45;
      this.nitro = Math.max(0, this.nitro - dt * 0.55);
    } else {
      this.nitro = Math.min(1, this.nitro + dt * 0.05);
    }
    this.speed = clamp(this.speed, -s.top * 0.38, top);
    this.steer = angleLerp(this.steer, (input.steer ?? 0) * 0.55, 0.35);
    if (Math.abs(this.speed) > 0.4) {
      const turn = this.steer * s.grip * dt * clamp(this.speed / 12, -1, 1);
      this.angle += turn * (this.speed >= 0 ? 1 : -1);
    }
    // Forward is local -z; world heading for rotation.y = angle:
    const fx = -Math.sin(this.angle);
    const fz = -Math.cos(this.angle);
    const mx = this.pos.x + fx * this.speed * dt;
    const mz = this.pos.z + fz * this.speed * dt;
    let blocked = false;
    for (const c of colliders) {
      if (Math.abs(mx - c.x) < c.hw + 1.1 && Math.abs(mz - c.z) < c.hd + 1.1) { blocked = true; break; }
    }
    if (blocked) {
      if (Math.abs(this.speed) > 9) this.damage(Math.abs(this.speed) * 0.55);
      this.speed *= -0.25;
    } else {
      this.pos.x = clamp(mx, -352, 352);
      this.pos.z = clamp(mz, -338, 235);
    }
    const spin = this.speed * dt / 0.36;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
    this.syncMesh();
  }

  damage(n) {
    const eff = Math.max(2, n - this.armour * 0.4);
    this.condition = Math.max(0, this.condition - eff);
    if (this.condition <= 0) this.dead = true;
  }

  repair(full = true) {
    if (full) { this.condition = 100; this.dead = false; }
    else this.condition = Math.min(100, this.condition + 40);
  }

  get kmh() { return Math.round(Math.abs(this.speed) * 3.6); }
}
