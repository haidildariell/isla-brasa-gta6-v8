[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/haidildariell/isla-brasa-gta6-v8/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/haidildariell/isla-brasa-gta6-v8/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Bounty: https://make.fun/bounty/gta6-01

# ISLA BRASA — v8 "Golden Hour"

An original open-world crime game that runs entirely in the browser.
No downloads, no network calls, no build step: static files, a vendored
Three.js, keyboard + mouse, and a city that is identical on every load
thanks to a seeded simulation.

**Round 6 — the golden-hour overhaul.** Version 8 rebuilds the look of
Brasa Bay around one saturated sunset: a burning orange-to-violet sky,
a low sun over the water, warm fog, densely lit pastel facades, and
four staged signature scenes — a FALCON spotlight chase on the beach
boulevard, a market shootout in Las Palmas, a low chase-cam street
race, and a full pause MAP/STATS screen with career stats and save
slots.

## The story

Dario Venn washes up in Brasa Bay with a duffel bag, a debt, and the
best right foot on the island. His handler **Vera Quintana** has ten
jobs lined up. Mechanic **Tomas Rey** keeps the cars alive, lookout
**Lio Park** keeps the heat visible, the **Los Corales** gang collects
rent that is not theirs, and the **BBPD** — cruisers, roadblocks,
spike strips and the **FALCON** air unit — wants Dario's face on a
board. Ten jobs later there is a crown in the Regent vault with his
name on it.

## Brasa Bay — four districts

- **Marina District** — piers, moored hulls, the safehouse garage and
  the Mako speedboat berth.
- **Old Town** — colonial plazas, the Brasa Armory, Los Corales turf.
- **Las Palmas** — the beachfront: curved boulevard, boardwalk, the
  Mercado stalls, Palma Spray & Go.
- **Financial Row** — glass towers, the night vault, Isla Fuel and the
  Regent Hotel.

## The ten story jobs

1. **First Wheels** — claim the Comet GT and learn the bay.
2. **Marina Run** — a pier package to the Old Town plaza.
3. **Heat Check** — take a 3-star chase across town, then lose it.
4. **Coral Kings** — clear Los Corales out of the Las Palmas market.
5. **Night Deposit** — the Financial Row vault, in quiet, out loud.
6. **Regent Run** — move the Regent heir under the FALCON's spotlight.
7. **Air Mail** — run the coast in the Mako speedboat.
8. **Turf War** — the whole Corales chapter, one plaza.
9. **The Long Fare** — one witness, three drops, no tail.
10. **Brasa Crown** — steal the Crown and cross the whole bay at 5 stars.

## Systems

- **Wanted & pursuit AI** — 5 stars; cruisers take PURSUIT, RAMMING
  and FLANKING roles; roadblocks and spike strips at 3+ stars; the
  FALCON helicopter with a tracking spotlight at 4+ stars.
- **Live dispatch HUD** — every active unit by callsign (BRASA-xx,
  FALCON-1, RB-x), role and distance, plus dispatcher chatter.
- **Six weapons** — Fists, Harbor Bat, P9 Pistol, Mako SMG, 12G
  Breaker, and the rank-locked AR Carbine; weapon wheel on Q, ammo
  and reloads, gang gunfights with health bars, tracers both ways.
- **Crew abilities** — Tomas: Swap Plates [1] and Quick Fix [2];
  Lio: Eyes Out [3]; cooldowns, faster at Respect 6.
- **Respect ranks 1–8** — Dock Hand to Brasa Kingpin, each rank
  unlocking hardware, garage services or crew tricks.
- **Garage** — store up to 4 cars with condition %, buy repair,
  armour plating, nitro and resprays (resprays also cool the heat).
- **Three shops** — Brasa Armory, Palma Spray & Go, Isla Fuel;
  walk-up, district-standing discounts.
- **Three street races** — Boulevard Burn, Financial Row GP, Marina
  Mile: glowing checkpoint rings, three rivals, live P1–P4 position.
- **Side work** — taxi fares with gold/teal beacons and five hidden
  crown cases feeding the completion %.
- **The Mako speedboat** — drivable, planes over the swell, job 7
  runs the coast in it.
- **Radio & sound** — three fully synthesized WebAudio stations
  (Palma FM, Radio Corales, Velvet Row) plus synthesized engine,
  siren, gunfire and UI sounds. No audio files.
- **Save / Continue** — localStorage autosave plus three manual
  slots (F5–F7), carrying cash, RP, jobs, arsenal, garage, standing
  and career stats.
- **Pause MAP/STATS** — ESC opens a full-screen map: four coloured
  districts, objective route, blips, completion %, career stats,
  Respect progress and the save slots.
- **Full HUD** — job card (JOB n/10, stage, objective, NEXT), wanted
  stars, weapon bar, Respect bar, crew chips, portrait dialog,
  district banners, speedo with nitro, live top-down minimap.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move / drive / steer |
| Shift | Sprint on foot · nitro in a fitted car |
| Space | Brake |
| E | Enter / exit car or boat |
| F | Interact · shops · start next job briefing |
| Q (hold) + 1–6 | Weapon wheel |
| 1 / 2 / 3 | Crew: Swap Plates · Quick Fix · Eyes Out |
| T | Cycle radio station |
| R | Start a race at a gold ring · repair in garage |
| G | Safehouse garage (at the marina) |
| Mouse drag | Orbit camera |
| Mouse click | Shoot (on foot) |
| ESC | Pause — MAP/STATS screen |
| F5 / F6 / F7 | Write save slots 1–3 |

## Play it locally

```sh
node serve.ts            # serves game/ on http://localhost:8077
# or simply open game/index.html through any static file server
```

The entry program copies `game/` and `screenshots/` to the output
directory and writes `dossier.json`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are staged, deterministic scenes of the real game
(`?shot=cover`, `?shot=mission`, `?shot=race`, `?shot=map`) captured
headlessly from the running build — the same HUD, the same city, the
same sunset you play in.
