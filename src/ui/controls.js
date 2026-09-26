// The on-screen direction pad: geometry and hit testing are pure so they can
// be tested; drawing takes the theme as an argument.

export const PAD = {
  size: 72,
  gap: 10,
  top: 708,
  cx: 270,
};

const half = PAD.size / 2;
const midY = PAD.top + PAD.size + PAD.gap;

export const PAD_BUTTONS = [
  {
    name: "up",
    dir: { x: 0, y: -1 },
    x: PAD.cx - half,
    y: PAD.top,
    glyph: [
      [0, -13],
      [15, 9],
      [-15, 9],
    ],
  },
  {
    name: "left",
    dir: { x: -1, y: 0 },
    x: PAD.cx - half - PAD.gap - PAD.size,
    y: midY,
    glyph: [
      [-13, 0],
      [9, -15],
      [9, 15],
    ],
  },
  {
    name: "right",
    dir: { x: 1, y: 0 },
    x: PAD.cx + half + PAD.gap,
    y: midY,
    glyph: [
      [13, 0],
      [-9, -15],
      [-9, 15],
    ],
  },
  {
    name: "down",
    dir: { x: 0, y: 1 },
    x: PAD.cx - half,
    y: midY + PAD.size + PAD.gap,
    glyph: [
      [0, 13],
      [15, -9],
      [-15, -9],
    ],
  },
];

/** The button under a screen point, or null for the gaps and everywhere else. */
export function hitPad(x, y) {
  for (const b of PAD_BUTTONS) {
    if (x >= b.x && x < b.x + PAD.size && y >= b.y && y < b.y + PAD.size) {
      return b;
    }
  }
  return null;
}

/**
 * Draws the pad. `pressed` is the name of the button being held, `facing` the
 * direction the snake is actually travelling.
 */
export function drawPad(k, theme, { pressed, facing }) {
  const { C, glowRect, glowPoly } = theme;

  for (const b of PAD_BUTTONS) {
    const isPressed = pressed === b.name;
    const isFacing = facing && facing.x === b.dir.x && facing.y === b.dir.y;

    // Pressing shrinks the button slightly — a cheap, readable tap response.
    const inset = isPressed ? 3 : 0;
    const pos = k.vec2(b.x + inset, b.y + inset);
    const size = PAD.size - inset * 2;

    glowRect({
      pos,
      width: size,
      height: size,
      radius: 22,
      color: isPressed ? C.mint : C.panel,
      glow: C.mint,
      intensity: isPressed ? 1.15 : isFacing ? 0.4 : 0.12,
      outline: {
        width: 2,
        color: isPressed ? C.mintHi : isFacing ? C.mint : C.line,
      },
    });

    glowPoly({
      pts: b.glyph.map(([gx, gy]) => k.vec2(gx, gy)),
      pos: k.vec2(b.x + half, b.y + half),
      color: isPressed ? C.bg : isFacing ? C.mintHi : C.mint,
      glow: C.mintHi,
      intensity: isPressed ? 0 : 0.5,
      scale: isPressed ? 0.92 : 1,
    });
  }
}
