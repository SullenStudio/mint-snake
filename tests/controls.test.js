import { describe, expect, test } from "vitest";
import { PAD, PAD_BUTTONS, hitPad } from "../src/ui/controls.js";

function button(name) {
  return PAD_BUTTONS.find((b) => b.name === name);
}

function centre(name) {
  const b = button(name);
  return [b.x + PAD.size / 2, b.y + PAD.size / 2];
}

describe("pad layout", () => {
  test("has exactly the four directions", () => {
    expect(PAD_BUTTONS.map((b) => b.name).sort()).toEqual([
      "down",
      "left",
      "right",
      "up",
    ]);
  });

  test("carries a unit direction vector per button", () => {
    const dirs = Object.fromEntries(PAD_BUTTONS.map((b) => [b.name, b.dir]));
    expect(dirs.up).toEqual({ x: 0, y: -1 });
    expect(dirs.down).toEqual({ x: 0, y: 1 });
    expect(dirs.left).toEqual({ x: -1, y: 0 });
    expect(dirs.right).toEqual({ x: 1, y: 0 });
  });

  test("is a symmetric cross about its centre", () => {
    expect(centre("up")[0]).toBe(centre("down")[0]);
    expect(centre("up")[0]).toBe(PAD.cx);
    expect(PAD.cx - centre("left")[0]).toBe(centre("right")[0] - PAD.cx);
  });

  test("stacks up, the middle row, then down without overlapping", () => {
    expect(button("left").y).toBe(button("up").y + PAD.size + PAD.gap);
    expect(button("down").y).toBe(button("left").y + PAD.size + PAD.gap);
  });

  test("fits on screen, clear of the board and the bottom edge", () => {
    for (const b of PAD_BUTTONS) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + PAD.size).toBeLessThanOrEqual(540);
      expect(b.y + PAD.size).toBeLessThanOrEqual(960);
    }
  });

  test("gives each button a comfortable thumb target", () => {
    // 540 virtual px map to ~390pt on a phone, so 44pt needs ~61 virtual px.
    expect(PAD.size).toBeGreaterThanOrEqual(80);
  });
});

describe("hitPad", () => {
  test("finds each button at its centre", () => {
    for (const name of ["up", "down", "left", "right"]) {
      expect(hitPad(...centre(name))?.name).toBe(name);
    }
  });

  test("forgives a thumb landing just outside a button", () => {
    const up = button("up");
    expect(hitPad(up.x - PAD.slop + 1, up.y + PAD.size / 2)?.name).toBe("up");
    expect(hitPad(up.x + PAD.size / 2, up.y - PAD.slop + 1)?.name).toBe("up");
  });

  test("still misses well beyond the slop", () => {
    const up = button("up");
    expect(hitPad(up.x + PAD.size / 2, up.y - PAD.slop - 12)).toBeNull();
  });

  test("keeps a dead centre so the cross never guesses a direction", () => {
    const mid = button("left").y + PAD.size / 2;
    expect(hitPad(PAD.cx, mid)).toBeNull();
  });

  test("resolves the diagonal gap to one button, never to none", () => {
    const up = button("up");
    const corner = hitPad(up.x - 2, up.y + PAD.size + 2);
    expect(corner).not.toBeNull();
    expect(["up", "left"]).toContain(corner.name);
  });

  test("is deterministic for a repeated point", () => {
    const up = button("up");
    const p = [up.x - 2, up.y + PAD.size + 2];
    expect(hitPad(...p).name).toBe(hitPad(...p).name);
  });

  test("returns null above the pad, where the board is", () => {
    expect(hitPad(PAD.cx, PAD.top - 60)).toBeNull();
  });

  test("returns null off to the side of the pad", () => {
    expect(hitPad(6, button("left").y + PAD.size / 2)).toBeNull();
  });

  test("never picks a button whose rect the point is far from", () => {
    for (let y = PAD.top - 40; y < 960; y += 7) {
      for (let x = 0; x < 540; x += 7) {
        const hit = hitPad(x, y);
        if (!hit) continue;
        const dx = Math.max(hit.x - x, 0, x - (hit.x + PAD.size));
        const dy = Math.max(hit.y - y, 0, y - (hit.y + PAD.size));
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(PAD.slop);
      }
    }
  });
});
