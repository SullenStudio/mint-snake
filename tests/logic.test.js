import { beforeEach, describe, expect, test } from "vitest";
import {
  COLS,
  COMBO_WINDOW,
  FOOD,
  FOOD_COUNT,
  MAX_MULT,
  MIN_LENGTH,
  ROWS,
  START_LENGTH,
  STEP_MIN,
  STEP_START,
  VOLT_TIME,
  WRAP_TIME,
  comboMult,
  createGame,
  queueDir,
  stepInterval,
  stepOnce,
  tick,
} from "../src/game/logic.js";

function game(seed = 1) {
  return createGame({ seed });
}

/** Board with no food, so movement tests are not perturbed by pickups. */
function bareGame(seed = 1) {
  const state = game(seed);
  state.foods = [];
  return state;
}

/** Puts `type` directly in front of the head and steps into it. */
function forceEat(state, type) {
  const head = state.snake[0];
  const cell = { x: head.x + state.dir.x, y: head.y + state.dir.y };
  state.foods = state.foods.filter((f) => f.x !== cell.x || f.y !== cell.y);
  state.foods.push({ ...cell, type });
  return stepOnce(state);
}

function cells(list) {
  return list.map((p) => `${p.x},${p.y}`);
}

/**
 * Runs the clock for `seconds`, parking the body mid-board between ticks so a
 * wall can never end a timer test early. Isolates tick()'s timer bookkeeping
 * from navigation.
 */
function drain(state, seconds, dt = 0.05) {
  const events = [];
  for (let i = 0; i < Math.ceil(seconds / dt); i++) {
    events.push(...tick(state, dt));
    state.snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    state.dir = { x: 1, y: 0 };
    state.foods = [];
  }
  return events;
}

describe("createGame", () => {
  test("starts with a snake of START_LENGTH heading right", () => {
    const state = game();
    expect(state.snake).toHaveLength(START_LENGTH);
    expect(state.dir).toEqual({ x: 1, y: 0 });
    expect(state.alive).toBe(true);
    expect(state.score).toBe(0);
  });

  test("fills the board with FOOD_COUNT snacks", () => {
    expect(game().foods).toHaveLength(FOOD_COUNT);
  });

  test("never places a snack on the snake", () => {
    for (let seed = 0; seed < 60; seed++) {
      const state = game(seed);
      const body = cells(state.snake);
      for (const food of state.foods) {
        expect(body).not.toContain(`${food.x},${food.y}`);
      }
    }
  });

  test("never stacks two snacks on one cell", () => {
    for (let seed = 0; seed < 60; seed++) {
      const spots = cells(game(seed).foods);
      expect(new Set(spots).size).toBe(spots.length);
    }
  });

  test("always offers at least one apple so the run can progress", () => {
    for (let seed = 0; seed < 100; seed++) {
      const types = game(seed).foods.map((f) => f.type);
      expect(types).toContain(FOOD.APPLE);
    }
  });

  test("keeps every snack inside the board", () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const food of game(seed).foods) {
        expect(food.x).toBeGreaterThanOrEqual(0);
        expect(food.x).toBeLessThan(COLS);
        expect(food.y).toBeGreaterThanOrEqual(0);
        expect(food.y).toBeLessThan(ROWS);
      }
    }
  });

  test("is deterministic for a given seed", () => {
    expect(game(777).foods).toEqual(game(777).foods);
  });

  test("lays out different boards for different seeds", () => {
    expect(game(1).foods).not.toEqual(game(2).foods);
  });
});

describe("movement", () => {
  test("advances the head by the current direction", () => {
    const state = bareGame();
    const head = { ...state.snake[0] };
    stepOnce(state);
    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y });
  });

  test("keeps the length when nothing is eaten", () => {
    const state = bareGame();
    stepOnce(state);
    expect(state.snake).toHaveLength(START_LENGTH);
  });

  test("records the pre-step body for interpolation", () => {
    const state = bareGame();
    const before = cells(state.snake);
    stepOnce(state);
    expect(cells(state.prevSnake)).toEqual(before);
  });
});

