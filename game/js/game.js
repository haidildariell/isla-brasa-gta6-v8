// game.js — ISLA BRASA v8 boot + main loop. Wires every system:
// renderer, golden-hour lighting, city, traffic, crowds, police +
// FALCON + roadblocks + dispatch, combat, missions, races, fares,
// garage, shops, crew, radio, save — and the deterministic staged
// scenes behind ?shot=cover|mission|race|map for the screenshots.

import * as THREE from 'three';
import { WORLD, boulevardZ, clamp, dist2d, KEYS_HINT } from './config.js';
import { buildSky } from './sky.js';
import { buildOcean } from './ocean.js';
import { buildCity, LANDMARKS, makeSign } from './city.js';
import { TrafficSystem } from './traffic.js';
import { PedSystem } from './pedestrians.js';
import { Vehicle } from './vehicles.js';
import { Boat } from './boat.js';
import { Player } from './player.js';
import { PoliceSystem } from './police.js';
import { AirUnit } from './airunit.js';
import { RoadblockSystem } from './roadblocks.js';
import { DispatchFeed } from './dispatch.js';
import { Arsenal } from './weapons.js';
import { GangSquad } from './combat.js';
import { MissionSystem } from './missions.js';
import { RaceSystem, RACES } from './races.js';
import { Activities } from './activities.js';
import { Garage, GARAGE_SERVICES } from './garage.js';
import { SHOPS, shopStock, buildShopfronts, nearestShop } from './shops.js';
import { RankState } from './ranks.js';
import { CrewState } from './crew.js';
import { DistrictTracker } from './districts.js';
import { Radio } from './radio.js';
import { AudioEngine } from './audio.js';
import { Effects } from './effects.js';
import { Hud } from './hud.js';
import { writeSave, readSave, hasSave } from './save.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdd7a4e, 130, 780);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 3200);
camera.position.set(-270, 9, 130);

const hemi = new THREE.HemisphereLight(0xffc98f, 0x6b4460, 0.78);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffa04e, 1.6);
sun.position.set(-180, 130, 420);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xff9a6a, 0.26));

const sky = buildSky(scene);
const ocean = buildOcean(scene);
const city = buildCity(scene);
buildShopfronts(scene);

// ---------------- state ----------------
const hud = new Hud();
const audio = new AudioEngine();
const fx = new Effects(scene);
const state = {
  cash: 250,
  ranks: new RankState(),
  arsenal: new Arsenal(),
  crew: new CrewState(),
  stats: {
    jobsDone: 0, carsStolen: 0, copsEscaped: 0, distanceKm: 0, racesWon: 0,
    faresRun: 0, shotsFired: 0, gangDown: 0, cashEarned: 0, busts: 0,
  },
  flags: {},
  player: null,
};
const player = new Player(scene);
state.player = player;
const districts = new DistrictTracker(hud);
const missions = new MissionSystem();
const garage = new Garage();
const traffic = new TrafficSystem(scene, city.colliders, SHOT ? 10 : 16);
const peds = new PedSystem(scene, SHOT ? 8 : 26);
const boat = new Boat(scene);
const police = new PoliceSystem(scene);
const air = new AirUnit(scene);
const blocks = new RoadblockSystem(scene);
const dispatch = new DispatchFeed();
const gang = new GangSquad(scene, fx, audio);
const races = new RaceSystem(scene);
const activities = new Activities(scene, fx);
const radio = new Radio(audio, hud);

const playerCar = new Vehicle('comet', 0xff5d3c, -238, 84, Math.PI / 2);
scene.add(playerCar.mesh);

// objective marker: gold ring + light shaft
const marker = new THREE.Group();
const markerRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.3, 8, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd23c }));
markerRing.position.y = 2.4;
const markerShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.7, 26, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
markerShaft.position.y = 13;
marker.add(markerRing, markerShaft);
scene.add(marker);

// ---------------- input ----------------
const keys = new Set();
let started = false;
let paused = false;
let wheelOpen = false;
let openShop = null;
let garageOpen = false;
let camYaw = Math.PI * 0.75;
let camPitch = 0.34;
let orbit = 0;
let dragging = false;
let bustTimer = 0;
let fareTimer = 20;
let saveTimer = 15;
let elapsed = 0;
let lastCrime = -99;

addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'Space', 'F5', 'F6', 'F7'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (!started) return;
  if (e.code === 'Escape') { togglePause(); return; }
  if (paused) return;
  if (e.code === 'KeyQ') { wheelOpen = true; hud.showWheel(state); }
  if (e.code === 'KeyT') { radio.cycle(); audio.blip(720, 0.07, 'square', 0.08); }
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (openShop) buyShopRow(n - 1);
    else if (garageOpen && garage.stored[n - 1]) takeStored(n - 1);
    else if (wheelOpen) { if (state.arsenal.select(n - 1, state.ranks.level)) audio.blip(520, 0.05); }
    else crewCall(n);
  }
  if (e.code === 'KeyE') enterExit();
  if (e.code === 'KeyF') interact();
  if (e.code === 'KeyG' && nearSafehouse()) { garageOpen = !garageOpen; if (!garageOpen) hud.hideGarage(); }
  if (e.code === 'KeyR') tryStartRace();
  if (e.code === 'KeyS' && garageOpen) storeCurrent();
  if (garageOpen && e.code === 'KeyR') buyService('repair');
  if (garageOpen && e.code === 'KeyA') buyService('armour');
  if (garageOpen && e.code === 'KeyN') buyService('nitro');
  if (garageOpen && e.code === 'KeyP') buyService('respray');
  if (e.code === 'F5') manualSave(0);
  if (e.code === 'F6') manualSave(1);
  if (e.code === 'F7') manualSave(2);
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'KeyQ') { wheelOpen = false; hud.hideWheel(); }
});
canvas.addEventListener('pointerdown', (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  orbit -= e.movementX * 0.005;
  camPitch = clamp(camPitch + e.movementY * 0.003, 0.08, 1.1);
});
canvas.addEventListener('mousedown', () => { if (started && !paused) shoot(); });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function nearSafehouse() {
  return dist2d(player.pos.x, player.pos.z, LANDMARKS.safehouse.x, LANDMARKS.safehouse.z) < 13;
}

function currentVehicle() { return player.inVehicle; }

function enterExit() {
  if (player.inBoat) {
    player.inBoat = false;
    player.pos.set(boat.pos.x + 3, 0, Math.max(boat.pos.z - 14, 148));
    player.syncMesh();
    return;
  }
  if (player.inVehicle) {
    const v = player.inVehicle;
    player.inVehicle = null;
    player.pos.set(v.pos.x + 2.6, 0, v.pos.z + 1);
    player.syncMesh();
    return;
  }
  // boat first if alongside the pier
  if (dist2d(player.pos.x, player.pos.z, boat.pos.x, boat.pos.z) < 9 || dist2d(player.pos.x, player.pos.z, -262, 156) < 10) {
    player.inBoat = true;
    boat.occupied = true;
    player.syncMesh();
    hud.toast('Mako speedboat — W/S throttle, A/D steer. Mind the shallows.');
    return;
  }
  let best = null; let bd = 5.2;
  const consider = (v, owned) => {
    const d = dist2d(player.pos.x, player.pos.z, v.pos.x, v.pos.z);
    if (d < bd) { bd = d; best = { v, owned }; }
  };
  consider(playerCar, true);
  for (const t of traffic.cars) if (!t.parked && !t.stolen) consider(t.car, false);
  if (races.active) for (const r of races.active.rivals) consider(r.car, false);
  if (best) {
    player.inVehicle = best.v;
    if (!best.owned) {
      state.stats.carsStolen += 1;
      police.addHeat(16);
      hud.toast('Car taken — heat rising');
      for (const t of traffic.cars) if (t.car === best.v) t.stolen = true;
    }
    audio.blip(300, 0.06, 'square', 0.07);
  }
}

function interact() {
  if (openShop) { openShop = null; hud.hideShop(); return; }
  const shop = nearestShop(player.pos.x, player.pos.z);
  if (shop) { openShop = shop; return; }
  if (!missions.active && !missions.done) missions.start(hud);
}

function buyShopRow(i) {
  if (!openShop) return;
  const rows = shopStock(openShop, state);
  const row = rows[i];
  if (!row) return;
  if (row.locked) { hud.toast(`Locked — needs Respect rank`); return; }
  const disc = districts.discount(openShop.district);
  const price = Math.round(row.price * (1 - disc));
  if (state.cash < price) { hud.toast('Not enough cash'); audio.hurt(); return; }
  state.cash -= price;
  row.act();
  audio.cash();
  hud.toast(`Bought: ${row.label} — $${price}`);
}

function storeCurrent() {
  const v = currentVehicle();
  if (!v) { hud.toast('No car to store'); return; }
  if (garage.store(v)) {
    hud.toast(`${v.spec.name} stored in the garage`);
    if (v !== playerCar) { v.mesh.visible = false; }
  } else hud.toast('Garage full (4 cars)');
}

