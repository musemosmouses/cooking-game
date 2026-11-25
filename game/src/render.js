// Everything the player sees: the kitchen, the order board, the chef, the
// stations and every ingredient, all drawn as canvas shapes so the game needs
// no image files at all.
import { BINS, FLOOR, INGREDIENTS, RECIPES, STATIONS, VIEW, recipeById } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const WALL = '#7a4a2b';
const WALL_DARK = '#5d3620';
const FLOOR_A = '#e9d8b8';
const FLOOR_B = '#dcc69c';
const COUNTER_TOP = '#c98f4e';
const COUNTER_BODY = '#8a5a2e';
const STEEL = '#b9c4cc';
const INK = '#2b1d12';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** A readable pill label pinned above a station. */
function stationLabel(ctx, station, active) {
  const cx = station.x + station.w / 2;
  ctx.fillStyle = active ? '#ffd76a' : 'rgba(43, 29, 18, 0.85)';
  roundRect(ctx, cx - 62, station.y - 26, 124, 22, 11);
  ctx.fill();
  text(ctx, station.label, cx, station.y - 14, 12, active ? INK : '#ffe9c4', '800', 'center');
  text(ctx, station.sub, cx, station.y + station.h + 14, 11, '#f7e3c2', '600', 'center');
}

function drawKitchen(ctx) {
  // Repaint the whole canvas first: the strip between the wall and the
  // floor is covered by no tile, so anything drawn there on an earlier
  // screen (the title) would ghost into play forever without this.
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, VIEW.width, 118);
  ctx.fillStyle = WALL_DARK;
  for (let x = 0; x < VIEW.width; x += 96) {
    ctx.fillRect(x, 104, 48, 14);
  }
  // Warm pendant lamps over the counters.
  for (const x of [200, 560, 920, 1180]) {
    ctx.strokeStyle = '#3a2415';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 34);
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(x - 16, 52);
    ctx.lineTo(x + 16, 52);
    ctx.lineTo(x + 8, 32);
    ctx.lineTo(x - 8, 32);
    ctx.closePath();
    ctx.fill();
  }
  // Chequered floor.
  const tile = 76;
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.height; y += tile) {
    for (let x = FLOOR.x; x < FLOOR.x + FLOOR.width; x += tile) {
      const odd = (Math.floor((x - FLOOR.x) / tile) + Math.floor((y - FLOOR.y) / tile)) % 2 === 0;
      ctx.fillStyle = odd ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(43, 29, 18, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.width, FLOOR.height);
}

function drawCounters(ctx) {
  for (const station of Object.values(STATIONS)) {
    ctx.fillStyle = COUNTER_BODY;
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.fillStyle = COUNTER_TOP;
    roundRect(ctx, station.x - 4, station.y - 6, station.w + 8, 20, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 29, 18, 0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.stroke();
    stationLabel(ctx, station, false);
  }
  // The serving window is a hatch: dark opening with a warm glow.
  const win = STATIONS.window;
  ctx.fillStyle = '#3a2415';
  roundRect(ctx, win.x + 14, win.y + 16, win.w - 28, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PICK UP', win.x + win.w / 2, win.y + 39);
}

function drawBins(ctx) {
  for (const bin of BINS) {
    const ing = INGREDIENTS[bin.kind];
    ctx.fillStyle = STEEL;
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fill();
    ctx.fillStyle = ing.color;
    roundRect(ctx, bin.x + 8, bin.y + 8, bin.w - 16, 30, 6);
    ctx.fill();
    text(ctx, ing.label.toUpperCase(), bin.x + bin.w / 2, bin.y + 56, 13, INK, '800', 'center');
    drawIngredientIcon(ctx, bin.kind, 'raw', bin.x + bin.w / 2, bin.y + 23, 15);
  }
}
/** One ingredient, drawn as a flat icon: bun, patty, tomato, lettuce, cheese, onion. */
export function drawIngredientIcon(ctx, kind, state, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = '#e8a95c';
    ctx.beginPath();
    ctx.arc(0, 2, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c98a3e';
    ctx.fillRect(-r, 2, r * 2, r * 0.42);
    ctx.fillStyle = '#fff3d6';
    for (const [sx, sy] of [[-r * 0.4, -r * 0.45], [0, -r * 0.6], [r * 0.4, -r * 0.45]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#2e2e2e' : state === 'cooked' ? '#6e3b22' : '#a85b3f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'cooked') {
      ctx.strokeStyle = '#4a2413';
      ctx.lineWidth = 2;
      for (const sx of [-r * 0.5, 0, r * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(sx, -r * 0.3);
        ctx.lineTo(sx, r * 0.3);
        ctx.stroke();
      }
    }
  } else if (kind === 'tomato') {
    ctx.fillStyle = '#e14b3a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#69b455';
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.2, r * 0.4, 0, Math.PI * 2);
      ctx.arc(r * 0.35, -r * 0.1, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = '#69b455';
    for (const [ox, oy] of [[-r * 0.4, 0], [r * 0.4, 0], [0, -r * 0.35]]) {
      ctx.beginPath();
      ctx.arc(ox, oy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3f7d31';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.quadraticCurveTo(0, r * 0.5, r * 0.7, 0);
    ctx.stroke();
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(r, r * 0.6);
    ctx.lineTo(r, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c08d12';
    for (const [hx, hy] of [[-r * 0.4, r * 0.25], [r * 0.3, r * 0.3]]) {
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'onion') {
    ctx.fillStyle = '#c9a0d8';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5aa8';
    ctx.lineWidth = 2;
    for (const rr of [0.55, 0.3]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (state === 'burnt' && kind !== 'patty') {
    ctx.fillStyle = 'rgba(20, 20, 20, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChef(ctx, chef, hand) {
  const { x, y } = chef;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(43, 29, 18, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: white apron over a teal shirt.
  ctx.fillStyle = '#2f8f7a';
  roundRect(ctx, -15, -6, 30, 24, 10);
  ctx.fill();
  ctx.fillStyle = '#fff8ec';
  roundRect(ctx, -11, -2, 22, 18, 6);
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#f2c69b';
  ctx.beginPath();
  ctx.arc(0, -16, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8ec';
  ctx.beginPath();
  ctx.arc(-6, -27, 8, 0, Math.PI * 2);
  ctx.arc(6, -27, 8, 0, Math.PI * 2);
  ctx.arc(0, -30, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -26, 22, 6);
  // Eyes look where the chef walks.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(chef.facing * 3 - 4, -17, 1.8, 0, Math.PI * 2);
  ctx.arc(chef.facing * 3 + 4, -17, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // The carried item floats above the chef's hands.
  if (hand) drawIngredientIcon(ctx, hand.kind, hand.state, 0, -44, 15);
  ctx.restore();
}

/** The grill's patties, the board's veg, the plate's stack, and the window. */
function drawStationContents(ctx, state) {
  const grill = STATIONS.grill;
  const grillXs = [grill.x + 55, grill.x + 145];
  for (let slot = 0; slot < state.grill.length; slot += 1) {
    const item = state.grill[slot];
    const gx = grillXs[slot];
    const gy = grill.y + 44;
    ctx.fillStyle = '#3c3c3c';
    ctx.beginPath();
    ctx.ellipse(gx, gy, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (item) {
      drawIngredientIcon(ctx, 'patty', item.state, gx, gy - 6, 20);
      const total = item.state === 'raw' ? 6 : 12;
      const frac = Math.min(1, item.t / total);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, gx - 24, gy - 34, 48, 7, 3);
      ctx.fill();
      ctx.fillStyle = item.state === 'burnt' ? '#e14b3a' : item.state === 'cooked' ? '#69b455' : '#ffd76a';
      roundRect(ctx, gx - 24, gy - 34, 48 * frac, 7, 3);
      ctx.fill();
    }
  }
  const board = STATIONS.board;
  ctx.fillStyle = '#e8d5a8';
  roundRect(ctx, board.x + 30, board.y + 22, 140, 44, 8);
  ctx.fill();
  if (state.board) {
    drawIngredientIcon(ctx, state.board.kind, state.board.state, board.x + 100, board.y + 44, 18);
    if (state.board.state === 'raw') {
      const frac = Math.min(1, state.board.t / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, board.x + 40, board.y + 68, 120, 7, 3);
      ctx.fill();
      ctx.fillStyle = '#69b455';
      roundRect(ctx, board.x + 40, board.y + 68, 120 * frac, 7, 3);
      ctx.fill();
    }
  }
  // The assembly plate, with the dish stacked on it, mid-assembly or done.
  const asm = STATIONS.assembly;
  const px = asm.x + asm.w / 2;
  const py = asm.y + 46;
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.ellipse(px, py, 62, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9aa7b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px, py, 62, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  state.plate.forEach((item, i) => {
    drawIngredientIcon(ctx, item.kind, item.state, px - 44 + i * 18, py - 14 - i * 4, 13);
  });
}

/** Floating score popups and sizzle/chop particles. */
function drawEffects(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of state.popups) {
    ctx.globalAlpha = Math.min(1, p.life);
    text(ctx, p.text, p.x, p.y, 22, p.color, '800', 'center');
  }
  ctx.globalAlpha = 1;
}
/** The order board: one ticket per waiting order, with its patience bar. */
function drawOrders(ctx, state) {
  text(ctx, 'ORDER BOARD', 24, 26, 15, '#ffe9c4', '800');
  const ticketW = 236;
  const gap = 14;
  state.orders.forEach((order, i) => {
    const recipe = recipeById(order.recipeId);
    const x = 150 + i * (ticketW + gap);
    const y = 10;
    const frac = Math.max(0, order.patience / order.maxPatience);
    const urgent = frac < 0.35;
    ctx.fillStyle = urgent && Math.floor(state.time * 4) % 2 === 0 ? '#ffe1d6' : '#fff8ec';
    roundRect(ctx, x, y, ticketW, 96, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#e14b3a' : '#c9a86a';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, ticketW, 96, 10);
    ctx.stroke();
    text(ctx, `#${order.id}  ${recipe.name.toUpperCase()}`, x + 12, y + 18, 13, INK, '800');
    text(ctx, `$${recipe.price}`, x + ticketW - 12, y + 18, 13, '#7c4a12', '800', 'right');
    recipe.needs.forEach(([kind, itemState], j) => {
      drawIngredientIcon(ctx, kind, itemState, x + 26 + j * 34, y + 48, 13);
    });
    ctx.fillStyle = '#e8dcc8';
    roundRect(ctx, x + 12, y + 74, ticketW - 24, 10, 5);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#69b455' : frac > 0.25 ? '#f2a230' : '#e14b3a';
    roundRect(ctx, x + 12, y + 74, (ticketW - 24) * frac, 10, 5);
    ctx.fill();
    text(ctx, `${Math.ceil(order.patience)}s`, x + ticketW - 12, y + 96 - 4, 10, '#8a6a3e', '700', 'right');
  });
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet — the lunch rush is coming…', 170, 58, 14, '#ffe9c4', '600');
  }
}

/** Coins, combo, hearts, level and the shift clock across the bottom. */
function drawHud(ctx, state) {
  const y = 566;
  ctx.fillStyle = 'rgba(43, 29, 18, 0.82)';
  roundRect(ctx, 24, y - 22, 1232, 44, 12);
  ctx.fill();
  text(ctx, `COINS  $${state.coins}`, 44, y, 20, '#ffd76a', '800');
  text(ctx, `SERVED  ${state.served}`, 260, y, 16, '#fff8ec', '700');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, 400, y, 16, '#ff9d5c', '800');
  }
  text(ctx, `LEVEL ${state.level}`, 560, y, 16, '#fff8ec', '700');
  const mm = Math.floor(state.timeLeft / 60);
  const ss = String(Math.floor(state.timeLeft % 60)).padStart(2, '0');
  const lowTime = state.timeLeft <= 30;
  text(ctx, `SHIFT  ${mm}:${ss}`, 700, y, 20, lowTime ? '#ff8a7a' : '#fff8ec', '800');
  for (let i = 0; i < 3; i += 1) {
    const hx = 900 + i * 34;
    ctx.fillStyle = i < state.hearts ? '#e14b3a' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(hx, y - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 11, y - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 10, y);
    ctx.lineTo(hx + 21, y);
    ctx.lineTo(hx + 5, y + 16);
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, 'WASD move · E use · P pause · M mute', 1236, y, 12, '#d8c9ae', '600', 'right');
}

/** The recipe card a new player reads before the first order lands. */
function drawMenuCard(ctx) {
  ctx.fillStyle = 'rgba(255, 248, 236, 0.96)';
  roundRect(ctx, 940, 250, 300, 330, 14);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  roundRect(ctx, 940, 250, 300, 330, 14);
  ctx.stroke();
  text(ctx, 'TODAY’S MENU — 8 DISHES', 1090, 276, 14, INK, '800', 'center');
  RECIPES.forEach((recipe, i) => {
    const y = 304 + i * 34;
    text(ctx, recipe.name, 956, y, 13, INK, '700');
    text(ctx, `$${recipe.price}`, 1224, y, 13, '#7c4a12', '800', 'right');
  });
}

function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(43, 29, 18, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'EMBER KITCHEN', 640, 220, 64, '#ffd76a', '800', 'center');
  text(ctx, 'Sizzle & Serve — a one-chef lunch rush', 640, 272, 22, '#fff8ec', '600', 'center');
  text(ctx, 'Grab ingredients, chop and grill them, stack the dish on the plate,', 640, 330, 17, '#ffe9c4', '600', 'center');
  text(ctx, 'and serve it at the window before the ticket runs out of patience.', 640, 356, 17, '#ffe9c4', '600', 'center');
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, 490, 392, 300, 56, 12);
  ctx.fill();
  text(ctx, 'PRESS SPACE TO START', 640, 421, 20, INK, '800', 'center');
  if (best > 0) text(ctx, `Best shift so far: $${best}`, 640, 470, 15, '#ffe9c4', '700', 'center');
  text(ctx, '8 recipes · 6 ingredients · chop + grill + assemble · tips & combos', 640, 520, 14, '#d8c9ae', '600', 'center');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(43, 29, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', 640, 330, 48, '#fff8ec', '800', 'center');
  text(ctx, 'Press P or Space to keep cooking', 640, 384, 18, '#ffe9c4', '600', 'center');
}

function drawOver(ctx, state, best) {
  ctx.fillStyle = 'rgba(43, 29, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SHIFT OVER', 640, 180, 52, '#ffd76a', '800', 'center');
  const stars = '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
  text(ctx, stars, 640, 248, 44, '#ffd76a', '800', 'center');
  text(ctx, `You earned $${state.coins}  ·  ${state.served} dishes served  ·  best combo x${state.bestCombo}`, 640, 316, 20, '#fff8ec', '700', 'center');
  text(ctx, `${state.lost} order${state.lost === 1 ? '' : 's'} walked out hungry`, 640, 348, 16, '#ffe9c4', '600', 'center');
  if (state.coins > best) text(ctx, 'New best shift!', 640, 384, 18, '#ff9d5c', '800', 'center');
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, 490, 420, 300, 56, 12);
  ctx.fill();
  text(ctx, 'PRESS SPACE TO COOK AGAIN', 640, 449, 18, INK, '800', 'center');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, activeStation) {
    drawKitchen(ctx);
    drawCounters(ctx);
    drawBins(ctx);
    drawStationContents(ctx, state);
    // Highlight the station the chef can use right now.
    if (screen === SCREEN_PLAY && activeStation) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(activeStation.point.x, activeStation.point.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, 'E', activeStation.point.x, activeStation.point.y - 40, 13, '#ffd76a', '800', 'center');
    }
    drawChef(ctx, state.chef, state.chef.hand);
    drawEffects(ctx, state);
    drawOrders(ctx, state);
    drawHud(ctx, state);
    if (screen === SCREEN_TITLE) {
      drawMenuCard(ctx);
      drawTitle(ctx, state, best);
    } else if (screen === SCREEN_PAUSED) {
      drawPaused(ctx);
    } else if (screen === SCREEN_OVER) {
      drawOver(ctx, state, best);
    }
  }

  return { draw };
}
