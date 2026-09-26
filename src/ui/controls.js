// The on-screen direction pad: geometry and hit testing are pure so they can
// be tested; drawing takes the theme as an argument.

export const PAD = {
  size: 84,
  gap: 12,
  top: 660,
  cx: 270,
  // Thumbs miss. Accepting a press this far outside a button turns "I tapped
  // and nothing happened" into a hit, without making the cross guess.
  slop: 10,
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
      [0, -15],
      [17, 10],
      [-17, 10],
    ],
  },
  {
    name: "left",
    dir: { x: -1, y: 0 },
    x: PAD.cx - half - PAD.gap - PAD.size,
    y: midY,
    glyph: [
      [-15, 0],
      [10, -17],
      [10, 17],
    ],
  },
  {
    name: "right",
    dir: { x: 1, y: 0 },
    x: PAD.cx + half + PAD.gap,
    y: midY,
    glyph: [
      [15, 0],
      [-10, -17],
      [-10, 17],
    ],
  },
  {
    name: "down",
    dir: { x: 0, y: 1 },
    x: PAD.cx - half,
    y: midY + PAD.size + PAD.gap,
    glyph: [
      [0, 15],
      [17, -10],
      [-17, -10],
    ],
  },
];

/**
 * The button nearest a screen point, provided the point is inside it or within
 * `PAD.slop` of it. Returns null in the dead centre of the cross and anywhere
 * off the pad, so a stray touch never invents a turn.
 */
export function hitPad(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const b of PAD_BUTTONS) {
    const dx = Math.max(b.x - x, 0, x - (b.x + PAD.size));
    const dy = Math.max(b.y - y, 0, y - (b.y + PAD.size));
    const dist = Math.hypot(dx, dy);
    if (dist <= PAD.slop && dist < bestDist) {
      best = b;
      bestDist = dist;
    }
  }
  return best;
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
      color: isPressed ? C.accent : C.panel,
      glow: C.accent,
      intensity: isPressed ? 1.15 : isFacing ? 0.4 : 0.12,
      outline: {
        width: 2,
        color: isPressed ? C.accentHi : isFacing ? C.accent : C.line,
      },
    });

    glowPoly({
      pts: b.glyph.map(([gx, gy]) => k.vec2(gx, gy)),
      pos: k.vec2(b.x + half, b.y + half),
      color: isPressed ? C.bg : isFacing ? C.accentHi : C.accent,
      glow: C.accentHi,
      intensity: isPressed ? 0 : 0.5,
      scale: isPressed ? 0.92 : 1,
    });
  }
}