function takeStored(i) {
  const rec = garage.take(i);
  if (!rec) return;
  playerCar.mesh.userData.paintMat.color.setHex(rec.color);
  playerCar.condition = rec.condition;
  playerCar.armour = rec.armour;
  playerCar.hasNitro = rec.hasNitro;
  playerCar.pos.set(LANDMARKS.safehouse.x + 6, 0, LANDMARKS.safehouse.z - 6);
  playerCar.syncMesh();
  playerCar.mesh.visible = true;
  hud.toast(`${rec.name} rolled out — COND ${rec.condition}%`);
}

function buyService(id) {
  const v = currentVehicle() ?? (nearSafehouse() ? playerCar : null);
  const svc = GARAGE_SERVICES.find((s) => s.id === id);
  const res = garage.buy(id, v, state);
  hud.toast(res.why);
  if (res.ok) {
    audio.cash();
    if (id === 'respray') { police.setWanted(Math.max(0, police.wanted - 1)); police.heat = Math.max(0, police.heat - 30); }
    void svc;
  }
}

function crewCall(n) {
  const ability = ['plates', 'fix', 'eyes'][n - 1];
  if (!ability) return;
  if (!state.crew.use(ability, elapsed, state.ranks.level)) {
    hud.toast('Crew still cooling down');
    return;
  }
  if (ability === 'plates') {
    police.setWanted(Math.max(0, police.wanted - 2));
    police.heat = 0;
    if (police.wanted === 0) { police.clear(); state.stats.copsEscaped += 1; }
    hud.showDialog('Tomas Rey', 'Plates swapped, boss. Whoever they were chasing is a ghost now.');
  }
  if (ability === 'fix') {
    const v = currentVehicle() ?? playerCar;
    v.repair(false);
    fx.burst(v.pos.x, 1.2, v.pos.z, 0x2ee6c8, 12, 3);
    hud.showDialog('Tomas Rey', 'Patched her up on the move. She will hold — probably.');
  }
  if (ability === 'eyes') {
    hud.showDialog('Lio Park', 'Eyes out: every badge and every rival is lit on your map for twelve seconds.');
  }
  audio.blip(940, 0.08, 'triangle', 0.1);
}

function tryStartRace() {
  const v = currentVehicle();
  if (!v || races.active) return;
  const race = races.nearestStart(v.pos.x, v.pos.z);
  if (!race) { hud.toast('Find a gold ring to start a race'); return; }
  races.begin(race, v);
  hud.banner(race.name.toUpperCase());
  hud.toast(`First to the teal rings wins $${race.prize.toLocaleString()}`);
  audio.checkpoint();
}

function shoot() {
  if (player.inVehicle || player.inBoat) return;
  const w = state.arsenal.current;
  if (!state.arsenal.tryFire(0)) { audio.blip(180, 0.05, 'square', 0.06); return; }
  state.stats.shotsFired += 1;
  audio.shot(w.id === 'breaker' ? 'shotgun' : w.id === 'mako' ? 'smg' : 'pistol');
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const angle = Math.atan2(-dir.x, -dir.z);
  const hit = gang.playerShoot(
    { x: player.pos.x, y: 1.35, z: player.pos.z }, angle, w,
    () => { state.stats.gangDown += 1; state.cash += 40; state.stats.cashEarned += 40; },
  );
  void hit;
  peds.scare(player.pos.x, player.pos.z, 24);
  if (elapsed - lastCrime > 2) { police.addHeat(9); lastCrime = elapsed; }
}

function togglePause() {
  if (!started) return;
  paused = !paused;
  if (paused) hud.showPause(buildView());
  else hud.hidePause();
}

function manualSave(slot) {
  writeSave(snapshot(), slot);
  hud.toast(`Saved to slot ${slot + 1}`);
}

function snapshot() {
  return {
    cash: state.cash, rp: state.ranks.rp, jobIndex: missions.index,
    arsenal: state.arsenal.serialize(), garage: garage.serialize(),
    standing: districts.standing, stats: state.stats, cases: activities.casesTaken,
    radioIdx: radio.idx,
  };
}

function applySave(s) {
  if (!s) return;
  state.cash = s.cash ?? state.cash;
  state.ranks.rp = s.rp ?? 0;
  missions.index = s.jobIndex ?? 0;
  state.arsenal.restore(s.arsenal);
  garage.restore(s.garage);
  Object.assign(districts.standing, s.standing ?? {});
  Object.assign(state.stats, s.stats ?? {});
  activities.casesTaken = s.cases ?? 0;
  activities.cases.forEach((c, i) => { if (i < activities.casesTaken) { c.taken = true; c.mesh.visible = false; } });
}

