import { describe, expect, test } from "vitest";
import { BODY_HEAD, BODY_TAIL, bodyTint, glowLayers } from "../src/ui/theme.js";

describe("bodyTint", () => {
  test("paints the head with the bright end of the ramp", () => {
    expect(bodyTint(0, 10)).toEqual(BODY_HEAD);
  });

  test("paints the last segment with the dark end of the ramp", () => {
    expect(bodyTint(9, 10)).toEqual(BODY_TAIL);
  });

  test("darkens monotonically from head to tail", () => {
    const greens = Array.from({ length: 12 }, (_, i) => bodyTint(i, 12).g);
    for (let i = 1; i < greens.length; i++) {
      expect(greens[i]).toBeLessThanOrEqual(greens[i - 1]);
    }
  });

  test("puts the middle segment between the two ends", () => {
    const mid = bodyTint(5, 11);
    expect(mid.g).toBeLessThan(BODY_HEAD.g);
    expect(mid.g).toBeGreaterThan(BODY_TAIL.g);
  });

  test("returns whole numbers a colour constructor can take", () => {
    const c = bodyTint(3, 9);
    for (const channel of [c.r, c.g, c.b]) {
      expect(Number.isInteger(channel)).toBe(true);
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  test("survives a one-segment snake without dividing by zero", () => {
    expect(bodyTint(0, 1)).toEqual(BODY_HEAD);
  });

  test("clamps an index past the tail", () => {
    expect(bodyTint(99, 10)).toEqual(BODY_TAIL);
  });

  test("clamps a negative index to the head", () => {
    expect(bodyTint(-3, 10)).toEqual(BODY_HEAD);
  });
});

describe("glowLayers", () => {
  test("spreads outward with falling opacity", () => {
    const layers = glowLayers(10, 1);
    expect(layers.length).toBeGreaterThan(1);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i].spread).toBeGreaterThan(layers[i - 1].spread);
      expect(layers[i].opacity).toBeLessThan(layers[i - 1].opacity);
    }
  });

  test("stays within a sane opacity range", () => {
    for (const layer of glowLayers(12, 1)) {
      expect(layer.opacity).toBeGreaterThan(0);
      expect(layer.opacity).toBeLessThan(1);
    }
  });

  test("scales opacity with the intensity argument", () => {
    const dim = glowLayers(10, 0.5);
    const bright = glowLayers(10, 1);
    dim.forEach((layer, i) => {
      expect(layer.opacity).toBeLessThan(bright[i].opacity);
    });
  });

  test("scales spread with the radius argument", () => {
    const small = glowLayers(4, 1);
    const big = glowLayers(20, 1);
    small.forEach((layer, i) => {
      expect(layer.spread).toBeLessThan(big[i].spread);
    });
  });

  test("goes quiet at zero intensity", () => {
    expect(glowLayers(10, 0)).toEqual([]);
  });
});
