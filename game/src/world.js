// The kitchen itself: orders, stations, the chef's hands, the grill and the
// chopping board, the plate, coins, combo and the shift clock. Pure rules:
// no drawing and no sound in here, so the screenshot autopilot can drive the
// very same world a player drives.
import {
  BINS, BURN_SECONDS, CHEF_RADIUS, CHEF_SPEED, CHOP_SECONDS, COMBO_WINDOW, FLOOR,
  GRILL_SECONDS, GRILL_SLOTS, INGREDIENTS, INTERACT_RANGE, MAX_HEARTS, MAX_ORDERS,
  PLATE_MAX, RECIPES, SHIFT_SECONDS, STATIONS, binPoint, levelForServed,
  patienceSeconds, recipeById, spawnIntervalSeconds, stationPoint,
} from './config.js';

export const EVENT_OVER = 1;
export const EVENT_SERVED = 2;

/** One carried or plated item: a kind plus its prep state. */
export function makeItem(kind, state) {
  return { kind, state };
}
export function itemKey(item) {
  return `${item.kind}:${item.state}`;
}

/** The recipe an order wants, as a multiset of item keys. */
export function recipeNeeds(recipe) {
  return recipe.needs.map(([kind, state]) => `${kind}:${state}`);
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const key of a) counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const key of b) {
    const left = counts.get(key) ?? 0;
    if (left === 0) return false;
    counts.set(key, left - 1);
  }
  return true;
}

/** A plate matches an order when it holds exactly the recipe's items. */
export function plateMatchesOrder(plate, order) {
  return sameMultiset(plate.map(itemKey), recipeNeeds(recipeById(order.recipeId)));
}

