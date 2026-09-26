import { FOOD, comboMult } from "./logic.js";

const EMOJI = {
  [FOOD.APPLE]: "🍎",
  [FOOD.VOLT]: "⚡",
  [FOOD.PORTAL]: "🌀",
  [FOOD.BONE]: "🦴",
};

const ORDER = [FOOD.APPLE, FOOD.VOLT, FOOD.PORTAL, FOOD.BONE];

/** One-line brag for the clipboard / Web Share sheet. */
export function shareText(run, { day = null, isRecord = false, url = "" } = {}) {
  const parts = [`Mint Snake 🐍 ${run.score}`];

  if (run.mode === "daily" && day !== null) parts.push(`day #${day}`);

  const tally = ORDER.filter((type) => run.eaten[type] > 0)
    .map((type) => `${EMOJI[type]}${run.eaten[type]}`)
    .join(" ");
  if (tally) parts.push(tally);

  const mult = comboMult(run.bestCombo);
  if (mult > 1) parts.push(`combo x${mult}`);

  if (isRecord) parts.push("NEW BEST");

  const line = parts.join(" · ");
  return url ? `${line}\n${url}` : line;
}
