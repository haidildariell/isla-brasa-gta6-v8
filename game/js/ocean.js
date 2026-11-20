// ocean.js — the bay itself: a large animated water plane south of the
// beach, a foam strip where it meets the sand, and gentle vertex swell
// so the surface catches the sunset. The Mako speedboat floats on the
// same swell function (see boat.js sampleWave).

import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';

export function sampleWave(x, z, t) {
  return Math.sin(x * 0.05 + t * 1.1) * 0.22 + Math.cos(z * 0.07 - t * 0.8) * 0.18;
}

export function buildOcean(scene) {
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(1500, 620, 56, 22);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({
    color: PALETTE.seaDeep, shininess: 140, specular: 0xffb37a,
    transparent: true, opacity: 0.94,
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.set(0, 0.1, WORLD.seaZ + 310);
  group.add(water);

  // Shallow tint band near the shore.
  const shallow = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 46),
    new THREE.MeshBasicMaterial({ color: PALETTE.seaShallow, transparent: true, opacity: 0.5 }),
  );
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.set(0, 0.16, WORLD.seaZ + 8);
  group.add(shallow);

  // Foam line: a row of soft white dashes crawling up the sand.
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xfff6e2, transparent: true, opacity: 0.75 });
  const foam = [];
  for (let i = 0; i < 46; i += 1) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(9 + (i % 4) * 3, 1.1), foamMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(-720 + i * 32, 0.2, WORLD.beachZ + 16);
    foam.push(f);
    group.add(f);
  }

  // A few moored hulls bobbing off the marina pier.
  const hulls = [];
  const hullCols = [0xff6b4a, 0x2ee6c8, 0xffd23c, 0xf2f2f2, 0x8f7bff];
  for (let i = 0; i < 5; i += 1) {
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.6, 2.6),
      new THREE.MeshLambertMaterial({ color: hullCols[i] }),
    );
    h.position.set(-268 + i * 17, 0.7, WORLD.seaZ + 42 + (i % 2) * 14);
    hulls.push(h);
    group.add(h);
  }

  scene.add(group);
  const base = geo.attributes.position.array.slice();
  return {
    group,
    update(t) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        p.setY(i, sampleWave(x, z + WORLD.seaZ + 260, t) * 0.6);
      }
      p.needsUpdate = true;
      foam.forEach((f, i) => {
        f.position.z = WORLD.beachZ + 15 + Math.sin(t * 0.7 + i * 1.3) * 2.4;
        f.material.opacity = 0.75;
      });
      hulls.forEach((h, i) => {
        h.position.y = 0.7 + sampleWave(h.position.x, h.position.z, t) * 0.5;
        h.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.05;
      });
    },
  };
}