export function createWorld(random) {
  const state = {
    chef: { x: 640, y: 420, hand: null, facing: 1 },
    grill: Array.from({ length: GRILL_SLOTS }, () => null),
    board: null,
    plate: [],
    orders: [],
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    level: 1,
    served: 0,
    lost: 0,
    timeLeft: SHIFT_SECONDS,
    spawnTimer: 6,
    nextOrderId: 1,
    over: false,
    stars: 0,
    events: [],
    particles: [],
    popups: [],
    time: 0,
  };

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    // Cheaper dishes show up more often early in the shift.
    const pool = RECIPES.filter((r) => r.price <= 14 + state.level * 3);
    const recipe = random.pick(pool.length ? pool : RECIPES);
    const patience = patienceSeconds(state.level);
    state.orders.push({
      id: state.nextOrderId,
      recipeId: recipe.id,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
    state.events.push('order');
  }

  function reset() {
    state.chef = { x: 640, y: 420, hand: null, facing: 1 };
    state.grill = Array.from({ length: GRILL_SLOTS }, () => null);
    state.board = null;
    state.plate = [];
    state.orders = [];
    state.coins = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.hearts = MAX_HEARTS;
    state.level = 1;
    state.served = 0;
    state.lost = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.spawnTimer = 6;
    state.nextOrderId = 1;
    state.over = false;
    state.stars = 0;
    state.events = [];
    state.particles = [];
    state.popups = [];
    state.time = 0;
    spawnOrder();
    spawnOrder();
  }

  function addPopup(x, y, text, color) {
    state.popups.push({ x, y, text, color, life: 1.4 });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.next() * Math.PI * 2;
      const speed = 30 + random.next() * 70;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.5 + random.next() * 0.4,
        color,
      });
    }
  }

  function endShift() {
    state.over = true;
    state.stars = state.coins >= 260 ? 3 : state.coins >= 150 ? 2 : state.coins >= 60 ? 1 : 0;
    state.events.push('over');
  }
  /** Advance the kitchen one fixed step. `input` is {x, y} movement. */
  function step(dt, input, playing) {
    state.time += dt;
    if (!playing || state.over) {
      updateEffects(dt);
      return 0;
    }
    moveChef(dt, input);
    cookOnGrill(dt);
    chopOnBoard(dt);
    updateOrders(dt);
    updateShift(dt);
    updateEffects(dt);
    return state.over ? EVENT_OVER : 0;
  }

  function moveChef(dt, input) {
    const chef = state.chef;
    const len = Math.hypot(input.x, input.y);
    if (len < 0.01) return;
    const nx = input.x / len;
    const ny = input.y / len;
    chef.x = Math.min(FLOOR.x + FLOOR.width - CHEF_RADIUS, Math.max(FLOOR.x + CHEF_RADIUS, chef.x + nx * CHEF_SPEED * dt));
    chef.y = Math.min(FLOOR.y + FLOOR.height - CHEF_RADIUS, Math.max(FLOOR.y + CHEF_RADIUS, chef.y + ny * CHEF_SPEED * dt));
    if (Math.abs(nx) > 0.1) chef.facing = nx > 0 ? 1 : -1;
  }

  function cookOnGrill(dt) {
    for (let slot = 0; slot < state.grill.length; slot += 1) {
      const item = state.grill[slot];
      if (!item) continue;
      item.t += dt;
      const point = stationPoint(STATIONS.grill);
      if (item.state === 'raw' && item.t >= GRILL_SECONDS) {
        item.state = 'cooked';
        state.events.push('cooked');
        burst(point.x - 60 + slot * 90, point.y - 30, '#ffd76a', 8);
      } else if (item.state === 'cooked' && item.t >= BURN_SECONDS) {
        item.state = 'burnt';
        state.events.push('burnt');
        burst(point.x - 60 + slot * 90, point.y - 30, '#555', 8);
      }
      if (item.state === 'raw' && Math.floor(item.t * 4) !== Math.floor((item.t - dt) * 4)) {
        state.particles.push({
          x: point.x - 60 + slot * 90 + (random.next() - 0.5) * 40,
          y: point.y - 34,
          vx: (random.next() - 0.5) * 12,
          vy: -34 - random.next() * 22,
          life: 0.5,
          color: '#cfd6dd',
        });
      }
    }
  }

  function chopOnBoard(dt) {
    const job = state.board;
    if (!job || job.state !== 'raw') return;
    job.t += dt;
    if (Math.floor(job.t * 3) !== Math.floor((job.t - dt) * 3)) {
      state.events.push('chop');
      burst(stationPoint(STATIONS.board).x, stationPoint(STATIONS.board).y - 30, '#cfe8b0', 3);
    }
    if (job.t >= CHOP_SECONDS) {
      job.state = 'chopped';
      state.events.push('chopped');
    }
  }

  function updateOrders(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer = spawnIntervalSeconds(state.level);
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.lost += 1;
        state.hearts -= 1;
        state.combo = 0;
        state.events.push('expired');
        if (state.hearts <= 0) endShift();
      }
    }
  }

  function updateShift(dt) {
    const before = Math.ceil(state.timeLeft);
    state.timeLeft -= dt;
    if (state.timeLeft <= 10 && Math.ceil(state.timeLeft) !== before) state.events.push('tick');
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endShift();
    }
  }

  function updateEffects(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const p = state.popups[i];
      p.y -= 26 * dt;
      p.life -= dt;
      if (p.life <= 0) state.popups.splice(i, 1);
    }
  }
  /** The closest usable station or bin, with its kind and point. */
  function nearestUsable() {
    const chef = state.chef;
    let best = null;
    let bestDist = INTERACT_RANGE;
    const consider = (kind, point, ref) => {
      const dist = Math.hypot(chef.x - point.x, chef.y - point.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { kind, point, ref };
      }
    };
    for (const [name, station] of Object.entries(STATIONS)) consider(name, stationPoint(station), station);
    for (const bin of BINS) consider('bin', binPoint(bin), bin);
    return best;
  }

  function servePlate() {
    const order = state.orders.find((o) => plateMatchesOrder(state.plate, o));
    const point = stationPoint(STATIONS.window);
    if (!order) {
      if (state.plate.length > 0) state.events.push('error');
      return;
    }
    const recipe = recipeById(order.recipeId);
    state.orders = state.orders.filter((o) => o !== order);
    const tip = Math.round(recipe.price * 0.5 * Math.max(0, order.patience / order.maxPatience));
    state.combo = state.time - (state.lastServeAt ?? -999) < COMBO_WINDOW ? state.combo + 1 : 1;
    state.lastServeAt = state.time;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const earned = recipe.price + tip + (state.combo - 1) * 2;
    state.coins += earned;
    state.served += 1;
    state.level = levelForServed(state.served);
    state.plate = [];
    state.events.push('serve');
    addPopup(point.x, point.y - 60, `+$${earned}`, '#ffd76a');
    if (state.combo >= 2) addPopup(point.x, point.y - 88, `COMBO x${state.combo}!`, '#ff9d5c');
    burst(point.x, point.y - 40, '#ffd76a', 14);
  }

  /** Use the nearest station or bin. Returns true when something happened. */
  function interact() {
    if (state.over) return false;
    const target = nearestUsable();
    if (!target) return false;
    const chef = state.chef;
    const hand = chef.hand;

    if (target.kind === 'bin') {
      if (hand) return false;
      chef.hand = makeItem(target.ref.kind, 'raw');
      state.events.push('pickup');
      return true;
    }
    if (target.kind === 'grill') {
      if (hand && hand.kind === 'patty' && hand.state === 'raw') {
        const slot = state.grill.findIndex((s) => s === null);
        if (slot === -1) return false;
        state.grill[slot] = makeItem('patty', 'raw');
        state.grill[slot].t = 0;
        chef.hand = null;
        state.events.push('sizzle');
        return true;
      }
      if (!hand) {
        const slot = state.grill.findIndex((s) => s !== null);
        if (slot === -1) return false;
        chef.hand = makeItem(state.grill[slot].kind, state.grill[slot].state);
        state.grill[slot] = null;
        state.events.push('pickup');
        return true;
      }
      return false;
    }
    if (target.kind === 'board') {
      if (hand && INGREDIENTS[hand.kind].prep === 'chop' && hand.state === 'raw' && !state.board) {
        state.board = makeItem(hand.kind, 'raw');
        state.board.t = 0;
        chef.hand = null;
        state.events.push('place');
        return true;
      }
      if (!hand && state.board) {
        chef.hand = makeItem(state.board.kind, state.board.state);
        state.board = null;
        state.events.push('pickup');
        return true;
      }
      return false;
    }
    if (target.kind === 'assembly') {
      if (hand && state.plate.length < PLATE_MAX) {
        state.plate.push(hand);
        chef.hand = null;
        state.events.push('place');
        return true;
      }
      if (!hand && state.plate.length > 0) {
        chef.hand = state.plate.pop();
        state.events.push('pickup');
        return true;
      }
      return false;
    }
    if (target.kind === 'window') {
      servePlate();
      return true;
    }
    if (target.kind === 'trash') {
      if (hand) {
        chef.hand = null;
        state.events.push('trash');
        return true;
      }
      if (state.plate.length > 0) {
        state.plate = [];
        state.events.push('trash');
        return true;
      }
      return false;
    }
    return false;
  }

  return {
    state,
    reset,
    step,
    interact,
    nearestUsable,
    spawnOrder,
  };
}
