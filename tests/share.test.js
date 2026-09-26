import { describe, expect, test } from "vitest";
import { FOOD } from "../src/game/logic.js";
import { shareText } from "../src/game/share.js";

function run(overrides = {}) {
  return {
    mode: "classic",
    score: 240,
    bestCombo: 4,
    eaten: { [FOOD.APPLE]: 12, [FOOD.VOLT]: 3, [FOOD.PORTAL]: 0, [FOOD.BONE]: 1 },
    ...overrides,
  };
}

describe("shareText", () => {
  test("leads with the score", () => {
    expect(shareText(run())).toContain("240");
  });

  test("tallies the snacks that were eaten", () => {
    const text = shareText(run());
    expect(text).toContain("🍎12");
    expect(text).toContain("⚡3");
    expect(text).toContain("🦴1");
  });

  test("omits snacks that were never eaten", () => {
    expect(shareText(run())).not.toContain("🌀");
  });

  test("reports the best combo multiplier", () => {
    expect(shareText(run({ bestCombo: 6 }))).toContain("x3");
  });

  test("omits the multiplier when no combo was built", () => {
    expect(shareText(run({ bestCombo: 1 }))).not.toContain("x1");
  });

  test("names the day for a daily run", () => {
    expect(shareText(run({ mode: "daily" }), { day: 269 })).toContain("day #269");
  });

  test("leaves the day out of a classic run", () => {
    expect(shareText(run())).not.toContain("day #");
  });

  test("flags a new personal record", () => {
    expect(shareText(run(), { isRecord: true })).toContain("NEW BEST");
  });

  test("stays quiet about records on an ordinary run", () => {
    expect(shareText(run(), { isRecord: false })).not.toContain("NEW BEST");
  });

  test("appends the play link when one is given", () => {
    const text = shareText(run(), { url: "https://example.com/snake" });
    expect(text).toContain("https://example.com/snake");
  });

  test("is a single trimmed block with no blank padding", () => {
    const text = shareText(run(), { url: "https://example.com/snake" });
    expect(text).toBe(text.trim());
    expect(text).not.toContain("  ");
  });
});