// ---------------- objectives & missions ----------------
function currentObjective() {
  if (races.active) {
    const p = races.active.race.points[races.active.cp];
    if (p) return { x: p.x, z: p.z };
  }
  const sd = missions.stageDef;
  if (missions.active && sd) {
    if (sd.kind === 'escape') return { x: LANDMARKS.safehouse.x, z: LANDMARKS.safehouse.z };
    if (sd.x !== undefined) return { x: sd.x, z: sd.z };
  }
  if (activities.fare) {
    const f = activities.fare;
    return f.phase === 'pickup' ? { x: f.from.x, z: f.from.z } : { x: f.to.x, z: f.to.z };
  }
  return null;
}

function checkMissionStage() {
  if (!missions.active) return;
  const sd = missions.stageDef;
  if (!sd) return;
  const p = player.inVehicle ? player.inVehicle.pos : player.inBoat ? boat.pos : player.pos;
  let met = false;
  if (sd.kind === 'reach') met = dist2d(p.x, p.z, sd.x, sd.z) < 6.5;
  if (sd.kind === 'drive') met = !!player.inVehicle && dist2d(p.x, p.z, sd.x, sd.z) < 9;
  if (sd.kind === 'boat') met = player.inBoat && dist2d(p.x, p.z, sd.x, sd.z) < 14;
  if (sd.kind === 'escape') met = police.wanted === 0;
  if (sd.kind === 'fight') {
    if (!missions.fightSpawned) {
      missions.fightSpawned = true;
      gang.spawn(sd.x, sd.z, sd.count ?? 5, 60);
      hud.banner('LOS CORALES');
      peds.scare(sd.x, sd.z, 30);
    }
    met = gang.aliveCount() === 0;
  }
  if (met) {
    const wasWanted = police.wanted;
    const res = missions.advance(hud, state);
    audio.cash();
    if (res?.finished) {
      state.stats.cashEarned += res.finished.pay;
      districts.addStanding(districts.current?.id ?? 'palmas', 14);
      if (wasWanted > 0) { police.clear(); state.stats.copsEscaped += 1; }
      if (res.rankUp) hud.banner(`RESPECT — ${res.rankUp.title.toUpperCase()}`);
      writeSave(snapshot(), 0);
      if (!missions.done) { missions.start(hud); police.setWanted(missions.job.wanted); }
      else hud.banner('BRASA KINGPIN');
    } else if (missions.job) {
      police.setWanted(Math.max(police.wanted, missions.job.wanted));
    }
  }
}

// ---------------- view model for HUD/maps ----------------
function buildView() {
  const p = player.inVehicle ? player.inVehicle.pos : player.inBoat ? boat.pos : player.pos;
  const target = {
    x: p.x, z: p.z,
    angle: player.inVehicle ? player.inVehicle.angle : player.angle,
    vehicle: player.inVehicle,
    facingX: player.inVehicle ? -Math.sin(player.inVehicle.angle) : -Math.sin(player.angle),
  };
  const disp = dispatch.build(0, police, air, blocks, target);
  const mins = 18 * 60 + 24 + Math.floor(elapsed * 0.5);
  const clock = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const raceInfo = races.active ? {
    name: races.active.race.name,
    position: races.position(player.inVehicle),
    cp: races.active.cp + 1,
    total: races.active.race.points.length,
    time: `${Math.floor(races.active.time / 60)}:${String(Math.floor(races.active.time % 60)).padStart(2, '0')}`,
    prize: races.active.race.prize,
  } : null;
  return {
    cash: state.cash, wanted: police.wanted, clock,
    airActive: air.active,
    mission: {
      job: missions.job, index: missions.index, stage: missions.stage,
      stageDef: missions.stageDef,
    },
    dispatch: disp,
    arsenal: state.arsenal, ranks: state.ranks, crew: state.crew,
    player, vehicle: player.inVehicle, boat: player.inBoat ? boat : null,
    race: raceInfo,
    sideTag: activities.fare
      ? `🚕 FARE — ${activities.fare.phase === 'pickup' ? 'pick up the passenger' : 'drop them off'}`
      : `Crown cases: ${activities.casesTaken}/5 · Standing: ${districts.current?.name ?? ''} ${districts.standing[districts.current?.id ?? 'palmas'] ?? 0}%`,
    stats: state.stats,
    casesTaken: activities.casesTaken,
    completion: missions.completion() * 0.8 + (activities.casesTaken / 5) * 0.2,
    mapView: {
      player: { x: p.x, z: p.z, angle: target.angle },
      objective: currentObjective(),
      police: police.units, rivals: races.active?.rivals ?? [],
      traffic: traffic.cars.filter((t) => !t.parked).map((t) => t.car),
      boat, gang: state.crew.eyesActive || (missions.stageDef?.kind === 'fight') ? gang.members : [],
      t: elapsed,
    },
  };
}

