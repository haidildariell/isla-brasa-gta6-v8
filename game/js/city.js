// city.js — Brasa Bay itself: ground, the curved beach boulevard, the
// street grid, pastel saturated buildings with lit windows, palms,
// lamps, the Las Palmas market, the marina pier and the safehouse.
// Returns colliders and landmark positions the other systems use.

import * as THREE from 'three';
import { WORLD, PALETTE, boulevardZ, mulberry32 } from './config.js';

const rng = mulberry32(77003);

function roadTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#453040';
  g.fillRect(0, 0, 128, 256);
  // warm wear patches so the asphalt never reads flat black
  g.fillStyle = 'rgba(255,170,110,0.06)';
  for (let i = 0; i < 26; i += 1) g.fillRect(rng() * 128, rng() * 256, 14 + rng() * 30, 8 + rng() * 18);
  g.fillStyle = '#f7e8c8';
  g.fillRect(4, 0, 3, 256);
  g.fillRect(121, 0, 3, 256);
  g.fillStyle = '#ffd23c';
  g.fillRect(61, 12, 6, 62);
  g.fillRect(61, 140, 6, 62);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(32, 0, 2, 256);
  g.fillRect(94, 0, 2, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const PASTELS = [0xff9e7a, 0xffc46b, 0xff7d9c, 0x7fd8c9, 0xa8b8ff, 0xf7e3a1, 0xffab5e, 0x9fe08a, 0xe8a2ff, 0x7cc4ff];

function facadeTextures(baseHex) {
  const base = new THREE.Color(baseHex);
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = `#${base.getHexString()}`;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.fillRect(0, 0, 128, 14);
  const ev = document.createElement('canvas');
  ev.width = 128; ev.height = 256;
  const e = ev.getContext('2d');
  e.fillStyle = '#000';
  e.fillRect(0, 0, 128, 256);
  for (let y = 24; y < 240; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const lit = rng() > 0.38;
      g.fillStyle = lit ? '#ffe9a8' : 'rgba(30,24,60,0.75)';
      g.fillRect(x, y, 12, 14);
      if (lit) {
        e.fillStyle = rng() > 0.3 ? '#ffb84e' : '#ffd98a';
        e.fillRect(x, y, 12, 14);
      }
    }
  }
  const map = new THREE.CanvasTexture(cv);
  const emissiveMap = new THREE.CanvasTexture(ev);
  return { map, emissiveMap };
}

export const LANDMARKS = {
  safehouse: { x: -262, z: 96 },
  pierEnd: { x: -262, z: 208 },
  market: { x: 92, z: 126 },
  plaza: { x: -64, z: -84 },
  regent: { x: 252, z: -168 },
  vault: { x: 236, z: -246 },
};

