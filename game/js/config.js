// config.js — shared constants, the seeded RNG and small math helpers.
// Everything in Brasa Bay is deterministic: one seed drives the city
// layout, traffic colours, crowd outfits and staged screenshot scenes,
// so a given build always renders the same island.

export const WORLD = {
  // Streets run on a coarse grid; the beach boulevard curves along z.
  avenues: [-315, -215, -115, -15, 85, 185, 285],
  streets: [-285, -205, -125, -45, 35],
  boulevardZ: 108,
  beachZ: 138,
  seaZ: 168,
  northEdge: -330,
  eastEdge: 345,
  westEdge: -345,
  roadHalf: 8,
  walkHalf: 11.5,
};

export const PALETTE = {
  sand: 0xf2cf8f,
  sandLight: 0xfbe3ae,
  asphalt: 0x4a3a44,
  asphaltWarm: 0x5a4350,
  walkway: 0xd9b48c,
  boardwalk: 0xb98a5e,
  seaShallow: 0x2ec8b8,
  seaDeep: 0x14607e,
  grass: 0x7fae4c,
  plaza: 0xe0b98d,
};

export const SAVE_KEY = 'isla-brasa-v8-save';
export const SHOT_SEED = 20261120;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Boulevard centreline: a lazy sine so the beach road sweeps instead of
// running ruler-straight. Traffic, palms and the pier all follow it.
export function boulevardZ(x) {
  return WORLD.boulevardZ + Math.sin(x * 0.0058) * 15;
}
export function boulevardSlope(x) {
  return Math.cos(x * 0.0058) * 15 * 0.0058;
}

export const KEYS_HINT =
  'WASD move · E car · F interact · Q wheel · 1/2/3 crew · T radio · R race · G garage · ESC map';
