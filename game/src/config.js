// Ember Kitchen: every number the game balances on lives here, so the world
// and the renderer always agree about where things are and how long they take.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'ember-kitchen-best';
export const SHIFT_SECONDS = 180;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const COMBO_WINDOW = 12;
export const CHEF_SPEED = 270;
export const CHEF_RADIUS = 20;
export const INTERACT_RANGE = 78;
export const CHOP_SECONDS = 2;
export const GRILL_SECONDS = 6;
export const BURN_SECONDS = 12;
export const GRILL_SLOTS = 2;
export const PLATE_MAX = 6;

/** The chef walks this open floor; the counters sit on its edges. */
export const FLOOR = { x: 36, y: 246, width: 1208, height: 312 };

/** One ingredient kind: its raw look, what prep it needs, and its icon tint. */
export const INGREDIENTS = {
  bun: { label: 'Bun', color: '#e8a95c', dark: '#b97c33', prep: 'none', icon: 'bun' },
  patty: { label: 'Patty', color: '#a85b3f', dark: '#7c3f28', prep: 'grill', icon: 'patty' },
  tomato: { label: 'Tomato', color: '#e14b3a', dark: '#a92e22', prep: 'chop', icon: 'tomato' },
  lettuce: { label: 'Lettuce', color: '#69b455', dark: '#3f7d31', prep: 'chop', icon: 'lettuce' },
  cheese: { label: 'Cheese', color: '#f2c230', dark: '#c08d12', prep: 'none', icon: 'cheese' },
  onion: { label: 'Onion', color: '#b678c9', dark: '#7d4a94', prep: 'chop', icon: 'onion' },
};

export const INGREDIENT_KINDS = ['bun', 'patty', 'tomato', 'lettuce', 'cheese', 'onion'];

/** A station the chef walks up to and uses with E / Space / click. */
export const STATIONS = {
  grill: { x: 80, y: 132, w: 200, h: 84, label: 'GRILL', sub: 'cook patties' },
  board: { x: 320, y: 132, w: 200, h: 84, label: 'CHOPPING BOARD', sub: 'chop veg' },
  assembly: { x: 560, y: 132, w: 220, h: 84, label: 'ASSEMBLY', sub: 'build the dish' },
  window: { x: 820, y: 132, w: 220, h: 84, label: 'SERVING WINDOW', sub: 'serve orders' },
  trash: { x: 1080, y: 132, w: 120, h: 84, label: 'TRASH', sub: 'dump it' },
};

/** Ingredient bins along the bottom counter, in the order the chef meets them. */
export const BINS = INGREDIENT_KINDS.map((kind, i) => ({
  kind,
  x: 80 + i * 200,
  y: 614,
  w: 160,
  h: 76,
}));

/** Where the chef stands to use a station: just in front of its counter. */
export function stationPoint(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h + 34 };
}
export function binPoint(bin) {
  // The chef cannot walk past the floor's edge, so the stand point sits
  // 60 px above the bin: close enough to reach, far enough to walk to.
  return { x: bin.x + bin.w / 2, y: bin.y - 60 };
}

/**
 * The menu: 8 dishes. `needs` lists the exact items a finished plate must
 * hold — kind plus state (raw, chopped, cooked). Order does not matter.
 */
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', price: 12, needs: [['bun', 'raw'], ['patty', 'cooked'], ['lettuce', 'chopped']] },
  { id: 'cheese', name: 'Cheese Burger', price: 14, needs: [['bun', 'raw'], ['patty', 'cooked'], ['cheese', 'raw']] },
  { id: 'double', name: 'Double Stack', price: 20, needs: [['bun', 'raw'], ['patty', 'cooked'], ['patty', 'cooked'], ['cheese', 'raw'], ['tomato', 'chopped']] },
  { id: 'salad', name: 'Garden Salad', price: 10, needs: [['lettuce', 'chopped'], ['tomato', 'chopped'], ['onion', 'chopped']] },
  { id: 'crunch', name: 'Crunch Burger', price: 15, needs: [['bun', 'raw'], ['patty', 'cooked'], ['tomato', 'chopped'], ['onion', 'chopped']] },
  { id: 'melt', name: 'Double Melt', price: 17, needs: [['bun', 'raw'], ['patty', 'cooked'], ['cheese', 'raw'], ['cheese', 'raw']] },
  { id: 'veggie', name: 'Veggie Stack', price: 16, needs: [['bun', 'raw'], ['lettuce', 'chopped'], ['tomato', 'chopped'], ['onion', 'chopped'], ['cheese', 'raw']] },
  { id: 'ember', name: 'Big Ember', price: 24, needs: [['bun', 'raw'], ['patty', 'cooked'], ['patty', 'cooked'], ['cheese', 'raw'], ['lettuce', 'chopped'], ['tomato', 'chopped']] },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) ?? RECIPES[0];
}

/** Orders get faster and less patient as the shift heats up. */
export function spawnIntervalSeconds(level) {
  return Math.max(7, 15 - level);
}
export function patienceSeconds(level) {
  return Math.max(34, 56 - level * 3);
}
export function levelForServed(served) {
  return 1 + Math.floor(served / 4);
}
