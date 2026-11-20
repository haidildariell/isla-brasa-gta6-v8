// dispatch.js — turns live pursuit state into the radio feed the HUD
// shows: every active unit with its callsign, role and distance, the
// FALCON when airborne, roadblocks when set, plus rotating flavour
// lines from the BBPD dispatcher so the panel never sits static.

import { dist2d } from './config.js';

const CHATTER = [
  'Dispatch: all units, suspect vehicle is a Comet GT, coral red.',
  'Dispatch: keep the boulevard clear of civvies, over.',
  'Dispatch: suspect last seen heading for the marina.',
  'Dispatch: FALCON has the light on him — do not lose him.',
  'Dispatch: spike team standing by on Financial Row.',
  'Dispatch: he just blew the Palmas checkpoint!',
  'Dispatch: roadblock requested, boulevard eastbound.',
  'Dispatch: suspect is armed — approach with caution.',
];

export class DispatchFeed {
  constructor() {
    this.chatterIdx = 0;
    this.chatterTimer = 0;
    this.line = CHATTER[0];
  }

  // Returns rows: {unit, role, dist} plus a status line for the panel.
  build(dt, police, air, blocks, target) {
    this.chatterTimer -= dt;
    if (this.chatterTimer <= 0) {
      this.chatterTimer = 6;
      this.chatterIdx = (this.chatterIdx + 1) % CHATTER.length;
      this.line = CHATTER[this.chatterIdx];
    }
    const rows = [];
    for (const u of police.units) {
      rows.push({
        unit: u.call,
        role: u.role,
        dist: Math.round(dist2d(u.car.pos.x, u.car.pos.z, target.x, target.z)),
      });
    }
    if (air.active) {
      rows.push({
        unit: 'FALCON-1', role: 'AIR SUPPORT',
        dist: Math.round(dist2d(air.pos.x, air.pos.z, target.x, target.z)),
      });
    }
    for (const b of blocks.blocks) {
      rows.push({
        unit: b.call, role: 'ROADBLOCK',
        dist: Math.round(dist2d(b.x, b.z, target.x, target.z)),
      });
    }
    rows.sort((a, b) => a.dist - b.dist);
    return { rows, line: this.line, active: police.wanted > 0 };
  }
}
