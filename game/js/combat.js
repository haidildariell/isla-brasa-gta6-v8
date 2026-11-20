// combat.js — Los Corales gunmen: street soldiers with floating
// health bars who take cover positions, strafe, and trade tracer fire
// with the player. Used by story jobs (Coral Kings, Turf War) and by
// free-roam ambushes in Old Town. Player fire is hitscan from the
// camera aim; gang fire is probabilistic with visible tracers.

import * as THREE from 'three';
import { clamp, dist2d } from './config.js';
import { makePerson } from './pedestrians.js';

function healthBarSprite() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 10;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(2.2, 0.34, 1);
  return { sp, cv, tex };
}

function paintBar(bar, frac) {
  const g = bar.cv.getContext('2d');
  g.fillStyle = 'rgba(10,6,16,0.85)';
  g.fillRect(0, 0, 64, 10);
  g.fillStyle = frac > 0.45 ? '#7dff8a' : frac > 0.22 ? '#ffd23c' : '#ff4d5e';
  g.fillRect(1, 1, 62 * clamp(frac, 0, 1), 8);
  bar.tex.needsUpdate = true;
}

export class GangSquad {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.members = [];
    this.fireTimer = 0;
  }

  spawn(x, z, count = 4, hp = 60) {
    const spawned = [];
    for (let i = 0; i < count; i += 1) {
      const mesh = makePerson(0x8f1d2c, [0xf2c49b, 0xc98a5a, 0x8a5a34][i % 3], 0x181824);
      const gx = x + (i % 3 - 1) * 5.5;
      const gz = z + Math.floor(i / 3) * 5 - 2;
      mesh.position.set(gx, 0, gz);
      this.scene.add(mesh);
      const bar = healthBarSprite();
      bar.sp.position.set(gx, 2.35, gz);
      this.scene.add(bar.sp);
      paintBar(bar, 1);
      const m = {
        mesh, bar, x: gx, z: gz, hp, maxHp: hp, alive: true,
        strafeDir: i % 2 ? 1 : -1, phase: i * 1.7, fireCd: 1 + i * 0.4,
      };
      this.members.push(m);
      spawned.push(m);
    }
    return spawned;
  }

  aliveCount() { return this.members.filter((m) => m.alive).length; }

  // Player shot: nearest living member within range of the aim point.
  playerShoot(origin, angle, weapon, onKill) {
    let best = null;
    let bestScore = Infinity;
    for (const m of this.members) {
      if (!m.alive) continue;
      const d = dist2d(origin.x, origin.z, m.x, m.z);
      if (d > weapon.range) continue;
      const want = Math.atan2(-(m.x - origin.x), -(m.z - origin.z));
      let diff = Math.abs(want - angle);
      while (diff > Math.PI) diff = Math.PI * 2 - diff;
      const score = diff * 30 + d * 0.12;
      if (diff < 0.24 && score < bestScore) { best = m; bestScore = score; }
    }
    const reach = best ? { x: best.x, z: best.z } : {
      x: origin.x - Math.sin(angle) * Math.min(26, weapon.range),
      z: origin.z - Math.cos(angle) * Math.min(26, weapon.range),
    };
    this.fx.tracer(origin, reach, false);
    this.fx.muzzle(origin, angle);
    if (best) {
      best.hp -= weapon.dmg;
      paintBar(best.bar, best.hp / best.maxHp);
      this.fx.burst(best.x, 1.3, best.z, 0xff5d7e, 5, 2.2);
      if (best.hp <= 0) {
        best.alive = false;
        best.mesh.rotation.x = Math.PI / 2;
        best.mesh.position.y = 0.25;
        best.bar.sp.visible = false;
        this.fx.burst(best.x, 1, best.z, 0xffd23c, 12, 3.6);
        onKill?.(best);
      }
      return true;
    }
    return false;
  }

  update(dt, t, playerPos, onPlayerHit) {
    this.fireTimer -= dt;
    for (const m of this.members) {
      if (!m.alive) continue;
      const d = dist2d(m.x, m.z, playerPos.x, playerPos.z);
      // Strafe sideways around their anchor, keep facing the player.
      m.phase += dt;
      const sx = m.x + Math.sin(m.phase * 0.9) * 0.012 * m.strafeDir;
      m.x = sx;
      m.mesh.position.set(m.x, Math.abs(Math.sin(t * 6 + m.phase)) * 0.04, m.z);
      m.mesh.rotation.y = Math.atan2(playerPos.x - m.x, playerPos.z - m.z);
      m.bar.sp.position.set(m.x, 2.35, m.z);
      m.fireCd -= dt;
      if (m.fireCd <= 0 && d < 42 && d > 3) {
        m.fireCd = 0.9 + Math.random() * 1.1;
        this.fx.tracer({ x: m.x, y: 1.35, z: m.z }, { x: playerPos.x, y: 1.2, z: playerPos.z }, true);
        this.audio.shot('smg');
        // Accuracy falls off with distance and player speed.
        const hitChance = clamp(0.42 - d * 0.006, 0.08, 0.4);
        if (Math.random() < hitChance) onPlayerHit(5 + Math.random() * 6);
        else this.fx.burst(playerPos.x + (Math.random() - 0.5) * 3, 0.4, playerPos.z + (Math.random() - 0.5) * 3, 0xd9b48c, 3, 1.4);
      }
    }
  }

  clear() {
    for (const m of this.members) {
      this.scene.remove(m.mesh);
      this.scene.remove(m.bar.sp);
    }
    this.members = [];
  }
}
