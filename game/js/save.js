// save.js — localStorage persistence. One autosave slot written by the
// game loop plus two manual slots shown on the pause MAP/STATS screen.
// Stored: cash, RP, job progress, arsenal, garage cars, district
// standing, career counters and the radio station last playing.

import { SAVE_KEY } from './config.js';

const slotKey = (n) => `${SAVE_KEY}-slot${n}`;

export function writeSave(state, slot = 0) {
  try {
    const payload = { v: 8, at: Date.now(), ...state };
    localStorage.setItem(slot === 0 ? SAVE_KEY : slotKey(slot), JSON.stringify(payload));
    return true;
  } catch { return false; }
}

export function readSave(slot = 0) {
  try {
    const raw = localStorage.getItem(slot === 0 ? SAVE_KEY : slotKey(slot));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function hasSave() { return readSave(0) !== null; }

export function slotSummary(slot) {
  const s = readSave(slot);
  if (!s) return { empty: true, label: 'EMPTY SLOT' };
  const when = new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    empty: false,
    label: `Job ${(s.jobIndex ?? 0) + 1}/10 · $${(s.cash ?? 0).toLocaleString()} · ${when}`,
  };
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
}
