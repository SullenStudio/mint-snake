// Pure snake rules: no kaplay, no DOM, no wall clock. Everything the renderer
// needs to react to (bites, deaths, lost combos) comes back as events.

import { makeRng, randomSeed } from "./rng.js";

export const COLS = 17;
export const ROWS = 22;

export const START_LENGTH = 3;
export const MIN_LENGTH = 3;
export const BONE_SHRINK = 2;

export const FOOD_COUNT = 3;
export const FOOD = {
  APPLE: "apple",
  VOLT: "volt",
  PEPPER: "pepper",
  BONE: "bone",
};

export const SCORE = {
  [FOOD.APPLE]: 10,
  [FOOD.VOLT]: 15,
  [FOOD.PEPPER]: 10,
  [FOOD.BONE]: 5,
};

// One apple is already guaranteed on the board (see pickType), so the random
// slots lean towards the snacks that create decisions.
const WEIGHTS = [
  [FOOD.APPLE, 40],
  [FOOD.VOLT, 20],
  [FOOD.PEPPER, 20],
  [FOOD.BONE, 20],
];
const WEIGHT_TOTAL = WEIGHTS.reduce((sum, [, w]) => sum + w, 0);

export const VOLT_TIME = 4;
export const WRAP_TIME = 3;
export const COMBO_WINDOW = 3.2;
export const MAX_MULT = 4;

export const STEP_START = 0.18;
export const STEP_MIN = 0.085;
const STEP_RAMP = 0.004;
const VOLT_FACTOR = 0.62;

export const QUEUE_MAX = 2;

// A tab that was backgrounded must not drain effect timers in one gulp, nor
// teleport the snake across the board when it comes back.
const MAX_DT = 0.5;

const key = (p) => `${p.x},${p.y}`;

export function comboMult(combo) {
  return Math.min(MAX_MULT, 1 + Math.floor(combo / 3));
}

export function stepInterval(state) {
  const grown = Math.max(0, state.snake.length - START_LENGTH);
  const base = Math.max(STEP_MIN, STEP_START - grown * STEP_RAMP);
  return state.voltLeft > 0 ? base * VOLT_FACTOR : base;
}

function freeCell(state) {
  const taken = new Set();
  for (const p of state.snake) taken.add(key(p));
  for (const f of state.foods) taken.add(key(f));

  for (let i = 0; i < 200; i++) {
    const x = state.rng.int(COLS);
    const y = state.rng.int(ROWS);
    if (!taken.has(`${x},${y}`)) return { x, y };
  }
  // Nearly full board: fall back to a scan so we never spin forever.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
}

function pickType(state) {
  // Guarantee a way forward: an all-bone board would be a dead end.
  if (!state.foods.some((f) => f.type === FOOD.APPLE)) return FOOD.APPLE;

  let roll = state.rng() * WEIGHT_TOTAL;
  for (const [type, weight] of WEIGHTS) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return FOOD.APPLE;
}

function refillFoods(state) {
  while (state.foods.length < FOOD_COUNT) {
    const cell = freeCell(state);
    if (!cell) return;
    state.foods.push({ ...cell, type: pickType(state) });
  }
}

export function createGame({ seed = randomSeed(), mode = "classic" } = {}) {
  const midY = Math.floor(ROWS / 2);
  const snake = [];
  for (let i = 0; i < START_LENGTH; i++) {
    snake.push({ x: 2 + START_LENGTH - 1 - i, y: midY });
  }

  const state = {
    mode,
    seed,
    rng: makeRng(seed),
    snake,
    prevSnake: snake.map((p) => ({ ...p })),
    dir: { x: 1, y: 0 },
    queue: [],
    foods: [],
    score: 0,
    combo: 0,
    comboLeft: 0,
    bestCombo: 0,
    voltLeft: 0,
    wrapLeft: 0,
    alive: true,
    deathCell: null,
    acc: 0,
    elapsed: 0,
    steps: 0,
    eaten: {
      [FOOD.APPLE]: 0,
      [FOOD.VOLT]: 0,
      [FOOD.PEPPER]: 0,
      [FOOD.BONE]: 0,
    },
  };

  refillFoods(state);
  return state;
}

