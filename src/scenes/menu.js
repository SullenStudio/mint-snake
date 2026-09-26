import { resumeAudio, sfx } from "../audio.js";
import { dailySeed, dayNumber, randomSeed } from "../game/rng.js";
import { CONTENT_W, FONT, MARGIN, W } from "../ui/layout.js";
import { SNACK, SNACK_ORDER, drawSnack } from "../ui/snacks.js";
import { THEME_NAMES, THEMES } from "../ui/theme.js";

const STRIP_Y = 168;
const SWATCH = { y: 792, size: 48, gap: 14 };

export function registerMenu(k, ctx) {
  const { theme, widgets, store } = ctx;
  const { C, glowText, glowRect, panel } = theme;

  k.scene("menu", () => {
    const today = dailySeed();
    const day = dayNumber();
    const playedToday = store.hasPlayedDaily(today);

    const play = (mode) =>
      k.go("game", { mode, seed: mode === "daily" ? today : randomSeed() });

    const swatchX = (i) => {
      const total =
        THEME_NAMES.length * SWATCH.size + (THEME_NAMES.length - 1) * SWATCH.gap;
      return (W - total) / 2 + i * (SWATCH.size + SWATCH.gap);
    };

    const painted = [
      widgets.muteButton(W - MARGIN - 56, 22),
      widgets.button({
        y: 430,
        h: 92,
        label: "PLAY",
        size: 27,
        onPress: () => play("classic"),
      }),
      widgets.button({
        y: 540,
        h: 74,
        label: `DAILY  ·  DAY #${day}`,
        size: 18,
        fill: C.panel,
        ink: C.volt,
        outline: C.volt,
        onPress: () => play("daily"),
      }),
      widgets.button({
        y: 632,
        h: 66,
        label: "HOW TO PLAY",
        size: 17,
        fill: C.panel,
        ink: C.ink,
        outline: C.line,
        onPress: () => k.go("help"),
      }),
    ];

    // Swapping the palette mutates the shared colour table, but buttons capture
    // their colours when they are built — so rebuild the scene after a change.
    THEME_NAMES.forEach((name, i) => {
      const zone = k.add([
        k.rect(SWATCH.size, SWATCH.size),
        k.pos(swatchX(i), SWATCH.y),
        k.opacity(0),
        k.area(),
      ]);
      zone.onClick(() => {
        resumeAudio();
        sfx.ui();
        if (theme.name() === name) return;
        theme.use(name);
        store.writeTheme(name);
        k.go("menu");
      });
    });

    k.onDraw(() => {
      widgets.drawBackdrop();
      widgets.drawDrift();
      widgets.drawWordmark();

      glowText({
        text: "MINT SNAKE",
        size: 56,
        font: FONT,
        pos: k.vec2(MARGIN, 54),
        color: C.ink,
        glow: C.accent,
        intensity: 1.1,
      });

      // Compact snack strip: names and one-liners live on the help screen.
      panel({ pos: k.vec2(MARGIN, STRIP_Y), width: CONTENT_W, height: 96 });
      SNACK_ORDER.forEach((type, i) => {
        const x = MARGIN + 60 + i * 119;
        drawSnack(k, theme, type, k.vec2(x, STRIP_Y + 34), { intensity: 0.9 });
        k.drawText({
          text: SNACK[type].name,
          size: 11,
          font: FONT,
          pos: k.vec2(x, STRIP_Y + 64),
          anchor: "center",
          color: C.mute,
          letterSpacing: 1,
        });
      });

      glowText({
        text: `BEST  ${store.readBest("classic")}`,
        size: 23,
        font: FONT,
        pos: k.vec2(MARGIN, 300),
        color: C.accent,
        intensity: 0.7,
      });
      glowText({
        text: playedToday ? `TODAY  ${store.readBest("daily", today)}` : "TODAY  —",
        size: 23,
        font: FONT,
        pos: k.vec2(W - MARGIN, 300),
        anchor: "topright",
        color: C.volt,
        intensity: playedToday ? 0.7 : 0.2,
      });
      k.drawText({
        text: "Same board for everyone, once a day.",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 348),
        anchor: "center",
        color: C.faint,
      });

      for (const p of painted) p.paint();

      k.drawText({
        text: "THEME",
        size: 12,
        font: FONT,
        pos: k.vec2(W / 2, 766),
        anchor: "center",
        color: C.mute,
        letterSpacing: 3,
      });
      THEME_NAMES.forEach((name, i) => {
        const chosen = theme.name() === name;
        const [r, g, b] = THEMES[name].accent;
        glowRect({
          pos: k.vec2(swatchX(i), SWATCH.y),
          width: SWATCH.size,
          height: SWATCH.size,
          radius: 16,
          color: k.rgb(r, g, b),
          intensity: chosen ? 1 : 0.25,
          outline: chosen ? { width: 3, color: C.ink } : null,
        });
      });

      k.drawText({
        text: "Arrows · WASD · swipe · on-screen pad",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 872),
        anchor: "center",
        color: C.mute,
      });
      k.drawText({
        text: "SPACE play   ·   D daily   ·   H help",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 900),
        anchor: "center",
        color: C.accentDim,
      });
    });

    const start = (mode) => () => {
      resumeAudio();
      play(mode);
    };
    k.onKeyPress("space", start("classic"));
    k.onKeyPress("enter", start("classic"));
    k.onKeyPress("d", start("daily"));
    k.onKeyPress("h", () => k.go("help"));
  });
}