// ---------------- staging for screenshots ----------------
function stageShot(kind) {
  started = true;
  document.getElementById('titleCard').hidden = true;
  hud.showHud();
  state.cash = 12480;
  state.ranks.rp = 1020;
  state.arsenal.owned.mako = true;
  state.arsenal.owned.breaker = true;
  state.arsenal.ammo.mako = 120;
  state.arsenal.ammo.breaker = 24;
  player.hp = 86;
  player.armour = 40;

  if (kind === 'cover') {
    missions.index = 5; missions.stage = 1; missions.active = true;
    const z = boulevardZ(8);
    playerCar.pos.set(8, 0, z - 2);
    playerCar.angle = -Math.PI / 2;
    playerCar.speed = 17;
    playerCar.syncMesh();
    player.inVehicle = playerCar;
    police.setWanted(5);
    const spots = [
      [18, z + 11, 'PURSUIT'], [-2, z - 8, 'PURSUIT'], [-6, z + 7, 'FLANKING'],
      [-16, z - 3, 'RAMMING'], [-28, z + 5, 'PURSUIT'], [-40, z - 7, 'FLANKING'],
    ];
    spots.forEach(([x, zz, role], i) => {
      const car = new Vehicle('cruiser', 0xf4f6ff, x, zz, -Math.PI / 2 + (i % 2 ? 0.06 : -0.05));
      scene.add(car.mesh);
      police.units.push({ car, call: `BRASA-${String(7 + i * 3).padStart(2, '0')}`, role });
    });
    const bx = 80;
    const bz = boulevardZ(bx);
    const bcars = [];
    for (let i = -1; i <= 1; i += 1) {
      const car = new Vehicle('cruiser', 0xf4f6ff, bx + i * 5.2, bz + (i % 2) * 1.4, Math.PI / 2);
      scene.add(car.mesh);
      bcars.push(car);
    }
    blocks.blocks.push({ x: bx, z: bz, cars: bcars, call: 'RB-1' });
    const bx2 = -84;
    const bz2 = boulevardZ(bx2);
    const bcars2 = [];
    for (let i = -1; i <= 1; i += 1) {
      const car = new Vehicle('cruiser', 0xf4f6ff, bx2 + i * 5.2, bz2, Math.PI / 2);
      scene.add(car.mesh);
      bcars2.push(car);
    }
    blocks.blocks.push({ x: bx2, z: bz2, cars: bcars2, call: 'RB-2' });
    air.setActive(true);
    air.holdY = 13.2;
    air.pos.set(10, 13.2, z + 1);
    traffic.addParked(scene, [
      ['sedan', 0xffd23c, 46, boulevardZ(46) + 5, -Math.PI / 2],
      ['taxi', 0xffd23c, 68, boulevardZ(68) - 6, Math.PI / 2],
      ['van', 0x7cc4ff, -72, boulevardZ(-72) + 5, -Math.PI / 2],
      ['sedan', 0xf2f2f2, 104, boulevardZ(104) + 5, -Math.PI / 2],
    ]);
    for (let i = 0; i < 7; i += 1) peds.addBystander(-20 + i * 17, 126 + (i % 3) * 4, Math.PI);
    hud.showDialog('Vera Quintana', 'Heir is in the back, Dario — marina, NOW. FALCON has eyes on you, so give them a show they cannot catch.', 999);
    hud.showRadio('📻 PALMA FM 98.1 · Sunset House', '♪ Golden Hour Drive — Vela', 999);
    districts.current = districts.update(8, z);
    return { cam: [34, 2.6, z + 4.5], look: [-2, 7, z - 3] };
  }

  if (kind === 'mission') {
    missions.index = 3; missions.stage = 1; missions.active = true; missions.fightSpawned = true;
    player.pos.set(78, 0, 110);
    player.angle = 0.84;
    player.syncMesh();
    state.arsenal.slot = 3;
    gang.spawn(97, 127, 6, 60);
    gang.members[1].hp = 26;
    gang.members[3].hp = 40;
    for (let i = 0; i < 18; i += 1) {
      peds.addBystander(52 + (i % 9) * 10, 113 + Math.floor(i / 9) * 10 + (i % 3) * 2, (i * 0.7) % 3);
    }
    police.setWanted(1);
    const car = new Vehicle('cruiser', 0xf4f6ff, 138, boulevardZ(138) + 4, Math.PI / 2);
    scene.add(car.mesh);
    police.units.push({ car, call: 'BRASA-07', role: 'PURSUIT' });
    traffic.addParked(scene, [
      ['sedan', 0xff7d9c, 52, 96, 0.2], ['van', 0xf2f2f2, 122, 98, -0.15],
      ['taxi', 0xffd23c, 20, boulevardZ(20) + 5, -Math.PI / 2],
    ]);
    hud.showDialog('Vera Quintana', 'That is the whole market crew, Dario — send them home. The stallholders are watching.', 999);
    districts.current = districts.update(80, 112);
    return { cam: [68, 4.4, 104], look: [97, 1.2, 127] };
  }

  if (kind === 'race') {
    missions.index = 5;
    const race = RACES[0];
    const z = boulevardZ(0);
    playerCar.pos.set(0, 0, z - 2);
    playerCar.angle = -Math.PI / 2;
    playerCar.speed = 31;
    playerCar.hasNitro = true;
    playerCar.nitro = 0.7;
    playerCar.syncMesh();
    player.inVehicle = playerCar;
    races.begin(race, playerCar);
    races.active.cp = 2;
    races.active.time = 74;
    races.showCheckpoint();
    const rp = [[16, z - 8, 1.9], [27, z + 3, 1.4], [-13, z + 6, 0.8]];
    races.active.rivals.forEach((r, i) => {
      r.car.pos.set(rp[i][0], 0, rp[i][1]);
      r.car.angle = -Math.PI / 2;
      r.car.speed = 29;
      r.car.syncMesh();
      r.progress = rp[i][2];
    });
    races.active.playerProgress = 1.55;
    traffic.addParked(scene, [
      ['sedan', 0x7cc4ff, 52, boulevardZ(52) + 6, -Math.PI / 2],
      ['van', 0xffab5e, -34, boulevardZ(-34) - 6, Math.PI / 2],
    ]);
    for (let i = 0; i < 6; i += 1) peds.addBystander(-20 + i * 15, 122 + (i % 2) * 5, Math.PI);
    districts.current = districts.update(0, z);
    return { cam: [-12.5, 2.1, z + 4.5], look: [18, 1.7, z - 2] };
  }

  if (kind === 'map') {
    missions.index = 6; missions.active = true; missions.stage = 0;
    Object.assign(state.stats, {
      jobsDone: 6, carsStolen: 23, copsEscaped: 11, distanceKm: 48.6, racesWon: 2,
      faresRun: 9, shotsFired: 214, gangDown: 17, cashEarned: 18950, busts: 2,
    });
    activities.casesTaken = 3;
    activities.cases.forEach((c, i) => { if (i < 3) { c.taken = true; c.mesh.visible = false; } });
    districts.standing = { marina: 70, oldtown: 55, palmas: 80, financial: 35 };
    player.pos.set(40, 0, 20);
    player.syncMesh();
    writeSave(snapshot(), 0);
    writeSave({ ...snapshot(), cash: 3210, jobIndex: 2 }, 1);
    paused = true;
    hud.showPause(buildView());
    return { cam: [40, 26, 60], look: [40, 0, 20] };
  }
  return null;
}

