import { COLS, ROWS } from "../game/logic.js";

export const W = 540;
export const H = 960;
export const MARGIN = 32;
export const CONTENT_W = W - MARGIN * 2;

export const CELL = 26;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;
export const OX = Math.round((W - BOARD_W) / 2);
export const OY = 116;
export const BOARD_BOTTOM = OY + BOARD_H;

export const FONT = "Outfit";

export function cellOrigin(k, x, y) {
  return k.vec2(OX + x * CELL, OY + y * CELL);
}

export function cellCenter(k, x, y) {
  return k.vec2(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2);
}

export function ease(t) {
  return t * t * (3 - 2 * t);
}