describe("collisions", () => {
  test("running off the board kills the snake", () => {
    const state = bareGame();
    state.snake = [
      { x: COLS - 1, y: 5 },
      { x: COLS - 2, y: 5 },
      { x: COLS - 3, y: 5 },
    ];
    const events = stepOnce(state);
    expect(state.alive).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "die", cause: "wall" }),
    );
  });

  test("biting its own body kills the snake", () => {
    const state = bareGame();
    // Head at (2,2), neck to the right, coil below: turning down hits (3,3)…
    state.snake = [
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ];
    state.dir = { x: 1, y: 0 };
    queueDir(state, 0, 1);
    const events = stepOnce(state);
    expect(state.alive).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "die", cause: "self" }),
    );
  });

  test("records the cell that killed it", () => {
    const state = bareGame();
    state.snake = [
      { x: COLS - 1, y: 5 },
      { x: COLS - 2, y: 5 },
      { x: COLS - 3, y: 5 },
    ];
    stepOnce(state);
    expect(state.deathCell).toEqual({ x: COLS, y: 5 });
  });

  test("moving into the vacating tail cell is legal", () => {
    const state = bareGame();
    // A closed hook: the tail sits exactly where the head is about to land.
    state.snake = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
    ];
    state.dir = { x: -1, y: 0 };
    queueDir(state, 0, 1);
    stepOnce(state);
    expect(state.alive).toBe(true);
    expect(state.snake[0]).toEqual({ x: 2, y: 3 });
  });

  test("landing on the tail cell while growing is fatal", () => {
    const state = bareGame();
    state.snake = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
    ];
    state.dir = { x: -1, y: 0 };
    state.foods = [{ x: 2, y: 3, type: FOOD.APPLE }];
    queueDir(state, 0, 1);
    stepOnce(state);
    expect(state.alive).toBe(false);
  });

  test("a dead snake stops stepping", () => {
    const state = bareGame();
    state.alive = false;
    const before = cells(state.snake);
    expect(stepOnce(state)).toEqual([]);
    expect(cells(state.snake)).toEqual(before);
  });
});

describe("direction queue", () => {
  test("applies a queued turn on the next step", () => {
    const state = bareGame();
    queueDir(state, 0, 1);
    stepOnce(state);
    expect(state.dir).toEqual({ x: 0, y: 1 });
  });

  test("applies two buffered turns across two steps", () => {
    const state = bareGame();
    queueDir(state, 0, -1);
    queueDir(state, -1, 0);
    stepOnce(state);
    expect(state.dir).toEqual({ x: 0, y: -1 });
    stepOnce(state);
    expect(state.dir).toEqual({ x: -1, y: 0 });
  });

  test("rejects reversing the current direction", () => {
    const state = bareGame();
    queueDir(state, -1, 0);
    expect(state.queue).toHaveLength(0);
  });

  test("rejects reversing the last queued direction", () => {
    const state = bareGame();
    queueDir(state, 0, -1);
    queueDir(state, 0, 1);
    expect(state.queue).toEqual([{ x: 0, y: -1 }]);
  });

  test("ignores a repeat of the pending direction", () => {
    const state = bareGame();
    queueDir(state, 0, 1);
    queueDir(state, 0, 1);
    expect(state.queue).toHaveLength(1);
  });

  test("holds at most two pending turns", () => {
    const state = bareGame();
    queueDir(state, 0, 1);
    queueDir(state, -1, 0);
    queueDir(state, 0, -1);
    expect(state.queue).toHaveLength(2);
  });

  test("ignores input once dead", () => {
    const state = bareGame();
    state.alive = false;
    queueDir(state, 0, 1);
    expect(state.queue).toHaveLength(0);
  });
});

describe("apple", () => {
  test("grows the snake", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    expect(state.snake).toHaveLength(START_LENGTH + 1);
  });

  test("scores 10", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    expect(state.score).toBe(10);
  });

  test("emits an eat event carrying the gain", () => {
    const state = bareGame();
    const events = forceEat(state, FOOD.APPLE);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "eat", gain: 10, mult: 1 }),
    );
  });
});

