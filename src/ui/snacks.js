import {
  BONE_SHRINK,
  FOOD,
  SCORE,
  VOLT_TIME,
  WRAP_TIME,
} from "../game/logic.js";

/**
 * Shape carries the meaning here, not just colour — testers could not tell the
 * old orange triangle from a carrot, and no vegetable suggests "walk through
 * walls". A portal ring says what it does before anyone reads the legend.
 */
export const SNACK = {
  [FOOD.APPLE]: {
    key: "apple",
    name: "APPLE",
    hint: "grow by 1",
    detail: "Your snake gets one segment longer. The bread and butter.",
  },
  [FOOD.VOLT]: {
    key: "volt",
    name: "VOLT",
    hint: `speed rush, ${VOLT_TIME}s`,
    detail: `Grows you, then everything moves faster for ${VOLT_TIME} seconds. Worth more points — and much easier to crash.`,
  },
  [FOOD.PORTAL]: {
    key: "portal",
    name: "PORTAL",
    hint: `walls stop existing, ${WRAP_TIME}s`,
    detail: `Grows you, and for ${WRAP_TIME} seconds the walls stop existing: run off one edge and come back on the opposite one.`,
  },
  [FOOD.BONE]: {
    key: "bone",
    name: "BONE",
    hint: `lose ${BONE_SHRINK}, chain breaks`,
    detail: `The one to dodge. Cuts ${BONE_SHRINK} segments off your tail and resets your chain to zero.`,
  },
};

for (const [type, meta] of Object.entries(SNACK)) {
  meta.points = SCORE[type];
}

export const SNACK_ORDER = [FOOD.APPLE, FOOD.VOLT, FOOD.PORTAL, FOOD.BONE];

const BOLT = [
  [2, -10],
  [-6, 1],
  [-1, 1],
  [-3, 10],
  [6, -2],
  [1, -2],
];

export function snackColor(theme, type) {
  return theme.C[SNACK[type].key];
}

export function drawSnack(k, theme, type, at, { scale = 1, intensity = 1 } = {}) {
  const { C, glowCircle, glowPoly, glowRect } = theme;
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
    glowPoly({ pts: BOLT.map(([x, y]) => k.vec2(x, y)), pos: at, color, intensity, scale });
    return;
  }

  if (type === FOOD.PORTAL) {
    // Two concentric rings with nothing in the middle: a hole you pass through.
    glowCircle({
      pos: at,
      radius: 9 * scale,
      color,
      intensity,
      fill: false,
      outline: { width: 2.5 * scale, color },
    });
    k.drawCircle({
      pos: at,
      radius: 4.5 * scale,
      fill: false,
      outline: { width: 2 * scale, color },
    });
    return;
  }

  // Bone: a bar with knuckles, readable even at one cell wide.
  glowRect({
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
