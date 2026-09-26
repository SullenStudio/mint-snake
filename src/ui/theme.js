// Palette and neon primitives. Nothing here imports kaplay: the pure colour
// maths is testable, and the drawing helpers take the kaplay handle as an
// argument so they stay honest about what they touch.

export const PALETTE = {
  bg: [5, 7, 6],
  ink: [238, 245, 242],
  mute: [124, 142, 136],
  faint: [58, 74, 68],

  mint: [16, 220, 140],
  mintHi: [124, 255, 198],
  mintDim: [8, 140, 92],
  mintDeep: [4, 70, 48],

  panel: [13, 19, 17],
  panelHi: [20, 30, 27],
  line: [34, 58, 50],

  apple: [255, 86, 108],
  volt: [255, 214, 54],
  pepper: [255, 140, 40],
  bone: [232, 240, 243],
  leaf: [120, 230, 160],
  danger: [255, 68, 68],
};

// Ends of the snake body ramp: bright at the head, near-dead at the tail.
export const BODY_HEAD = { r: 124, g: 255, b: 198 };
export const BODY_TAIL = { r: 6, g: 92, b: 62 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Colour for body segment `index` of a snake `length` long, ramping from
 * BODY_HEAD to BODY_TAIL so the snake reads as one glowing trail rather than a
 * row of separate tiles.
 */
export function bodyTint(index, length) {
  if (length <= 1) return { ...BODY_HEAD };
  const t = clamp(index, 0, length - 1) / (length - 1);
  return {
    r: Math.round(BODY_HEAD.r + (BODY_TAIL.r - BODY_HEAD.r) * t),
    g: Math.round(BODY_HEAD.g + (BODY_TAIL.g - BODY_HEAD.g) * t),
    b: Math.round(BODY_HEAD.b + (BODY_TAIL.b - BODY_HEAD.b) * t),
  };
}

const GLOW = [
  { spread: 0.5, opacity: 0.3 },
  { spread: 1.1, opacity: 0.15 },
  { spread: 2.0, opacity: 0.06 },
];

/**
 * Halo size for a rectangle. Without a cap, a full-width button would spread a
 * 40px bloom across half the screen; neon wants a tight rim, not fog.
 */
const RECT_GLOW_BASIS = 10;

/**
 * Concentric halo layers for a shape of the given radius. kaplay has no blur,
 * so a glow is just a few larger translucent copies underneath the shape.
 */
export function glowLayers(radius, intensity = 1) {
  if (intensity <= 0) return [];
  return GLOW.map((layer) => ({
    spread: layer.spread * radius,
    opacity: layer.opacity * intensity,
  }));
}

/** Builds the kaplay-flavoured half of the theme once the handle exists. */
export function createTheme(k) {
  const C = Object.fromEntries(
    Object.entries(PALETTE).map(([name, [r, g, b]]) => [name, k.rgb(r, g, b)]),
  );

  const tint = ({ r, g, b }) => k.rgb(r, g, b);

  /** Rounded rect with a halo behind it. */
  function glowRect({
    pos,
    width,
    height,
    radius = 0,
    color,
    glow = color,
    intensity = 1,
    opacity = 1,
    outline = null,
    fill = true,
  }) {
    const basis = Math.min(RECT_GLOW_BASIS, Math.min(width, height) * 0.3);
    for (const layer of glowLayers(basis, intensity)) {
      k.drawRect({
        pos: pos.sub(layer.spread, layer.spread),
        width: width + layer.spread * 2,
        height: height + layer.spread * 2,
        radius: radius + layer.spread,
        color: glow,
        opacity: layer.opacity * opacity,
      });
    }
    if (fill) {
      k.drawRect({ pos, width, height, radius, color, opacity });
    }
    if (outline) {
      k.drawRect({ pos, width, height, radius, fill: false, opacity, outline });
    }
  }

  function glowCircle({
    pos,
    radius,
    color,
    glow = color,
    intensity = 1,
    opacity = 1,
  }) {
    for (const layer of glowLayers(radius, intensity)) {
      k.drawCircle({
        pos,
        radius: radius + layer.spread,
        color: glow,
        opacity: layer.opacity * opacity,
      });
    }
    k.drawCircle({ pos, radius, color, opacity });
  }

  function glowPoly({ pts, pos, color, glow = color, intensity = 1, scale = 1 }) {
    for (const layer of glowLayers(6 * scale, intensity)) {
      const grow = 1 + layer.spread / (10 * scale);
      k.drawPolygon({
        pts: pts.map((v) => v.scale(scale * grow)),
        pos,
        color: glow,
        opacity: layer.opacity,
      });
    }
    k.drawPolygon({ pts: pts.map((v) => v.scale(scale)), pos, color });
  }

  /** Text with a soft halo — used for the score and headings. */
  function glowText({
    text,
    size,
    pos,
    color,
    glow = color,
    anchor = "topleft",
    intensity = 1,
    font,
    opacity = 1,
    width,
  }) {
    const base = { text, size, font, anchor, width };
    for (const layer of glowLayers(size * 0.06, intensity)) {
      k.drawText({
        ...base,
        pos,
        color: glow,
        opacity: layer.opacity * 0.9 * opacity,
      });
    }
    k.drawText({ ...base, pos, color, opacity });
  }

  /**
   * The recessed card used behind legends and stats. Built from two flat
   * layers rather than kaplay's `gradient`, which tints from the fill colour
   * and washes a dark panel out to white.
   */
  function panel({ pos, width, height, radius = 22, accent = null }) {
    k.drawRect({
      pos,
      width,
      height,
      radius,
      color: C.panel,
      outline: { width: 2, color: accent ?? C.line },
    });
  }

  return { C, tint, glowRect, glowCircle, glowPoly, glowText, panel };
}