// ---------------- boot / title ----------------
const titleEl = document.getElementById('titleCard');
document.getElementById('startBtn').addEventListener('click', () => startGame(false));
const resumeBtn = document.getElementById('resumeBtn');
if (hasSave()) resumeBtn.hidden = false;
resumeBtn.addEventListener('click', () => startGame(true));
document.getElementById('respawnBtn').addEventListener('click', () => {
  document.getElementById('endCard').hidden = true;
  player.respawn(LANDMARKS.safehouse.x + 4, LANDMARKS.safehouse.z - 4);
  hud.showHud();
});

function startGame(load) {
  audio.start();
  titleEl.hidden = true;
  hud.showHud();
  started = true;
  if (load) { applySave(readSave(0)); hud.toast('Save loaded — welcome back to Brasa Bay'); }
  missions.start(hud);
  if (missions.job) police.setWanted(missions.job.wanted);
  radio.announce();
}

let shotCam = null;
if (SHOT) {
  shotCam = stageShot(SHOT);
  setTimeout(() => { window.__shotReady = true; }, 1100);
}

// ---------------- main loop ----------------
const clockT = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clockT.getDelta(), 0.05);
  const t = clockT.elapsedTime;
  elapsed = t;
  sky.update(t);
  ocean.update(t);
  city.update(t);
  markerRing.rotation.y = t * 1.8;

  if (SHOT) {
    // Staged scenes: keep lights flashing and water moving, freeze play.
    blocks.update(t);
    for (const u of police.units) {
      const bar = u.car.mesh.userData.lightbar;
      if (bar) {
        const phase = Math.sin(t * 11 + u.call.charCodeAt(6)) > 0;
        bar.children[0].material.color.setHex(phase ? 0xff2233 : 0x661118);
        bar.children[1].material.color.setHex(phase ? 0x113366 : 0x2266ff);
      }
    }
    if (SHOT === 'cover') {
      air.update(0, { x: playerCar.pos.x, z: playerCar.pos.z }, t);
      fx.update(dt);
    }
    if (SHOT === 'mission') {
      gang.update(0.016, t, player.pos, () => {});
      const m = gang.members.find((g) => g.alive);
      if (m) {
        fx.tracer({ x: player.pos.x, y: 1.35, z: player.pos.z }, { x: m.x, y: 1.2, z: m.z }, false);
        fx.muzzle(player.pos, player.angle + Math.PI);
        fx.tracer({ x: m.x, y: 1.35, z: m.z }, { x: player.pos.x + 1.4, y: 1.1, z: player.pos.z }, true);
      }
      fx.update(dt);
      peds.update(0, t, null);
    }
    if (shotCam) {
      camera.position.set(...shotCam.cam);
      camera.lookAt(...shotCam.look);
    }
    hud.update(dt, buildView());
    renderer.render(scene, camera);
    return;
  }

  if (!started || paused) { renderer.render(scene, camera); return; }

  state.crew.update(dt, elapsed);
  state.arsenal.cooldown -= dt;
  districts.update(player.pos.x, player.pos.z);

  // --- movement ---
  const focusPos = player.inVehicle ? player.inVehicle.pos : player.inBoat ? boat.pos : player.pos;
  if (player.inVehicle) {
    const v = player.inVehicle;
    const input = {
      throttle: (keys.has('KeyW') ? 1 : 0) + (keys.has('KeyS') ? -1 : 0),
      steer: (keys.has('KeyA') ? 1 : 0) + (keys.has('KeyD') ? -1 : 0),
      brake: keys.has('Space'),
      nitro: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    };
    const allColliders = city.colliders.concat(blocks.colliders());
    v.drive(dt, input, allColliders);
    if (blocks.checkSpikes(v)) hud.toast('SPIKES! Tyres shredded — find Tomas [2]');
    player.pos.set(v.pos.x, 0, v.pos.z);
    player.angle = v.angle;
    state.stats.distanceKm += Math.abs(v.speed) * dt / 1000;
    audio.engine(Math.abs(v.speed) / v.spec.top, true);
  } else if (player.inBoat) {
    boat.drive(dt, {
      throttle: (keys.has('KeyW') ? 1 : 0) + (keys.has('KeyS') ? -1 : 0),
      steer: (keys.has('KeyA') ? 1 : 0) + (keys.has('KeyD') ? -1 : 0),
    }, t);
    player.pos.set(boat.pos.x, 0, boat.pos.z);
    player.angle = boat.angle;
    audio.engine(Math.abs(boat.speed) / 24, true);
  } else {
    player.walk(dt, keys, camYaw + orbit, city.colliders);
    boat.sync(t);
    audio.engine(0, false);
  }
  player.syncMesh();

  // --- world systems ---
  traffic.update(dt, focusPos);
  peds.update(dt, t, focusPos);
  const target = {
    x: focusPos.x, z: focusPos.z,
    angle: player.inVehicle ? player.inVehicle.angle : player.angle,
    vehicle: player.inVehicle,
    facingX: player.inVehicle ? -Math.sin(player.inVehicle.angle) : -Math.sin(player.angle),
  };
  police.update(dt, target, city.colliders, t);
  air.setActive(police.wanted >= 4);
  if (air.active) { air.update(dt, target, t); police.addHeat(dt * 1.2); }
  blocks.maybeDeploy(dt, police.wanted, target);
  blocks.update(t);
  audio.siren(police.wanted > 0, t);
  gang.update(dt, t, player.pos, (dmg) => { player.hurt(dmg); audio.hurt(); });
  const raceEvent = races.update(dt, t, player.inVehicle, city.colliders);
  if (raceEvent?.type === 'checkpoint') { hud.toast(`Checkpoint ${raceEvent.cp}/${raceEvent.total}`); audio.checkpoint(); }
  if (raceEvent?.type === 'player-finish') {
    const pos = raceEvent.position;
    const a = races.active;
    if (pos === 1) {
      state.cash += a.race.prize;
      state.stats.cashEarned += a.race.prize;
      state.stats.racesWon += 1;
      const up = state.ranks.addRP(a.race.rp);
      hud.banner('RACE WON');
      if (up) hud.toast(`Respect up — ${up.title}`);
    } else {
      hud.banner(`FINISHED P${pos}`);
      state.cash += 150;
    }
    districts.addStanding(districts.current?.id ?? 'palmas', 8);
    races.end();
  }
  const act = activities.update(dt, t, player.pos, !!player.inVehicle, hud);
  if (act?.type === 'case') { state.cash += act.cash; state.stats.cashEarned += act.cash; state.ranks.addRP(act.rp); audio.cash(); }
  if (act?.type === 'fare') { state.cash += act.cash; state.stats.cashEarned += act.cash; state.stats.faresRun += 1; state.ranks.addRP(act.rp); audio.cash(); }
  fareTimer -= dt;
  if (fareTimer <= 0) {
    fareTimer = 55;
    if (!activities.fare && !races.active) { activities.offerFare(player.pos); hud.toast('🚕 Fare waiting — gold beacon on the map'); }
  }
  fx.update(dt);
  radio.update(dt);
  checkMissionStage();

  // --- panels that follow proximity ---
  if (openShop) hud.showShop(openShop, shopStock(openShop, state), state.cash);
  if (garageOpen) hud.showGarage(garage, currentVehicle());

  // --- bust / wasted ---
  if (police.bustCheck(target) && !player.dead) {
    bustTimer += dt;
    if (bustTimer > 2.4) endRun('BUSTED', 'The BBPD boxed Dario in. The bay keeps the car; the city keeps the story.');
  } else bustTimer = Math.max(0, bustTimer - dt);
  if (player.dead) endRun('WASTED', 'Dario washes up at the marina with empty pockets and a great story.');

  // --- autosave ---
  saveTimer -= dt;
  if (saveTimer <= 0) { saveTimer = 20; writeSave(snapshot(), 0); }

  // --- objective marker ---
  const obj = currentObjective();
  if (obj) {
    marker.visible = true;
    marker.position.set(obj.x, 0, obj.z);
  } else marker.visible = false;

  // --- camera ---
  const focus = new THREE.Vector3(focusPos.x, 1.4, focusPos.z);
  const heading = player.inVehicle ? player.inVehicle.angle : player.inBoat ? boat.angle : camYaw + orbit;
  const dist = player.inVehicle || player.inBoat ? 11.5 : 8.5;
  const yaw = (player.inVehicle || player.inBoat) ? heading + orbit : camYaw + orbit;
  const cx = focus.x + Math.sin(yaw) * Math.cos(camPitch) * dist;
  const cz = focus.z + Math.cos(yaw) * Math.cos(camPitch) * dist;
  const cy = focus.y + Math.sin(camPitch) * dist + 1.2;
  camera.position.lerp(new THREE.Vector3(cx, Math.max(cy, 1.6), cz), SHOT ? 1 : 0.12);
  camera.lookAt(focus.x - Math.sin(yaw) * 4, focus.y + 0.4, focus.z - Math.cos(yaw) * 4);
  if (!player.inVehicle && !player.inBoat && (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD'))) {
    camYaw = camYaw; // free orbit while walking; aim follows camera
  }

  hud.update(dt, buildView());
  document.getElementById('srStatus').textContent =
    `${missions.job ? `Job ${missions.index + 1}: ${missions.job.title}` : 'Free roam'} — cash $${state.cash}, wanted ${police.wanted}. ${KEYS_HINT}`;
  renderer.render(scene, camera);
}

function endRun(title, sub) {
  state.stats.busts += 1;
  state.cash = Math.max(0, Math.round(state.cash * 0.9));
  police.clear();
  blocks.clear();
  gang.clear();
  bustTimer = 0;
  document.getElementById('endTitle').textContent = title;
  document.getElementById('endSub').textContent = sub;
  document.getElementById('endCard').hidden = false;
  hud.el.hud.hidden = true;
}

frame();
