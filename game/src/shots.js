// The screenshot scenes behind ?shot=title|play|serve|end. Each one plays the
// real rules forward from a fresh world with a fixed seed, steered by a small
// autopilot that walks the chef between stations, so every frame is what a
// short game really looks like and the same seed always gives the same frame.
import { BINS, STEP, STATIONS, binPoint, recipeById, stationPoint } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const MAX_STEPS = 60 * 120;

/** A queue of moves, uses and waits the pilot works through, one step at a time. */
function createPilot() {
  const queue = [];
  let current = null;
  let waitLeft = 0;
  let waitTimeout = 0;
  return {
    goto(point) { queue.push({ op: 'move', point }); return this; },
    use() { queue.push({ op: 'use' }); return this; },
    wait(seconds) { queue.push({ op: 'wait', seconds }); return this; },
    waitUntil(fn, max = 40) { queue.push({ op: 'waitUntil', fn, max }); return this; },
    done() { return !current && queue.length === 0; },
    input(state) {
      if (!current) current = queue.shift() ?? null;
      if (!current) return { x: 0, y: 0, interact: false };
      if (current.op === 'move') {
        const dx = current.point.x - state.chef.x;
        const dy = current.point.y - state.chef.y;
        const dist = Math.hypot(dx, dy);
        // The floor clamps the chef a few pixels short of a station's point,
        // so "arrived" must allow that gap or the pilot walks forever.
        if (dist < 26) {
          current = null;
          return { x: 0, y: 0, interact: false };
        }
        return { x: dx / dist, y: dy / dist, interact: false };
      }
      if (current.op === 'use') {
        current = null;
        return { x: 0, y: 0, interact: true };
      }
      if (current.op === 'wait') {
        if (waitLeft <= 0) waitLeft = current.seconds;
        waitLeft -= STEP;
        if (waitLeft <= 0) {
          current = null;
          waitLeft = 0;
        }
        return { x: 0, y: 0, interact: false };
      }
      if (current.op === 'waitUntil') {
        if (waitTimeout <= 0) waitTimeout = current.max;
        waitTimeout -= STEP;
        if (current.fn(state) || waitTimeout <= 0) {
          current = null;
          waitTimeout = 0;
        }
        return { x: 0, y: 0, interact: false };
      }
      current = null;
      return { x: 0, y: 0, interact: false };
    },
  };
}

/** Walk one ingredient from its bin, through its prep, onto the plate. */
function queueIngredient(pilot, kind, itemState) {
  const bin = BINS.find((b) => b.kind === kind);
  if (itemState === 'raw') {
    pilot.goto(binPoint(bin)).use();
    pilot.goto(stationPoint(STATIONS.assembly)).use();
  } else if (itemState === 'cooked') {
    pilot.goto(binPoint(bin)).use();
    pilot.goto(stationPoint(STATIONS.grill)).use();
    pilot.waitUntil((s) => s.grill.some((g) => g && g.state === 'cooked'));
    pilot.goto(stationPoint(STATIONS.grill)).use();
    pilot.goto(stationPoint(STATIONS.assembly)).use();
  } else if (itemState === 'chopped') {
    pilot.goto(binPoint(bin)).use();
    pilot.goto(stationPoint(STATIONS.board)).use();
    pilot.waitUntil((s) => s.board && s.board.state === 'chopped');
    pilot.goto(stationPoint(STATIONS.board)).use();
    pilot.goto(stationPoint(STATIONS.assembly)).use();
  }
}

/** Grab and prep one ingredient but hold it, for the mid-assembly frame. */
function queueHoldIngredient(pilot, kind, itemState) {
  const bin = BINS.find((b) => b.kind === kind);
  if (itemState === 'raw') {
    pilot.goto(binPoint(bin)).use();
  } else if (itemState === 'cooked') {
    pilot.goto(binPoint(bin)).use();
    pilot.goto(stationPoint(STATIONS.grill)).use();
    pilot.waitUntil((s) => s.grill.some((g) => g && g.state === 'cooked'));
    pilot.goto(stationPoint(STATIONS.grill)).use();
  } else if (itemState === 'chopped') {
    pilot.goto(binPoint(bin)).use();
    pilot.goto(stationPoint(STATIONS.board)).use();
    pilot.waitUntil((s) => s.board && s.board.state === 'chopped');
    pilot.goto(stationPoint(STATIONS.board)).use();
  }
}

/** The order with the most patience left: the safest one to cook for. */
function pickOrder(state) {
  return state.orders.reduce((best, o) => (best === null || o.patience > best.patience ? o : best), null);
}

function runPilot(world, pilot) {
  for (let i = 0; i < MAX_STEPS; i += 1) {
    const input = pilot.input(world.state);
    world.step(STEP, { x: input.x, y: input.y }, true);
    if (input.interact) world.interact();
    if (pilot.done()) break;
  }
}

function idle(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, true);
}

/**
 * Set `world` to the named scene (title, play, serve or end; any other name
 * is title) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    idle(world, 3);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const order = pickOrder(state);
    const recipe = recipeById(order.recipeId);
    const pilot = createPilot();
    const needs = [...recipe.needs];
    const last = needs.pop();
    for (const [kind, itemState] of needs) queueIngredient(pilot, kind, itemState);
    queueHoldIngredient(pilot, last[0], last[1]);
    runPilot(world, pilot);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    const order = pickOrder(state);
    const recipe = recipeById(order.recipeId);
    const pilot = createPilot();
    for (const [kind, itemState] of recipe.needs) queueIngredient(pilot, kind, itemState);
    pilot.goto(stationPoint(STATIONS.window)).use();
    runPilot(world, pilot);
    idle(world, 0.4);
    return { screen: SCREEN_PLAY, best: state.coins };
  }
  // end: serve four orders, then let the shift clock run out.
  for (let round = 0; round < 4; round += 1) {
    const order = pickOrder(state);
    if (!order) break;
    const recipe = recipeById(order.recipeId);
    const pilot = createPilot();
    for (const [kind, itemState] of recipe.needs) queueIngredient(pilot, kind, itemState);
    pilot.goto(stationPoint(STATIONS.window)).use();
    runPilot(world, pilot);
  }
  state.timeLeft = 0.5;
  for (let i = 0; i < 2 / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0 }, true);
    if (state.over) break;
  }
  return { screen: SCREEN_OVER, best: state.coins };
}