export function queueDir(state, x, y) {
  if (!state.alive) return false;
  if (state.queue.length >= QUEUE_MAX) return false;

  const last = state.queue[state.queue.length - 1] || state.dir;
  if (last.x === x && last.y === y) return false; // already heading there
  if (last.x === -x && last.y === -y) return false; // no 180° turns

  state.queue.push({ x, y });
  return true;
}

function kill(state, events, cause, cell) {
  state.alive = false;
  state.deathCell = cell;
  state.queue.length = 0;
  events.push({ type: "die", cause, cell });
  return events;
}

function applyFood(state, food, events) {
  let gain = SCORE[food.type];
  let mult = 1;

  if (food.type === FOOD.BONE) {
    for (let i = 0; i < BONE_SHRINK && state.snake.length > MIN_LENGTH; i++) {
      state.snake.pop();
    }
    state.combo = 0;
    state.comboLeft = 0;
  } else {
    state.combo = state.comboLeft > 0 ? state.combo + 1 : 1;
    state.comboLeft = COMBO_WINDOW;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    mult = comboMult(state.combo);
    gain *= mult;
    if (food.type === FOOD.VOLT) state.voltLeft = VOLT_TIME;
    if (food.type === FOOD.PEPPER) state.wrapLeft = WRAP_TIME;
  }

  state.score += gain;
  state.eaten[food.type] += 1;
  events.push({ type: "eat", food, gain, mult, combo: state.combo });
}

export function stepOnce(state) {
  const events = [];
  if (!state.alive) return events;

  state.prevSnake = state.snake.map((p) => ({ ...p }));
  if (state.queue.length) state.dir = state.queue.shift();

  const head = state.snake[0];
  let nx = head.x + state.dir.x;
  let ny = head.y + state.dir.y;

  if (state.wrapLeft > 0) {
    nx = (nx + COLS) % COLS;
    ny = (ny + ROWS) % ROWS;
  } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
    return kill(state, events, "wall", { x: nx, y: ny });
  }

  const foodIndex = state.foods.findIndex((f) => f.x === nx && f.y === ny);
  const eating = foodIndex >= 0;
  const growing = eating && state.foods[foodIndex].type !== FOOD.BONE;

  // The tail cell frees up on this very step unless we are growing into it,
  // so chasing your own tail is a legal move — not a death.
  const solid = growing ? state.snake.length : state.snake.length - 1;
  for (let i = 0; i < solid; i++) {
    const seg = state.snake[i];
    if (seg.x === nx && seg.y === ny) {
      return kill(state, events, "self", { x: nx, y: ny });
    }
  }

  state.snake.unshift({ x: nx, y: ny });
  state.steps += 1;

  if (eating) {
    const [food] = state.foods.splice(foodIndex, 1);
    if (!growing) state.snake.pop();
    applyFood(state, food, events);
    refillFoods(state);
  } else {
    state.snake.pop();
  }

  return events;
}

export function tick(state, dt) {
  const events = [];
  if (!state.alive) return events;

  const d = Math.min(dt, MAX_DT);
  state.elapsed += d;
  state.voltLeft = Math.max(0, state.voltLeft - d);
  state.wrapLeft = Math.max(0, state.wrapLeft - d);

  if (state.comboLeft > 0) {
    state.comboLeft = Math.max(0, state.comboLeft - d);
    if (state.comboLeft === 0 && state.combo > 0) {
      events.push({ type: "comboLost", combo: state.combo });
      state.combo = 0;
    }
  }

  state.acc += d;
  const interval = stepInterval(state);
  // Came back from a stall: resync instead of replaying the missed steps.
  if (state.acc > interval * 2) state.acc = interval;

  let guard = QUEUE_MAX;
  while (state.alive && guard-- > 0 && state.acc >= stepInterval(state)) {
    state.acc -= stepInterval(state);
    events.push(...stepOnce(state));
  }

  return events;
}

/** 0..1 progress towards the next grid step, for smooth rendering. */
export function stepProgress(state) {
  if (!state.alive) return 1;
  return Math.min(1, state.acc / stepInterval(state));
}
