// ISLA BRASA v8 — entry point for the make.fun gta6-01 bounty.
// The game itself is the static game/ directory (plain files, no build
// step, no network). This program copies game/ and screenshots/ into
// the output directory and stamps a dossier.json using the vendored
// make.fun library so the hand-in can be validated offline.
// Local run:  MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(entryDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(entryDir, 'screenshots'))) {
  cpSync(join(entryDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('ISLA BRASA v8 handed in to', outDir);
