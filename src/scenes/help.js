import { COMBO_WINDOW, MAX_MULT } from "../game/logic.js";
import { CONTENT_W, FONT, MARGIN, W } from "../ui/layout.js";
import { SNACK, SNACK_ORDER, drawSnack } from "../ui/snacks.js";

const CARD_Y = 128;
const CARD_H = 112;
const CARD_GAP = 10;

/**
 * The snack rules, spelled out. Testers knew the snake was fun but could not
 * say what any of the pickups did, so this is its own screen with room to say
 * it plainly rather than a cramped strip on the menu.
 */
export function registerHelp(k, ctx) {
  const { theme, widgets } = ctx;
  const { C, glowText, panel, glowRect } = theme;

  k.scene("help", () => {
    const back = widgets.button({
      y: 828,
      h: 66,
      label: "BACK",
      size: 18,
      fill: C.panel,
      ink: C.ink,
      outline: C.line,
      onPress: () => k.go("menu"),
    });

    k.onDraw(() => {
      widgets.drawBackdrop();
      widgets.drawDrift(0.09);
      widgets.drawWordmark();

      glowText({
        text: "HOW TO PLAY",
        size: 40,
        font: FONT,
        pos: k.vec2(MARGIN, 54),
        color: C.ink,
        glow: C.accent,
        intensity: 0.9,
      });

      SNACK_ORDER.forEach((type, i) => {
        const meta = SNACK[type];
        const y = CARD_Y + i * (CARD_H + CARD_GAP);
        const colour = C[meta.key];

        panel({ pos: k.vec2(MARGIN, y), width: CONTENT_W, height: CARD_H });
        drawSnack(k, theme, type, k.vec2(MARGIN + 46, y + 44), {
          scale: 1.25,
          intensity: 1,
        });

        glowText({
          text: meta.name,
          size: 20,
          font: FONT,
          pos: k.vec2(MARGIN + 88, y + 18),
          color: colour,
          intensity: 0.5,
          letterSpacing: 1,
        });
        k.drawText({
          text: `+${meta.points}`,
          size: 16,
          font: FONT,
          pos: k.vec2(W - MARGIN - 20, y + 20),
          anchor: "topright",
          color: C.mute,
        });
        k.drawText({
          text: meta.detail,
          size: 14,
          font: FONT,
          width: CONTENT_W - 112,
          lineSpacing: 5,
          pos: k.vec2(MARGIN + 88, y + 44),
          color: C.mute,
        });
      });

      const chainY = CARD_Y + 4 * (CARD_H + CARD_GAP) + 8;
      glowRect({
        pos: k.vec2(MARGIN, chainY),
        width: CONTENT_W,
        height: 122,
        radius: 22,
        color: C.panel,
        glow: C.accent,
        intensity: 0.3,
        outline: { width: 2, color: C.accentDim },
      });
      glowText({
        text: "THE CHAIN",
        size: 17,
        font: FONT,
        pos: k.vec2(MARGIN + 24, chainY + 18),
        color: C.accentHi,
        intensity: 0.7,
        letterSpacing: 1,
      });
      k.drawText({
        text: `Eat again within ${COMBO_WINDOW}s and your chain grows: ×2 at 3 in a row, ×3 at 6, ×4 at ${MAX_MULT * 3 - 3}. Pause too long, or bite a bone, and it drops to zero. Every segment you gain also speeds the snake up.`,
        size: 14,
        font: FONT,
        width: CONTENT_W - 48,
        lineSpacing: 5,
        pos: k.vec2(MARGIN + 24, chainY + 44),
        color: C.mute,
      });

      k.drawText({
        text: "Move with the pad, arrows, WASD, or a swipe.   P pauses.",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, chainY + 146),
        anchor: "center",
        color: C.mute,
      });

      back.paint();
    });

    k.onKeyPress("escape", () => k.go("menu"));
    k.onKeyPress("m", () => k.go("menu"));
    k.onKeyPress("space", () => k.go("menu"));
  });
}