describe("volt", () => {
  test("scores 15", () => {
    const state = bareGame();
    forceEat(state, FOOD.VOLT);
    expect(state.score).toBe(15);
  });

  test("arms the boost timer", () => {
    const state = bareGame();
    forceEat(state, FOOD.VOLT);
    expect(state.voltLeft).toBe(VOLT_TIME);
  });

  test("speeds the snake up while active", () => {
    const state = bareGame();
    const base = stepInterval(state);
    forceEat(state, FOOD.VOLT);
    expect(stepInterval(state)).toBeLessThan(base);
  });

  test("wears off after VOLT_TIME", () => {
    const state = bareGame();
    forceEat(state, FOOD.VOLT);
    drain(state, VOLT_TIME + 0.5);
    expect(state.voltLeft).toBe(0);
  });
});

describe("portal", () => {
  test("arms the wrap timer", () => {
    const state = bareGame();
    forceEat(state, FOOD.PORTAL);
    expect(state.wrapLeft).toBe(WRAP_TIME);
  });

  test("carries the head through the wall while active", () => {
    const state = bareGame();
    state.snake = [
      { x: COLS - 1, y: 5 },
      { x: COLS - 2, y: 5 },
      { x: COLS - 3, y: 5 },
    ];
    state.wrapLeft = WRAP_TIME;
    stepOnce(state);
    expect(state.alive).toBe(true);
    expect(state.snake[0]).toEqual({ x: 0, y: 5 });
  });

  test("wraps vertically too", () => {
    const state = bareGame();
    state.snake = [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
    ];
    state.dir = { x: 0, y: -1 };
    state.wrapLeft = WRAP_TIME;
    stepOnce(state);
    expect(state.snake[0]).toEqual({ x: 5, y: ROWS - 1 });
  });

  test("stops protecting once it lapses", () => {
    const state = bareGame();
    state.snake = [
      { x: COLS - 1, y: 5 },
      { x: COLS - 2, y: 5 },
      { x: COLS - 3, y: 5 },
    ];
    state.wrapLeft = 0;
    stepOnce(state);
    expect(state.alive).toBe(false);
  });
});

describe("bone", () => {
  test("shrinks the snake by two segments", () => {
    const state = bareGame();
    state.snake = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
      { x: 1, y: 5 },
      { x: 0, y: 5 },
    ];
    const before = state.snake.length;
    forceEat(state, FOOD.BONE);
    expect(state.snake).toHaveLength(before - 2);
  });

  test("never shrinks below MIN_LENGTH", () => {
    const state = bareGame();
    expect(state.snake).toHaveLength(MIN_LENGTH);
    forceEat(state, FOOD.BONE);
    expect(state.snake).toHaveLength(MIN_LENGTH);
  });

  test("scores only 5", () => {
    const state = bareGame();
    forceEat(state, FOOD.BONE);
    expect(state.score).toBe(5);
  });

  test("breaks an active combo", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    expect(state.combo).toBe(2);
    forceEat(state, FOOD.BONE);
    expect(state.combo).toBe(0);
  });

  test("is never multiplied by the combo it just broke", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    const before = state.score;
    forceEat(state, FOOD.BONE);
    expect(state.score - before).toBe(5);
  });
});

describe("combo", () => {
  test("counts consecutive snacks", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    expect(state.combo).toBe(1);
    forceEat(state, FOOD.APPLE);
    expect(state.combo).toBe(2);
  });

  test("refreshes the window on each bite", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    tick(state, 0.1);
    forceEat(state, FOOD.APPLE);
    expect(state.comboLeft).toBe(COMBO_WINDOW);
  });

  test("resets when the window lapses", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    drain(state, COMBO_WINDOW + 0.5);
    expect(state.combo).toBe(0);
  });

  test("announces the lost combo once", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    const events = drain(state, COMBO_WINDOW + 1);
    expect(events.filter((e) => e.type === "comboLost")).toHaveLength(1);
  });

  test("multiplier steps up every third snack and caps out", () => {
    expect(comboMult(0)).toBe(1);
    expect(comboMult(2)).toBe(1);
    expect(comboMult(3)).toBe(2);
    expect(comboMult(5)).toBe(2);
    expect(comboMult(6)).toBe(3);
    expect(comboMult(9)).toBe(4);
    expect(comboMult(99)).toBe(MAX_MULT);
  });

  test("multiplies the score on the third snack", () => {
    const state = bareGame();
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    const before = state.score;
    forceEat(state, FOOD.APPLE);
    expect(state.score - before).toBe(20);
  });
});

