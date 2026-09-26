import { FOOD, VOLT_TIME, WRAP_TIME } from "../game/logic.js";

/**
 * Shape carries the meaning here, not just colour — apple and pepper sit close
 * on the hue wheel, and some players cannot tell them apart at all.
 */
export const SNACK = {
  [FOOD.APPLE]: { key: "apple", name: "APPLE", hint: "grow  ·  10 pts" },
  [FOOD.VOLT]: { key: "volt", name: "VOLT", hint: `rush ${VOLT_TIME}s  ·  15 pts` },
  [FOOD.PEPPER]: {
    key: "pepper",
    name: "PEPPER",
    hint: `phase walls ${WRAP_TIME}s  ·  10 pts`,
  },
  [FOOD.BONE]: {
    key: "bone",
    name: "BONE",
    hint: "−2 length, breaks the chain",
  },
};

export const SNACK_ORDER = [FOOD.APPLE, FOOD.VOLT, FOOD.PEPPER, FOOD.BONE];

const BOLT = [
  [2, -10],
  [-6, 1],
  [-1, 1],
  [-3, 10],
  [6, -2],
  [1, -2],
];
const CHILI = [
  [0, 9],
  [-8, -6],
  [8, -6],
];

export function snackColor(theme, type) {
  return theme.C[SNACK[type].key];
}

export function drawSnack(k, theme, type, at, { scale = 1, intensity = 1 } = {}) {
  const { C, glowCircle, glowPoly } = theme;
  const color = snackColor(theme, type);
  const p = (x, y) => at.add(x * scale, y * scale);

  if (type === FOOD.APPLE) {
    glowCircle({ pos: at, radius: 8 * scale, color, intensity });
    k.drawRect({
      pos: p(-1.5, -12),
      width: 3 * scale,
      height: 6 * scale,
      radius: 1.5 * scale,
      color: C.leaf,
    });
    return;
  }

  if (type === FOOD.VOLT) {
    glowPoly({
      pts: BOLT.map(([x, y]) => k.vec2(x, y)),
      pos: at,
      color,
      intensity,
      scale,
    });
    return;
  }

  if (type === FOOD.PEPPER) {
    glowPoly({
      pts: CHILI.map(([x, y]) => k.vec2(x, y)),
      pos: at,
      color,
      intensity,
      scale,
    });
    k.drawRect({
      pos: p(-1.5, -11),
      width: 3 * scale,
      height: 5 * scale,
      radius: 1.5 * scale,
      color: C.leaf,
    });
    return;
  }

  // Bone: a bar with knuckles, readable even at one cell wide.
  theme.glowRect({
    pos: p(-7, -2.5),
    width: 14 * scale,
    height: 5 * scale,
    radius: 2.5 * scale,
    color,
    intensity: intensity * 0.7,
  });
  for (const dx of [-7, 7]) {
    for (const dy of [-4, 4]) {
      k.drawCircle({ pos: p(dx, dy), radius: 3.2 * scale, color });
    }
  }
}
