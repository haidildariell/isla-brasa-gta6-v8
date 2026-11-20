// sky.js — the golden-hour sky: a big gradient dome (burnt orange at
// the horizon, rose band, violet-blue zenith), a low sun disc with a
// soft glow sprite, and slow drifting cloud cards. Fog colour is set
// by game.js to match the horizon so distance melts into the sunset.

import * as THREE from 'three';

export function buildSky(scene) {
  const group = new THREE.Group();

  // Gradient dome via vertex colours on a back-side sphere.
  const geo = new THREE.SphereGeometry(1500, 24, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const horizon = new THREE.Color(0xff8a3c);
  const mid = new THREE.Color(0xe85d8a);
  const zenith = new THREE.Color(0x2c3e8f);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) / 1500;
    if (y < 0.16) tmp.copy(horizon).lerp(mid, Math.max(0, y) / 0.16);
    else tmp.copy(mid).lerp(zenith, Math.min(1, (y - 0.16) / 0.55));
    if (y < 0) tmp.copy(horizon).multiplyScalar(0.85);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  group.add(dome);

  // Sun: bright disc low over the sea (south, +z) plus a halo sprite.
  const sunDir = new THREE.Vector3(-0.28, 0.16, 1).normalize();
  const sunPos = sunDir.clone().multiplyScalar(1380);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
  );
  disc.position.copy(sunPos);
  disc.lookAt(0, 40, 0);
  group.add(disc);

  const glowTex = makeGlowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffa04e, transparent: true, opacity: 0.85,
    fog: false, depthWrite: false,
  }));
  glow.position.copy(sunPos);
  glow.scale.setScalar(620);
  group.add(glow);

  // Cloud cards: flat warm-lit ellipses drifting very slowly.
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffbe92, transparent: true, opacity: 0.32, fog: false, depthWrite: false,
  });
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), cloudMat);
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.4;
    c.position.set(Math.cos(a) * 1050, 190 + (i % 5) * 46, Math.sin(a) * 1050);
    c.scale.set(150 + (i % 4) * 60, 15 + (i % 3) * 6, 42);
    clouds.push(c);
    group.add(c);
  }

  scene.add(group);
  return {
    group,
    sunDirection: sunDir,
    update(t) {
      clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.01 + i) * 0.012; });
      glow.material.opacity = 0.8 + Math.sin(t * 0.7) * 0.05;
    },
  };
}

function makeGlowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,230,170,0.95)');
  grad.addColorStop(0.35, 'rgba(255,160,80,0.55)');
  grad.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}
