import { isMuted, resumeAudio, setMuted, sfx } from "../audio.js";
import { CONTENT_W, FONT, H, MARGIN, W } from "./layout.js";

const resolve = (v) => (typeof v === "function" ? v() : v);

/**
 * Shared chrome. A button is an invisible kaplay object (it needs `area()` for
 * clicks) plus a `paint()` the scene calls from its own onDraw, so glow layers
 * land in the right order relative to the rest of the frame.
 */
export function createWidgets(k, theme) {
  const { C } = theme;

  function button({
    x = MARGIN,
    y,
    w = CONTENT_W,
    h = 72,
    label,
    size = 20,
    fill = C.accent,
    ink = C.bg,
    outline = null,
    z = 1,
    enabled = null,
    onPress,
  }) {
    const box = k.add([
      k.rect(w, h, { radius: 22 }),
      k.pos(x, y),
      k.area(),
      k.z(z),
      k.opacity(0),
    ]);
    box.onClick(() => {
      if (enabled && !enabled()) return;
      resumeAudio();
      sfx.ui();
      onPress();
    });

    function paint() {
      const lit = box.isHovering?.() ? 1 : 0.5;
      const faceColor = resolve(fill);
      const inkColor = resolve(ink);
      theme.glowRect({
        pos: k.vec2(x, y),
        width: w,
        height: h,
        radius: 22,
        color: faceColor,
        glow: resolve(outline) ?? faceColor,
        intensity: faceColor === C.panel ? lit * 0.4 : lit,
        outline: outline ? { width: 2, color: resolve(outline) } : null,
      });
      theme.glowText({
        text: resolve(label),
        size,
        font: FONT,
        pos: k.vec2(x + w / 2, y + h / 2),
        anchor: "center",
        color: inkColor,
        intensity: inkColor === C.bg ? 0 : 0.7,
      });
    }

    return { box, paint };
  }

  /** Square icon button — pause, sound. */
  function iconButton({ x, y, size = 56, glyph, onPress, accent = C.ink }) {
    return button({
      x,
      y,
      w: size,
      h: size,
      label: glyph,
      size: 16,
      fill: C.panel,
      ink: accent,
      outline: C.line,
      onPress,
    });
  }

  function muteButton(x, y) {
    return iconButton({
      x,
      y,
      glyph: () => (isMuted() ? "OFF" : "ON"),
      accent: () => (isMuted() ? C.mute : C.accent),
      onPress: () => {
        setMuted(!isMuted());
        sfx.ui();
      },
    });
  }

  // Slow drift of faint dots so the menus are not dead rectangles.
  const DOTS = Array.from({ length: 54 }, (_, i) => ({
    x: ((i * 97) % 53) / 53,
    y: ((i * 61) % 47) / 47,
    r: 1 + ((i * 13) % 5) * 0.4,
    speed: 4 + ((i * 7) % 9),
  }));

  /** kaplay's clear colour is set once at boot, so themes repaint it here. */
  function drawBackdrop() {
    k.drawRect({ pos: k.vec2(0, 0), width: W, height: H, color: C.bg });
  }

  function drawDrift(opacity = 0.16) {
    const t = k.time();
    for (const d of DOTS) {
      const y = (d.y * H + t * d.speed) % (H + 40);
      k.drawCircle({
        pos: k.vec2(d.x * W, y - 20),
        radius: d.r,
        color: C.accent,
        opacity: opacity * (0.4 + d.r * 0.2),
      });
    }
  }

  function drawWordmark() {
    k.drawText({
      text: "SULLEN STUDIO",
      size: 13,
      font: FONT,
      pos: k.vec2(MARGIN, 32),
      color: C.mute,
      letterSpacing: 3,
    });
  }

  return {
    button,
    iconButton,
    muteButton,
    drawBackdrop,
    drawDrift,
    drawWordmark,
  };
}