export function buildCity(scene) {
  const group = new THREE.Group();
  const colliders = [];

  // ---- ground base: warm city soil, bright sand, plaza stone ----
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 560),
    new THREE.MeshLambertMaterial({ color: 0x8a6248 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, -0.05, -60);
  group.add(base);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 64),
    new THREE.MeshLambertMaterial({ color: PALETTE.sandLight }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, WORLD.beachZ + 14);
  group.add(sand);

  const boardwalk = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 13),
    new THREE.MeshLambertMaterial({ color: PALETTE.boardwalk }),
  );
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(85, 0.06, 126);
  group.add(boardwalk);

  // ---- roads ----
  const roadTex = roadTexture();
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  function roadStrip(w, l, x, z, rotY, repeat) {
    const t = roadTex.clone();
    t.needsUpdate = true;
    t.repeat.set(1, repeat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshLambertMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, 0.04, z);
    group.add(m);
    return m;
  }
  for (const ax of WORLD.avenues) roadStrip(16, 440, ax, -112, 0, 26);
  for (const sz of WORLD.streets) roadStrip(16, 690, 0, sz, Math.PI / 2, 40);
  // boulevard: chained segments hugging the sine curve
  for (let x = -352; x < 352; x += 16) {
    const zc = boulevardZ(x + 8);
    const slope = Math.atan((boulevardZ(x + 16) - boulevardZ(x)) / 16);
    roadStrip(17, 17.5, x + 8, zc, -slope, 1);
  }

  // sidewalks: pale ribbons flanking avenues
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.walkway });
  for (const ax of WORLD.avenues) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3, 440), walkMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(ax + s * 9.6, 0.05, -112);
      group.add(w);
    }
  }

  // ---- buildings per block ----
  const facades = PASTELS.map((c) => facadeTextures(c));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a4a52 });
  for (let bi = 0; bi < WORLD.avenues.length - 1; bi += 1) {
    for (let bj = 0; bj < WORLD.streets.length; bj += 1) {
      const x0 = WORLD.avenues[bi] + 13;
      const x1 = WORLD.avenues[bi + 1] - 13;
      const zTop = bj === 0 ? WORLD.northEdge + 8 : WORLD.streets[bj - 1] + 13;
      const zBot = WORLD.streets[bj] - 13;
      const cx = (x0 + x1) / 2;
      const cz = (zTop + zBot) / 2;
      const financial = cx > 178;
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k += 1) {
        const bw = 16 + rng() * 18;
        const bd = 14 + rng() * 16;
        const bh = financial ? 34 + rng() * 46 : 11 + rng() * 17;
        const bx = cx + (rng() - 0.5) * Math.max(4, (x1 - x0) - bw - 6);
        const bz = cz + (rng() - 0.5) * Math.max(4, (zBot - zTop) - bd - 6);
        const f = facades[Math.floor(rng() * facades.length)];
        const mat = new THREE.MeshLambertMaterial({
          map: f.map, emissive: 0xffffff, emissiveMap: f.emissiveMap, emissiveIntensity: 0.85,
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd),
          [mat, mat, roofMat, roofMat, mat, mat]);
        b.position.set(bx, bh / 2, bz);
        group.add(b);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.4, 2.2, bd * 0.4),
          new THREE.MeshLambertMaterial({ color: 0x5d3a44 }));
        cap.position.set(bx, bh + 1.1, bz);
        group.add(cap);
        colliders.push({ x: bx, z: bz, hw: bw / 2 + 0.6, hd: bd / 2 + 0.6 });
      }
    }
  }

  // Regent Hotel tower — the job-6/9 landmark, taller, signed.
  const regent = new THREE.Mesh(new THREE.BoxGeometry(30, 64, 26),
    new THREE.MeshLambertMaterial({ color: 0xd9c6ff, emissive: 0x8f7bff, emissiveIntensity: 0.25 }));
  regent.position.set(LANDMARKS.regent.x, 32, LANDMARKS.regent.z);
  group.add(regent);
  colliders.push({ x: LANDMARKS.regent.x, z: LANDMARKS.regent.z, hw: 16, hd: 14 });
  group.add(makeSign('REGENT HOTEL', 0xff5d7e, LANDMARKS.regent.x, 52, LANDMARKS.regent.z + 14));

  // ---- palms along boulevard + beach ----
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6844 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 7, 6);
  const frondGeo = new THREE.ConeGeometry(3.4, 1.6, 7);
  for (let x = -340; x <= 340; x += 17) {
    for (const side of [-1, 1]) {
      if (rng() < 0.18) continue;
      const px = x + (rng() - 0.5) * 4;
      const pz = boulevardZ(px) + side * 13.5;
      addPalm(group, trunkGeo, frondGeo, trunkMat, frondMat, px, pz);
    }
  }
  for (let i = 0; i < 26; i += 1) {
    addPalm(group, trunkGeo, frondGeo, trunkMat, frondMat,
      -330 + rng() * 660, WORLD.beachZ + 2 + rng() * 16);
  }

  // ---- street lamps with warm glow sprites ----
  const lampGlow = makeGlowSprite(0xffc37a);
  const lampHeads = [];
  for (const ax of WORLD.avenues) {
    for (let z = -300; z <= 60; z += 55) lampHeads.push([ax + 10.5, z]);
  }
  for (let x = -330; x <= 330; x += 44) lampHeads.push([x, boulevardZ(x) - 11]);
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.6, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c3444 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  for (const [lx, lz] of lampHeads) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(lx, 2.8, lz);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), headMat);
    head.position.set(lx, 5.7, lz);
    group.add(head);
    const s = lampGlow.clone();
    s.position.set(lx, 5.7, lz);
    group.add(s);
  }

  buildMarket(group, colliders);
  buildPier(group);

  scene.add(group);
  return {
    group, colliders,
    update(t) { /* neon shimmer handled by shared materials */ void t; },
  };
}

