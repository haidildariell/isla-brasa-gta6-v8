// effects.js — cheap, bright feedback: tracer lines, muzzle flashes,
// hit sparks, cash-pop particles, nitro flame and damage smoke. All
// pooled meshes with lifetimes, no per-frame allocation in the loop.

import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.flashes = [];
    this.particles = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true });
    this.enemyTracerMat = new THREE.LineBasicMaterial({ color: 0xff5d7e, transparent: true });
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true });
    this.pool = [];
    for (let i = 0; i < 60; i += 1) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true }));
      p.visible = false;
      scene.add(p);
      this.pool.push({ mesh: p, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    this.poolIdx = 0;
  }

  tracer(from, to, enemy = false) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y ?? 1.3, from.z),
      new THREE.Vector3(to.x, to.y ?? 1.2, to.z),
    ]);
    const line = new THREE.Line(geo, enemy ? this.enemyTracerMat : this.tracerMat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.07 });
  }

  muzzle(pos, angle) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), this.flashMat.clone());
    m.position.set(pos.x - Math.sin(angle) * 0.8, 1.35, pos.z - Math.cos(angle) * 0.8);
    m.scale.set(1, 0.7, 1.6);
    this.scene.add(m);
    this.flashes.push({ mesh: m, life: 0.05 });
  }

  burst(x, y, z, color, n = 8, spread = 3.2) {
    for (let i = 0; i < n; i += 1) {
      const p = this.pool[this.poolIdx];
      this.poolIdx = (this.poolIdx + 1) % this.pool.length;
      p.mesh.material.color.setHex(color);
      p.mesh.position.set(x, y, z);
      p.mesh.visible = true;
      p.life = 0.4 + Math.random() * 0.3;
      p.vx = (Math.random() - 0.5) * spread;
      p.vy = 2 + Math.random() * 3;
      p.vz = (Math.random() - 0.5) * spread;
    }
  }

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
      const f = this.flashes[i];
      f.life -= dt;
      f.mesh.material.opacity = Math.max(0, f.life / 0.05);
      if (f.life <= 0) { this.scene.remove(f.mesh); this.flashes.splice(i, 1); }
    }
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 9 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = Math.max(0, p.life / 0.6);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }
}
