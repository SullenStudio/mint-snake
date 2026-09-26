import { describe, expect, test } from "vitest";
import {
  BODY_HEAD,
  BODY_TAIL,
  DEFAULT_THEME,
  THEMES,
  bodyTint,
  glowLayers,
  resolveTheme,
} from "../src/ui/theme.js";

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

describe("themes", () => {
  test("ships five named palettes", () => {
    expect(Object.keys(THEMES)).toHaveLength(5);
    expect(Object.keys(THEMES)).toContain("mint");
  });

  test("mint is the default", () => {
    expect(DEFAULT_THEME).toBe("mint");
  });

  test("every palette defines the full set of colour slots", () => {
    const slots = Object.keys(THEMES[DEFAULT_THEME]);
    for (const [name, palette] of Object.entries(THEMES)) {
      expect(Object.keys(palette).sort(), name).toEqual(slots.sort());
    }
  });

  test("every colour is a valid rgb triple", () => {
    for (const [name, palette] of Object.entries(THEMES)) {
      for (const [slot, value] of Object.entries(palette)) {
        if (slot === "body") continue;
        expect(value, `${name}.${slot}`).toHaveLength(3);
        for (const channel of value) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  test("keeps the snack colours identical across palettes so they stay learnable", () => {
    const base = THEMES[DEFAULT_THEME];
    for (const palette of Object.values(THEMES)) {
      for (const slot of ["apple", "volt", "portal", "bone"]) {
        expect(palette[slot]).toEqual(base[slot]);
      }
    }
  });

  test("gives every palette a distinct accent", () => {
    const accents = Object.values(THEMES).map((p) => p.accent.join(","));
    expect(new Set(accents).size).toBe(accents.length);
  });

  test("keeps every background dark enough for neon to read", () => {
    for (const [name, palette] of Object.entries(THEMES)) {
      const brightness = Math.max(...palette.bg);
      expect(brightness, name).toBeLessThan(40);
    }
  });

  test("resolveTheme falls back to the default for an unknown name", () => {
    expect(resolveTheme("nope")).toBe(THEMES[DEFAULT_THEME]);
    expect(resolveTheme(null)).toBe(THEMES[DEFAULT_THEME]);
  });

  test("resolveTheme returns the named palette", () => {
    expect(resolveTheme("ice")).toBe(THEMES.ice);
  });
});

describe("bodyTint with a palette ramp", () => {
  test("uses the ramp it is given", () => {
    const ramp = { head: { r: 200, g: 100, b: 50 }, tail: { r: 0, g: 0, b: 0 } };
    expect(bodyTint(0, 5, ramp)).toEqual(ramp.head);
    expect(bodyTint(4, 5, ramp)).toEqual(ramp.tail);
  });

  test("each palette carries its own body ramp", () => {
    for (const [name, palette] of Object.entries(THEMES)) {
      expect(palette.body.head, name).toHaveLength(3);
      expect(palette.body.tail, name).toHaveLength(3);
    }
  });
});
