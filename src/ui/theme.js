// Palettes and neon primitives. Nothing here imports kaplay: the colour maths
// is pure and testable, and the drawing helpers take the kaplay handle as an
// argument so they stay honest about what they touch.

// Slots shared by every palette. Snack colours in particular never change —
// players learn "red circle = apple" once, and a theme must not relearn it.
const SHARED = {
  ink: [238, 245, 242],
  mute: [124, 142, 136],
  faint: [58, 74, 68],

  apple: [255, 86, 108],
  volt: [255, 214, 54],
  portal: [150, 120, 255],
  bone: [232, 240, 243],
  leaf: [120, 230, 160],
  danger: [255, 68, 68],
};

const palette = (p) => ({ ...SHARED, ...p });

export const THEMES = {
  mint: palette({
    accent: [16, 220, 140],
    accentHi: [124, 255, 198],
    accentDim: [8, 140, 92],
    accentDeep: [4, 70, 48],
    bg: [5, 7, 6],
    panel: [13, 19, 17],
    panelHi: [20, 30, 27],
    line: [34, 58, 50],
    body: { head: [124, 255, 198], tail: [6, 92, 62] },
  }),
  ice: palette({
    accent: [76, 201, 255],
    accentHi: [172, 233, 255],
    accentDim: [30, 120, 176],
    accentDeep: [10, 56, 88],
    bg: [5, 7, 11],
    panel: [12, 17, 24],
    panelHi: [18, 26, 36],
    line: [32, 52, 72],
    body: { head: [172, 233, 255], tail: [12, 68, 104] },
  }),
  amber: palette({
    accent: [255, 176, 32],
    accentHi: [255, 216, 142],
    accentDim: [176, 112, 12],
    accentDeep: [78, 48, 6],
    bg: [10, 7, 4],
    panel: [22, 16, 10],
    panelHi: [30, 22, 14],
    line: [64, 46, 24],
    body: { head: [255, 216, 142], tail: [98, 58, 8] },
  }),
  magenta: palette({
    accent: [255, 79, 216],
    accentHi: [255, 170, 236],
    accentDim: [172, 38, 142],
    accentDeep: [80, 12, 66],
    bg: [9, 5, 10],
    panel: [20, 12, 22],
    panelHi: [28, 18, 30],
    line: [62, 32, 60],
    body: { head: [255, 170, 236], tail: [98, 20, 82] },
  }),
  toxic: palette({
    accent: [182, 255, 60],
    accentHi: [218, 255, 152],
    accentDim: [120, 172, 26],
    accentDeep: [56, 82, 8],
    bg: [6, 8, 4],
    panel: [16, 20, 12],
    panelHi: [22, 28, 16],
    line: [46, 62, 26],
    body: { head: [218, 255, 152], tail: [70, 100, 12] },
  }),
};

export const DEFAULT_THEME = "mint";
export const THEME_NAMES = Object.keys(THEMES);

export function resolveTheme(name) {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
}

const toRgb = ([r, g, b]) => ({ r, g, b });

// Ends of the default snake ramp, kept exported for tests and fallbacks.
export const BODY_HEAD = toRgb(THEMES[DEFAULT_THEME].body.head);
export const BODY_TAIL = toRgb(THEMES[DEFAULT_THEME].body.tail);

const DEFAULT_RAMP = { head: BODY_HEAD, tail: BODY_TAIL };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Colour for body segment `index` of a snake `length` long, ramping head to
 * tail so the snake reads as one glowing trail rather than a row of tiles.
 */
export function bodyTint(index, length, ramp = DEFAULT_RAMP) {
  if (length <= 1) return { ...ramp.head };
  const t = clamp(index, 0, length - 1) / (length - 1);
  return {
    r: Math.round(ramp.head.r + (ramp.tail.r - ramp.head.r) * t),
    g: Math.round(ramp.head.g + (ramp.tail.g - ramp.head.g) * t),
    b: Math.round(ramp.head.b + (ramp.tail.b - ramp.head.b) * t),
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

/**
 * Builds the kaplay-flavoured half of the theme. `C` keeps its identity across
 * theme switches — scenes destructure it once at registration, so swapping the
 * object instead of its contents would leave them painting the old palette.
 */
export function createTheme(k, initial = DEFAULT_THEME) {
  const C = {};
  let current = DEFAULT_THEME;
  let ramp = DEFAULT_RAMP;

  function use(name) {
    current = THEMES[name] ? name : DEFAULT_THEME;
    const p = resolveTheme(current);
    for (const [slot, value] of Object.entries(p)) {
      if (slot === "body") continue;
      C[slot] = k.rgb(...value);
    }
    ramp = { head: toRgb(p.body.head), tail: toRgb(p.body.tail) };
  }

  use(initial);

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
    fill = true,
    outline = null,
  }) {
    for (const layer of glowLayers(radius, intensity)) {
      k.drawCircle({
        pos,
        radius: radius + layer.spread,
        color: glow,
        opacity: layer.opacity * opacity,
      });
    }
    if (fill) k.drawCircle({ pos, radius, color, opacity });
    if (outline) k.drawCircle({ pos, radius, fill: false, opacity, outline });
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
    letterSpacing,
  }) {
    const base = { text, size, font, anchor, width, letterSpacing };
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
   * The recessed card behind legends and stats. Two flat layers rather than
   * kaplay's `gradient`, which tints from the fill colour and washes a dark
   * panel out to white.
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

  return {
    C,
    use,
    name: () => current,
    ramp: () => ramp,
    tint,
    glowRect,
    glowCircle,
    glowPoly,
    glowText,
    panel,
  };
}
