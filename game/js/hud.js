// hud.js — every piece of screen furniture: the mission card with
// JOB n/10 + stage + objective + NEXT, the live dispatch feed, the
// six-slot weapon bar, the Respect card, crew chips, dialog box with
// portrait, radio toast, speedo, vitals, district banner, shop and
// garage panels, the weapon wheel, and the pause MAP/STATS screen.

import { WEAPONS } from './weapons.js';
import { ABILITIES } from './crew.js';
import { drawMinimap, drawBigMap } from './minimap.js';
import { slotSummary } from './save.js';

const $ = (id) => document.getElementById(id);
const FACES = {
  'Vera Quintana': ['VQ', '#ff5d7e'],
  'Tomas Rey': ['TR', '#ffb03c'],
  'Lio Park': ['LP', '#2ee6c8'],
  'Dario Venn': ['DV', '#ff9a3c'],
};

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'), job: $('jobCard'), dispatch: $('dispatchCard'), side: $('sideTag'),
      cash: $('cashLine'), stars: $('starGlyphs'), air: $('airBadge'), clock: $('clockLine'),
      guns: $('gunBar'), respect: $('respectCard'), crew: $('crewRow'),
      hp: $('hpFill'), arm: $('armFill'), mini: $('mini'),
      dash: $('dash'), dashSpeed: $('dashSpeed'), dashCar: $('dashCar'), nitro: $('nitroFill'),
      radio: $('radioCard'), toast: $('toastCard'), race: $('raceCard'),
      mega: $('megaBanner'), district: $('districtCard'), center: $('centerCard'),
      dialog: $('dialogCard'), wheel: $('wheelCard'), hint: $('hintLine'),
      shop: $('shopCard'), garage: $('garageCard'),
      pause: $('pauseCard'), bigMap: $('bigMap'),
      completion: $('completionBlock'), career: $('careerBlock'),
      respectBlock: $('respectBlock'), slots: $('slotsBlock'),
    };
    this.timers = { dialog: 0, toast: 0, radio: 0, district: 0, mega: 0, center: 0 };
    this.panelTimer = 0;
    this.el.hint.textContent = 'WASD move · E car · F interact · Q wheel · 1/2/3 crew · T radio · R race · G garage · ESC map';
  }

  showHud() { this.el.hud.hidden = false; }

  // ---- transient pieces ----
  showDialog(who, text, hold = 6.5) {
    const [ini, col] = FACES[who] ?? ['??', '#ffd23c'];
    this.el.dialog.innerHTML =
      `<div class="face" style="background:${col}">${ini}</div>` +
      `<div><div class="dWho" style="color:${col}">${who.toUpperCase()}</div>` +
      `<div class="dText">${text}</div></div>`;
    this.el.dialog.hidden = false;
    this.timers.dialog = hold;
  }

  toast(msg, hold = 3.4) {
    this.el.toast.textContent = msg;
    this.el.toast.hidden = false;
    this.timers.toast = hold;
  }

  showRadio(line1, line2, hold = 4) {
    this.el.radio.innerHTML = `<span class="rStation">${line1}</span><br>${line2}`;
    this.el.radio.hidden = false;
    this.timers.radio = hold;
  }

  showDistrict(name, sub) {
    this.el.district.innerHTML = `<div class="dName">${name}</div><div class="dSub">${sub}</div>`;
    this.el.district.hidden = false;
    this.timers.district = 2.8;
  }

  banner(text, hold = 2.2) {
    this.el.mega.textContent = text;
    this.el.mega.hidden = false;
    this.timers.mega = hold;
  }

  centerMsg(text, hold = 2.6) {
    this.el.center.textContent = text;
    this.el.center.hidden = false;
    this.timers.center = hold;
  }

  // ---- per-frame refresh (panels throttled to ~7Hz) ----
  update(dt, S) {
    for (const k of Object.keys(this.timers)) {
      if (this.timers[k] > 0) {
        this.timers[k] -= dt;
        if (this.timers[k] <= 0) {
          if (k === 'dialog') this.el.dialog.hidden = true;
          if (k === 'toast') this.el.toast.hidden = true;
          if (k === 'radio') this.el.radio.hidden = true;
          if (k === 'district') this.el.district.hidden = true;
          if (k === 'mega') this.el.mega.hidden = true;
          if (k === 'center') this.el.center.hidden = true;
        }
      }
    }
    // vitals + speedo every frame (cheap style writes)
    this.el.hp.style.width = `${Math.max(0, S.player.hp)}%`;
    this.el.arm.style.width = `${Math.max(0, S.player.armour)}%`;
    if (S.vehicle) {
      this.el.dash.hidden = false;
      this.el.dashSpeed.textContent = S.vehicle.kmh;
      this.el.dashCar.textContent =
        `${S.vehicle.spec.name} · COND ${Math.round(S.vehicle.condition)}%${S.vehicle.hasNitro ? ' · NITRO [SHIFT]' : ''}`;
      this.el.nitro.style.width = `${Math.round(S.vehicle.nitro * 100)}%`;
    } else this.el.dash.hidden = true;

    this.panelTimer -= dt;
    if (this.panelTimer > 0) return;
    this.panelTimer = 0.14;

    this.el.cash.textContent = `$${S.cash.toLocaleString()}`;
    this.el.clock.textContent = S.clock;
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < S.wanted ? '★' : '<span class="off">★</span>';
    this.el.stars.innerHTML = stars;
    this.el.air.hidden = !S.airActive;

    // mission card
    const m = S.mission;
    if (m.job) {
      this.el.job.innerHTML =
        `<div class="jobHead"><span class="jobKicker">STORY JOB</span><span class="jobCount">JOB ${m.index + 1}/10</span></div>` +
        `<h3>${m.job.title}</h3>` +
        `<div class="jobStage">Stage ${m.stage + 1}/${m.job.stages.length} — ${m.stageDef?.kind?.toUpperCase() ?? ''}</div>` +
        `<div class="jobObj">▸ ${m.stageDef?.label ?? 'Free roam — the bay is yours'}</div>` +
        `<div class="jobNext">NEXT: ${m.stageDef?.next ?? 'Side work: fares [gold beacon], races [gold ring], crown cases'}<br>` +
        `<span class="jobPay">PAYOUT $${m.job.pay.toLocaleString()} · +${m.job.rp} RP</span></div>`;
    } else {
      this.el.job.innerHTML = '<h3>BRASA BAY IS YOURS</h3><div class="jobObj">All ten jobs done. Fares, races and crown cases still pay.</div>';
    }
    this.el.side.textContent = S.sideTag ?? '';

    // dispatch card
    const d = S.dispatch;
    if (d.active && d.rows.length) {
      let html = `<div class="dispHead">📡 BBPD DISPATCH — LIVE</div>`;
      for (const r of d.rows.slice(0, 9)) {
        html += `<div class="dispLine"><span class="dispUnit">${r.unit}</span><span class="dispRole">${r.role}</span><span class="dispDist">${r.dist}m</span></div>`;
      }
      html += `<div class="dispLine"><span class="dispIdle">${d.line}</span></div>`;
      this.el.dispatch.innerHTML = html;
      this.el.dispatch.hidden = false;
    } else {
      this.el.dispatch.innerHTML = '<div class="dispHead">📡 BBPD DISPATCH</div><div class="dispIdle">All quiet on the bay. For now.</div>';
      this.el.dispatch.hidden = false;
    }

    // weapon bar
    let guns = '';
    WEAPONS.forEach((w, i) => {
      const owned = S.arsenal.owned[w.id];
      const locked = S.ranks.level < w.rank;
      const ammo = w.melee ? '∞' : `${S.arsenal.inMag[w.id]}/${S.arsenal.ammo[w.id]}`;
      guns += `<div class="gunSlot ${i === S.arsenal.slot ? 'active' : ''} ${locked ? 'locked' : ''}">` +
        `<span class="gName">${locked ? '🔒 ' : ''}${w.name}</span>` +
        `<span class="gAmmo">${owned ? ammo : (locked ? `RANK ${w.rank}` : `$${w.price}`)}</span> <span class="gKey">[${w.key}]</span></div>`;
    });
    this.el.guns.innerHTML = guns;

    // respect card
    const rk = S.ranks;
    this.el.respect.innerHTML =
      `<div class="respHead"><span class="respRank">RESPECT — ${rk.current.title.toUpperCase()}</span><span class="respLvl">LVL ${rk.level}/8</span></div>` +
      `<div class="respTrack"><div id="respFill" style="width:${Math.round(rk.progress() * 100)}%"></div></div>` +
      `<div class="respNext">${rk.next ? `Next: <b>${rk.next.title}</b> at ${rk.next.rp} RP — unlocks ${rk.next.unlock}` : 'Top of the bay. The crown fits.'}</div>`;

    // crew chips
    let chips = '';
    for (const a of ABILITIES) {
      const cd = S.crew.timers[a.id];
      chips += `<div class="crewChip ${cd > 0 ? 'cooling' : ''}"><span class="cName">${a.who} [${a.key}]</span>` +
        `<span class="cSkill">${a.label}</span><span class="cCd">${cd > 0 ? `${Math.ceil(cd)}s` : 'READY'}</span></div>`;
    }
    this.el.crew.innerHTML = chips;

    // race card
    if (S.race) {
      this.el.race.hidden = false;
      this.el.race.innerHTML =
        `<div class="raceName">${S.race.name.toUpperCase()}</div>` +
        `<div class="raceMain">P${S.race.position}/4 · CP ${S.race.cp}/${S.race.total}</div>` +
        `<div class="raceSub">${S.race.time} · prize $${S.race.prize.toLocaleString()}</div>`;
    } else this.el.race.hidden = true;

    drawMinimap(this.el.mini, S.mapView);
  }

  // ---- weapon wheel ----
  showWheel(S) {
    let cells = '';
    WEAPONS.forEach((w, i) => {
      const locked = S.ranks.level < w.rank;
      const owned = S.arsenal.owned[w.id];
      cells += `<div class="gunSlot ${i === S.arsenal.slot ? 'active' : ''} ${locked ? 'locked' : ''}">` +
        `<span class="gName">${w.name}</span><span class="gAmmo">${locked ? `RANK ${w.rank}` : owned ? 'OWNED' : `$${w.price}`}</span></div>`;
    });
    this.el.wheel.innerHTML = `<div class="wheelHead">WEAPON WHEEL — digits 1–6 pick, release Q</div><div class="wheelGrid">${cells}</div>`;
    this.el.wheel.hidden = false;
  }
  hideWheel() { this.el.wheel.hidden = true; }

  // ---- shop / garage panels ----
  showShop(shop, rows, cash) {
    let html = `<h3>${shop.name}</h3><div>${shop.blurb}</div>`;
    rows.forEach((r, i) => {
      html += `<div class="shopRow"><span>[${i + 1}] ${r.label}${r.locked ? ` — ${r.lockText}` : ''}</span><span class="price">${r.locked ? '🔒' : `$${r.price}`}</span></div>`;
    });
    html += `<div class="shopHint">Cash $${cash.toLocaleString()} · number keys buy · F or walk away to close</div>`;
    this.el.shop.innerHTML = html;
    this.el.shop.hidden = false;
  }
  hideShop() { this.el.shop.hidden = true; }

  showGarage(garage, vehicle) {
    let html = '<h3>SAFEHOUSE GARAGE</h3>';
    html += `<div class="shopRow"><span>Bay car: ${vehicle ? `${vehicle.spec.name} · COND ${Math.round(vehicle.condition)}%` : 'on foot'}</span></div>`;
    garage.stored.forEach((c, i) => {
      html += `<div class="shopRow"><span>Stored ${i + 1}: ${c.name} · COND ${c.condition}%</span><span class="price">[${i + 1}] TAKE</span></div>`;
    });
    html += '<div class="shopRow"><span>[S] Store current car</span><span class="price">FREE</span></div>';
    html += '<div class="shopRow"><span>[R] Repair $260 · [A] Armour $1800 (R5) · [N] Nitro $1200 (R3) · [P] Respray $300</span></div>';
    html += '<div class="shopHint">G or walk away to close</div>';
    this.el.garage.innerHTML = html;
    this.el.garage.hidden = false;
  }
  hideGarage() { this.el.garage.hidden = true; }

  // ---- pause MAP/STATS ----
  showPause(S) {
    this.el.pause.hidden = false;
    drawBigMap(this.el.bigMap, S.mapView);
    const pct = Math.round(S.completion * 100);
    this.el.completion.innerHTML =
      `<h4>COMPLETION</h4><div class="bigPct">${pct}%</div>` +
      `<div class="pctSub">${S.stats.jobsDone}/10 story jobs · ${S.casesTaken}/5 crown cases · ${S.stats.racesWon} races won</div>`;
    const st = S.stats;
    const rows = [
      ['Jobs done', st.jobsDone], ['Cars stolen', st.carsStolen],
      ['Cops escaped', st.copsEscaped], ['Distance driven', `${(st.distanceKm).toFixed(1)} km`],
      ['Races won', st.racesWon], ['Fares run', st.faresRun],
      ['Shots fired', st.shotsFired], ['Corales down', st.gangDown],
      ['Cash earned', `$${st.cashEarned.toLocaleString()}`], ['Times busted/wasted', st.busts],
    ];
    this.el.career.innerHTML = '<h4>CAREER — DARIO VENN</h4>' +
      rows.map(([k, v]) => `<div class="statRow"><span>${k}</span><b>${v}</b></div>`).join('');
    const rk = S.ranks;
    this.el.respectBlock.innerHTML = '<h4>RESPECT</h4>' +
      `<div class="statRow"><span>Rank ${rk.level}/8</span><b>${rk.current.title}</b></div>` +
      `<div class="respTrack"><div id="respFill" style="width:${Math.round(rk.progress() * 100)}%"></div></div>` +
      `<div class="pctSub">${rk.next ? `Next unlock at ${rk.next.rp} RP: ${rk.next.unlock}` : 'Every unlock earned.'}</div>`;
    let slots = '<h4>SAVE SLOTS</h4>';
    for (let i = 0; i < 3; i += 1) {
      const s = slotSummary(i);
      slots += `<div class="slotRow"><span>SLOT ${i + 1}</span><span class="slotState ${s.empty ? 'empty' : ''}">${s.label}</span></div>`;
    }
    slots += '<div class="pctSub">Autosave runs as you play · F5–F7 write slots 1–3</div>';
    this.el.slots.innerHTML = slots;
  }
  hidePause() { this.el.pause.hidden = true; }
}
