import { describe, expect, test } from "vitest";
import { PAD, PAD_BUTTONS, hitPad } from "../src/ui/controls.js";

/** Centre point of a named button. */
function centre(name) {
  const b = PAD_BUTTONS.find((btn) => btn.name === name);
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
    const [ux] = centre("up");
    const [dx] = centre("down");
    const [lx] = centre("left");
    const [rx] = centre("right");
    expect(ux).toBe(dx);
    expect(ux).toBe(PAD.cx);
    expect(PAD.cx - lx).toBe(rx - PAD.cx);
  });

  test("stacks up, the middle row, then down without overlapping", () => {
    const up = PAD_BUTTONS.find((b) => b.name === "up");
    const left = PAD_BUTTONS.find((b) => b.name === "left");
    const down = PAD_BUTTONS.find((b) => b.name === "down");
    expect(left.y).toBe(up.y + PAD.size + PAD.gap);
    expect(down.y).toBe(left.y + PAD.size + PAD.gap);
  });

  test("fits on screen above the bottom edge", () => {
    for (const b of PAD_BUTTONS) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y + PAD.size).toBeLessThanOrEqual(960);
      expect(b.x + PAD.size).toBeLessThanOrEqual(540);
    }
  });
});

describe("hitPad", () => {
  test("finds each button at its centre", () => {
    for (const name of ["up", "down", "left", "right"]) {
      expect(hitPad(...centre(name))?.name).toBe(name);
    }
  });

  test("returns null in the hole at the centre of the cross", () => {
    expect(hitPad(PAD.cx, PAD.top + PAD.size + PAD.gap / 2)).toBeNull();
  });

  test("returns null in the diagonal corners between buttons", () => {
    const left = PAD_BUTTONS.find((b) => b.name === "left");
    // Just above the left button, beside the up button.
    expect(hitPad(left.x + 4, left.y - PAD.gap / 2)).toBeNull();
  });

  test("returns null above the pad, where the board is", () => {
    expect(hitPad(PAD.cx, PAD.top - 20)).toBeNull();
  });

  test("returns null off to the side of the pad", () => {
    expect(hitPad(10, PAD.top + PAD.size + PAD.gap + PAD.size / 2)).toBeNull();
  });

  test("includes the top-left corner of a button but not the far edges", () => {
    const up = PAD_BUTTONS.find((b) => b.name === "up");
    expect(hitPad(up.x, up.y)?.name).toBe("up");
    expect(hitPad(up.x + PAD.size, up.y)).toBeNull();
    expect(hitPad(up.x, up.y + PAD.size)).toBeNull();
  });

  test("never reports two buttons for one point", () => {
    for (let y = PAD.top - 20; y < 960; y += 3) {
      for (let x = 0; x < 540; x += 3) {
        const matches = PAD_BUTTONS.filter(
          (b) =>
            x >= b.x && x < b.x + PAD.size && y >= b.y && y < b.y + PAD.size,
        );
        expect(matches.length).toBeLessThanOrEqual(1);
      }
    }
  });
});
