import { resumeAudio } from "../audio.js";
import { COMBO_WINDOW } from "../game/logic.js";
import { dailySeed, dayNumber, randomSeed } from "../game/rng.js";
import { CONTENT_W, FONT, MARGIN, W } from "../ui/layout.js";
import { SNACK, SNACK_ORDER, drawSnack } from "../ui/snacks.js";

const LEGEND_Y = 132;
const ROW_H = 58;
const CHAIN_Y = 396;

export function registerMenu(k, ctx) {
  const { theme, widgets, store } = ctx;
  const { C, glowText, panel } = theme;

  k.scene("menu", () => {
    const today = dailySeed();
    const day = dayNumber();

    const play = (mode) =>
      k.go("game", { mode, seed: mode === "daily" ? today : randomSeed() });

    const painted = [
      widgets.muteButton(W - MARGIN - 56, 22),
      widgets.button({
        y: 600,
        h: 88,
        label: "PLAY",
        size: 26,
        onPress: () => play("classic"),
      }),
      widgets.button({
        y: 706,
        h: 72,
        label: `DAILY  ·  DAY #${day}`,
        size: 18,
        fill: C.panel,
        ink: C.volt,
        outline: C.volt,
        onPress: () => play("daily"),
      }),
    ];

    k.onDraw(() => {
      widgets.drawDrift();
      widgets.drawWordmark();

      glowText({
        text: "MINT SNAKE",
        size: 54,
        font: FONT,
        pos: k.vec2(MARGIN, 52),
        color: C.ink,
        glow: C.mint,
        intensity: 1.1,
      });

      panel({
        pos: k.vec2(MARGIN, LEGEND_Y),
        width: CONTENT_W,
        height: ROW_H * SNACK_ORDER.length + 16,
      });
      SNACK_ORDER.forEach((type, i) => {
        const y = LEGEND_Y + 24 + i * ROW_H;
        drawSnack(k, theme, type, k.vec2(MARGIN + 42, y + 18), {
          intensity: 0.85,
        });
        k.drawText({
          text: SNACK[type].name,
          size: 19,
          font: FONT,
          pos: k.vec2(MARGIN + 76, y + 4),
          color: C.ink,
        });
        k.drawText({
          text: SNACK[type].hint,
          size: 14,
          font: FONT,
          pos: k.vec2(MARGIN + 76, y + 27),
          color: C.mute,
        });
      });

      panel({ pos: k.vec2(MARGIN, CHAIN_Y), width: CONTENT_W, height: 118 });
      glowText({
        text: "CHAIN SNACKS",
        size: 16,
        font: FONT,
        pos: k.vec2(MARGIN + 24, CHAIN_Y + 20),
        color: C.mintHi,
        intensity: 0.8,
      });
      k.drawText({
        text: `Bite again within ${COMBO_WINDOW}s to keep the chain: ×2 at 3, ×3 at 6, ×4 at 9. A bone breaks it. The snake speeds up as it grows.`,
        size: 14,
        font: FONT,
        width: CONTENT_W - 48,
        lineSpacing: 5,
        pos: k.vec2(MARGIN + 24, CHAIN_Y + 44),
        color: C.mute,
      });

      glowText({
        text: `BEST  ${store.readBest("classic")}`,
        size: 22,
        font: FONT,
        pos: k.vec2(MARGIN, 544),
        color: C.mint,
        intensity: 0.7,
      });
      glowText({
        text: store.hasPlayedDaily(today)
          ? `TODAY  ${store.readBest("daily", today)}`
          : "TODAY  —",
        size: 22,
        font: FONT,
        pos: k.vec2(W - MARGIN, 544),
        anchor: "topright",
        color: C.volt,
        intensity: store.hasPlayedDaily(today) ? 0.7 : 0.2,
      });

      for (const p of painted) p.paint();

      k.drawText({
        text: "Same board for everyone, once a day.",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 800),
        anchor: "center",
        color: C.mute,
      });
      k.drawText({
        text: "Arrows · WASD · swipe · on-screen pad     P pauses",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 852),
        anchor: "center",
        color: C.mute,
      });
      k.drawText({
        text: "SPACE play   ·   D daily",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 880),
        anchor: "center",
        color: C.mintDim,
      });
    });

    const start = (mode) => () => {
      resumeAudio();
      play(mode);
    };
    k.onKeyPress("space", start("classic"));
    k.onKeyPress("enter", start("classic"));
    k.onKeyPress("d", start("daily"));
  });
}