function addPalm(group, trunkGeo, frondGeo, trunkMat, frondMat, x, z) {
  const lean = (rng() - 0.5) * 0.14;
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, 3.5, z);
  trunk.rotation.z = lean;
  group.add(trunk);
  const top = new THREE.Mesh(frondGeo, frondMat);
  top.position.set(x + lean * -7, 7.3, z);
  group.add(top);
}

function makeGlowSprite(color) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,220,150,0.9)');
  grad.addColorStop(1, 'rgba(255,180,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), color, transparent: true, depthWrite: false,
  }));
  sp.scale.setScalar(7);
  return sp;
}

export function makeSign(text, colorHex, x, y, z) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(20,8,30,0.92)';
  g.fillRect(0, 0, 512, 96);
  g.font = '900 52px Verdana';
  g.textAlign = 'center';
  g.fillStyle = `#${new THREE.Color(colorHex).getHexString()}`;
  g.shadowColor = g.fillStyle;
  g.shadowBlur = 18;
  g.fillText(text, 256, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
  m.position.set(x, y, z);
  return m;
}

// Las Palmas market: stalls, striped umbrellas, crates on the boardwalk.
function buildMarket(group, colliders) {
  const stallCols = [0xff5d7e, 0xffd23c, 0x2ee6c8, 0xff9a3c, 0x8f7bff, 0x7dff8a];
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa4763e });
  for (let i = 0; i < 9; i += 1) {
    const sx = 26 + i * 16;
    const sz = 121 + (i % 2) * 9;
    const col = stallCols[i % stallCols.length];
    const counter = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.6, 3),
      new THREE.MeshLambertMaterial({ color: 0xd9b48c }));
    counter.position.set(sx, 0.8, sz);
    group.add(counter);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.8, 4),
      new THREE.MeshLambertMaterial({ color: col }));
    canopy.position.set(sx, 3.6, sz);
    canopy.rotation.y = Math.PI / 4;
    group.add(canopy);
    for (const dx of [-2.8, 2.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 5),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2e }));
      post.position.set(sx + dx, 1.4, sz);
      group.add(post);
    }
    for (let c = 0; c < 3; c += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
      crate.position.set(sx - 2 + c * 1.6, 2.15, sz + (c % 2) * 0.6 - 0.4);
      crate.rotation.y = rng() * 0.8;
      group.add(crate);
    }
    colliders.push({ x: sx, z: sz, hw: 3.4, hd: 1.8 });
  }
  group.add(makeSign('MERCADO LAS PALMAS', 0xffd23c, 92, 6.4, 116));
}

// Marina pier: deck planks out over the water, safehouse hut at its root.
function buildPier(group) {
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x9a744e });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(13, 0.7, 92), deckMat);
  deck.position.set(LANDMARKS.safehouse.x, 0.7, 158);
  group.add(deck);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 9),
    new THREE.MeshLambertMaterial({ color: 0x2ee6c8, emissive: 0x0d5a4e, emissiveIntensity: 0.6 }));
  hut.position.set(LANDMARKS.safehouse.x, 2.5, LANDMARKS.safehouse.z);
  group.add(hut);
  group.add(makeSign('SAFEHOUSE · GARAGE [G]', 0x2ee6c8, LANDMARKS.safehouse.x, 6.4, LANDMARKS.safehouse.z + 5));
  for (let i = 0; i < 7; i += 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.4, 6), deckMat);
    post.position.set(LANDMARKS.safehouse.x + (i % 2 ? 6 : -6), -0.6, 122 + i * 13);
    group.add(post);
  }
}
