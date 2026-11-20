// minimap.js — top-down city rendering shared by the HUD minimap and
// the pause MAP/STATS screen. One world→map transform, district tints,
// the boulevard curve, objective route line, and blips for police,
// rivals, traffic, shops, the boat and the active race checkpoint.

import { WORLD, boulevardZ } from './config.js';
import { DISTRICTS } from './districts.js';
import { SHOPS } from './shops.js';

const WX0 = -365; const WX1 = 365; const WZ0 = -345; const WZ1 = 250;

export function worldToMap(x, z, w, h) {
  return [
    ((x - WX0) / (WX1 - WX0)) * w,
    ((z - WZ0) / (WZ1 - WZ0)) * h,
  ];
}

function drawBase(ctx, w, h, labels) {
  ctx.fillStyle = '#20303e';
  ctx.fillRect(0, 0, w, h);
  // district tints
  for (const d of DISTRICTS) {
    const [x0, y0] = worldToMap(d.x0, d.z0, w, h);
    const [x1, y1] = worldToMap(d.x1, d.z1, w, h);
    ctx.fillStyle = d.color + '45';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = d.color + '88';
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    if (labels) {
      ctx.fillStyle = d.color;
      ctx.font = `800 ${Math.round(h * 0.028)}px Verdana`;
      ctx.textAlign = 'center';
      ctx.fillText(d.name, (x0 + x1) / 2, y0 + h * 0.045);
    }
  }
  // sea + beach
  const [, seaY] = worldToMap(0, 150, w, h);
  ctx.fillStyle = '#fbe3ae';
  ctx.fillRect(0, seaY, w, h * 0.03);
  ctx.fillStyle = '#14607e';
  ctx.fillRect(0, seaY + h * 0.03, w, h - seaY);
  // roads
  ctx.strokeStyle = 'rgba(255,230,190,0.75)';
  ctx.lineWidth = Math.max(1.4, h * 0.006);
  for (const ax of WORLD.avenues) {
    const [x] = worldToMap(ax, 0, w, h);
    const [, y0] = worldToMap(0, -330, w, h);
    const [, y1] = worldToMap(0, 105, w, h);
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  }
  for (const sz of WORLD.streets) {
    const [, y] = worldToMap(0, sz, w, h);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.strokeStyle = '#ffd23c';
  ctx.lineWidth = Math.max(1.8, h * 0.008);
  ctx.beginPath();
  for (let x = -352; x <= 352; x += 16) {
    const [mx, my] = worldToMap(x, boulevardZ(x), w, h);
    if (x === -352) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
  }
  ctx.stroke();
}

function blip(ctx, x, z, w, h, color, r = 3) {
  const [mx, my] = worldToMap(x, z, w, h);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawMinimap(canvas, view) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  drawBase(ctx, w, h, false);
  drawBlips(ctx, w, h, view, 2.2);
  drawPlayer(ctx, w, h, view);
}

export function drawBigMap(canvas, view) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  drawBase(ctx, w, h, true);
  // landmark labels
  ctx.font = `700 ${Math.round(h * 0.024)}px Verdana`;
  ctx.textAlign = 'center';
  const marks = [
    ['⚓ MARINA PIER', -262, 190], ['★ SAFEHOUSE', -262, 92],
    ['MERCADO', 92, 126], ['REGENT HOTEL', 252, -168],
    ['VAULT', 236, -246], ['OLD TOWN PLAZA', -64, -84],
  ];
  ctx.fillStyle = '#fff6ea';
  for (const [label, x, z] of marks) {
    const [mx, my] = worldToMap(x, z, w, h);
    ctx.fillText(label, mx, my);
  }
  drawBlips(ctx, w, h, view, 4);
  drawPlayer(ctx, w, h, view, 7);
}

function drawBlips(ctx, w, h, view, r) {
  // objective route first, under everything
  if (view.objective) {
    const [px, py] = worldToMap(view.player.x, view.player.z, w, h);
    const [ox, oy] = worldToMap(view.objective.x, view.objective.z, w, h);
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.arc(ox, oy, r + 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath(); ctx.arc(ox, oy, r + 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.arc(ox, oy, r - 0.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of SHOPS) blip(ctx, s.x, s.z, w, h, '#2ee6c8', r - 0.6);
  if (view.traffic) for (const c of view.traffic) blip(ctx, c.pos.x, c.pos.z, w, h, 'rgba(255,255,255,0.5)', r - 1.2);
  if (view.rivals) for (const rv of view.rivals) blip(ctx, rv.car.pos.x, rv.car.pos.z, w, h, '#ff2a3c', r);
  if (view.police) {
    for (const u of view.police) {
      blip(ctx, u.car.pos.x, u.car.pos.z, w, h, (Math.floor(view.t * 3) % 2) ? '#2266ff' : '#ff2233', r);
    }
  }
  if (view.boat) blip(ctx, view.boat.pos.x, view.boat.pos.z, w, h, '#ff5d7e', r - 0.4);
  if (view.gang) for (const m of view.gang) if (m.alive) blip(ctx, m.x, m.z, w, h, '#ff8c1a', r - 0.8);
}

function drawPlayer(ctx, w, h, view, r = 4) {
  const [mx, my] = worldToMap(view.player.x, view.player.z, w, h);
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(-(view.player.angle ?? 0));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ff9a3c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r - 1.6);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
