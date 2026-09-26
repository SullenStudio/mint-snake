import { describe, expect, test } from "vitest";
import { dailySeed, dayNumber, makeRng, randomSeed } from "../src/game/rng.js";

describe("makeRng", () => {
  test("produces the same sequence for the same seed", () => {
    const a = makeRng(1234);
    const b = makeRng(1234);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  test("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  test("stays inside [0, 1)", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 2000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("int(n) returns integers in [0, n)", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(17);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(17);
    }
  });

  test("pick returns an element of the list", () => {
    const rng = makeRng(42);
    const list = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(list).toContain(rng.pick(list));
    }
  });
});

describe("dailySeed", () => {
  test("is stable within a UTC day", () => {
    const morning = new Date("2026-09-26T00:00:01Z");
    const evening = new Date("2026-09-26T23:59:59Z");
    expect(dailySeed(morning)).toBe(dailySeed(evening));
  });

  test("differs across days", () => {
    expect(dailySeed(new Date("2026-09-26T12:00:00Z"))).not.toBe(
      dailySeed(new Date("2026-09-27T12:00:00Z")),
    );
  });
});

describe("dayNumber", () => {
  test("counts days from the launch epoch starting at 1", () => {
    expect(dayNumber(new Date("2026-01-01T00:00:00Z"))).toBe(1);
    expect(dayNumber(new Date("2026-01-02T00:00:00Z"))).toBe(2);
  });

  test("advances by one per day", () => {
    const a = dayNumber(new Date("2026-09-26T05:00:00Z"));
    const b = dayNumber(new Date("2026-09-27T05:00:00Z"));
    expect(b - a).toBe(1);
  });
});

describe("randomSeed", () => {
  test("returns a 32-bit unsigned integer", () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