describe("difficulty curve", () => {
  test("a fresh snake moves at STEP_START", () => {
    expect(stepInterval(bareGame())).toBeCloseTo(STEP_START, 5);
  });

  test("gets faster as the snake grows", () => {
    const state = bareGame();
    const slow = stepInterval(state);
    state.snake = Array.from({ length: 12 }, (_, i) => ({ x: i, y: 0 }));
    expect(stepInterval(state)).toBeLessThan(slow);
  });

  test("bottoms out at STEP_MIN", () => {
    const state = bareGame();
    state.snake = Array.from({ length: 200 }, (_, i) => ({ x: i, y: 0 }));
    expect(stepInterval(state)).toBe(STEP_MIN);
  });

  test("volt is faster than the base interval at any length", () => {
    const state = bareGame();
    state.snake = Array.from({ length: 200 }, (_, i) => ({ x: i, y: 0 }));
    const base = stepInterval(state);
    state.voltLeft = VOLT_TIME;
    expect(stepInterval(state)).toBeLessThan(base);
  });
});

describe("refill", () => {
  test("tops the board back up after a bite", () => {
    const state = game();
    const food = state.foods[0];
    state.snake = [
      { x: food.x - 1, y: food.y },
      { x: food.x - 2, y: food.y },
      { x: food.x - 3, y: food.y },
    ];
    state.dir = { x: 1, y: 0 };
    stepOnce(state);
    expect(state.foods).toHaveLength(FOOD_COUNT);
  });

  test("keeps an apple available after the apple is eaten", () => {
    const state = bareGame();
    state.foods = [
      { x: 10, y: 1, type: FOOD.BONE },
      { x: 11, y: 1, type: FOOD.BONE },
    ];
    forceEat(state, FOOD.APPLE);
    expect(state.foods.map((f) => f.type)).toContain(FOOD.APPLE);
  });

  test("never refills onto the snake", () => {
    const state = game(5);
    for (let i = 0; i < 40; i++) {
      const body = cells(state.snake);
      for (const food of state.foods) {
        expect(body).not.toContain(`${food.x},${food.y}`);
      }
      state.snake = [
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 },
      ];
      state.dir = { x: 1, y: 0 };
      forceEat(state, FOOD.APPLE);
    }
  });
});

describe("tick", () => {
  test("holds position until a full interval has passed", () => {
    const state = bareGame();
    const head = { ...state.snake[0] };
    tick(state, stepInterval(state) / 2);
    expect(state.snake[0]).toEqual(head);
  });

  test("steps once a full interval has passed", () => {
    const state = bareGame();
    const head = { ...state.snake[0] };
    tick(state, stepInterval(state));
    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y });
  });

  test("keeps the leftover time so stepping does not drift", () => {
    const state = bareGame();
    const interval = stepInterval(state);
    tick(state, interval * 1.5);
    expect(state.acc).toBeCloseTo(interval * 0.5, 5);
  });

  test("does not fast-forward after a long stall", () => {
    const state = bareGame();
    const head = { ...state.snake[0] };
    tick(state, 30);
    expect(state.alive).toBe(true);
    expect(state.snake[0].x - head.x).toBeLessThanOrEqual(1);
  });

  test("does nothing once dead", () => {
    const state = bareGame();
    state.alive = false;
    const before = cells(state.snake);
    expect(tick(state, 1)).toEqual([]);
    expect(cells(state.snake)).toEqual(before);
  });

  test("tracks elapsed run time", () => {
    const state = bareGame();
    tick(state, 0.1);
    tick(state, 0.1);
    expect(state.elapsed).toBeCloseTo(0.2, 5);
  });
});

describe("run stats", () => {
  let state;

  beforeEach(() => {
    state = bareGame();
  });

  test("counts each snack type eaten", () => {
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.VOLT);
    expect(state.eaten[FOOD.APPLE]).toBe(2);
    expect(state.eaten[FOOD.VOLT]).toBe(1);
    expect(state.eaten[FOOD.BONE]).toBe(0);
  });

  test("remembers the best combo of the run", () => {
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.APPLE);
    forceEat(state, FOOD.BONE);
    expect(state.bestCombo).toBe(3);
  });
});
