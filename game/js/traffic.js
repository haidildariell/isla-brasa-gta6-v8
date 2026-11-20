// traffic.js — ambient traffic: sedans, cabs and vans looping the
// grid and the boulevard curve on simple waypoint routes. Cars keep
// to the right-hand lane of their route and slow down near the player
// so the streets feel busy without turning into a demolition derby.

import * as THREE from 'three';
import { WORLD, boulevardZ, boulevardSlope, mulberry32, clamp } from './config.js';
import { Vehicle } from './vehicles.js';

const rng = mulberry32(4451);
const COLORS = [0xff6b4a, 0xffd23c, 0x7cc4ff, 0xf2f2f2, 0xff7d9c, 0x7dff8a, 0xffab5e, 0xc9b8ff];
const MODELS = ['sedan', 'sedan', 'taxi', 'van', 'sedan', 'taxi'];

function boulevardRoute(dir) {
  const pts = [];
  for (let x = -330; x <= 330; x += 30) {
    pts.push({ x: dir > 0 ? x : -x, z: boulevardZ(dir > 0 ? x : -x) + dir * -4.2 });
  }
  return pts;
}

function avenueRoute(ax, dir) {
  const pts = [];
  for (let z = -300; z <= 60; z += 40) pts.push({ x: ax + dir * 4, z: dir > 0 ? z : -z + -240 });
  return pts;
}

function streetRoute(sz, dir) {
  const pts = [];
  for (let x = -320; x <= 320; x += 40) pts.push({ x: dir > 0 ? x : -x, z: sz + dir * 4 });
  return pts;
}

export class TrafficSystem {
  constructor(scene, colliders, count = 16) {
    this.cars = [];
    this.colliders = colliders;
    const routes = [];
    routes.push(boulevardRoute(1), boulevardRoute(-1));
    for (const ax of [WORLD.avenues[1], WORLD.avenues[3], WORLD.avenues[5]]) {
      routes.push(avenueRoute(ax, 1), avenueRoute(ax, -1));
    }
    routes.push(streetRoute(WORLD.streets[1], 1), streetRoute(WORLD.streets[3], -1));
    for (let i = 0; i < count; i += 1) {
      const route = routes[i % routes.length];
      const wp = Math.floor(rng() * route.length);
      const p = route[wp];
      const model = MODELS[Math.floor(rng() * MODELS.length)];
      const car = new Vehicle(model, model === 'taxi' ? 0xffd23c : COLORS[Math.floor(rng() * COLORS.length)], p.x, p.z, 0);
      scene.add(car.mesh);
      this.cars.push({ car, route, wp, cruise: 9 + rng() * 6 });
    }
  }

  update(dt, focus) {
    for (const t of this.cars) {
      const target = t.route[t.wp];
      const dx = target.x - t.car.pos.x;
      const dz = target.z - t.car.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 7) {
        t.wp = (t.wp + 1) % t.route.length;
        continue;
      }
      const want = Math.atan2(-dx, -dz);
      let diff = want - t.car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let throttle = 0.75;
      const nearFocus = focus && Math.hypot(focus.x - t.car.pos.x, focus.z - t.car.pos.z) < 13;
      if (nearFocus) throttle = 0.1;
      t.car.drive(dt, {
        throttle,
        steer: clamp(diff * 1.6, -1, 1),
        brake: Math.abs(t.car.speed) > t.cruise,
      }, []);
      if (t.car.speed > t.cruise) t.car.speed = t.cruise;
    }
  }

  // Parked filler for staged scenes: rows of still cars with lights on.
  addParked(scene, list) {
    for (const [model, color, x, z, ang] of list) {
      const car = new Vehicle(model, color, x, z, ang);
      scene.add(car.mesh);
      this.cars.push({ car, route: [{ x, z }], wp: 0, cruise: 0, parked: true });
    }
  }
}

export { boulevardSlope };
