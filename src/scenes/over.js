import { comboMult } from "../game/logic.js";
import { dailySeed, randomSeed } from "../game/rng.js";
import { shareText } from "../game/share.js";
import { CONTENT_W, FONT, MARGIN, W } from "../ui/layout.js";
import { SNACK_ORDER, drawSnack } from "../ui/snacks.js";

const TALLY_Y = 396;

async function copyOrShare(text) {
  try {
    if (navigator.canShare?.({ text })) {
      await navigator.share({ text });
      return "SHARED";
    }
  } catch {
    /* sheet dismissed — fall through to the clipboard */
  }
  try {
    await navigator.clipboard.writeText(text);
    return "COPIED TO CLIPBOARD";
  } catch {
    return "COPY BLOCKED";
  }
}

export function registerOver(k, ctx) {
  const { theme, widgets } = ctx;
  const { C, glowRect, glowText, panel } = theme;

  k.scene("over", ({ run, best, isRecord, day }) => {
    const replay = () =>
      k.go("game", {
        mode: run.mode,
        seed: run.mode === "daily" ? dailySeed() : randomSeed(),
      });

    // The pad's right button sits exactly where MENU lands, so a tap still in
    // flight when the run ends would bounce the player straight out.
    let armed = false;
    k.wait(0.45, () => (armed = true));
    const ready = () => armed;

    let shareLabel = "SHARE RESULT";
    const text = shareText(run, {
      day,
      isRecord,
      url: window.location.href.split(/[?#]/)[0],
    });

    const painted = [
      widgets.muteButton(W - MARGIN - 56, 22),
      widgets.button({
        y: 586,
        h: 66,
        label: () => shareLabel,
        size: 17,
        fill: C.panel,
        ink: C.mintHi,
        outline: C.line,
        enabled: ready,
        onPress: async () => {
          shareLabel = await copyOrShare(text);
        },
      }),
      widgets.button({
        y: 672,
        h: 86,
        label: "PLAY AGAIN",
        size: 23,
        enabled: ready,
        onPress: replay,
      }),
      widgets.button({
        y: 778,
        h: 66,
        label: "MENU",
        size: 17,
        fill: C.panel,
        ink: C.ink,
        outline: C.line,
        enabled: ready,
        onPress: () => k.go("menu"),
      }),
    ];

    k.onDraw(() => {
      widgets.drawDrift(0.1);
      widgets.drawWordmark();

      glowText({
        text: "GAME OVER",
        size: 46,
        font: FONT,
        pos: k.vec2(MARGIN, 52),
        color: C.ink,
        glow: isRecord ? C.volt : C.mint,
        intensity: 0.9,
      });

      k.drawText({
        text: run.mode === "daily" ? `DAILY  ·  DAY #${day}` : "CLASSIC",
        size: 14,
        font: FONT,
        pos: k.vec2(W / 2, 156),
        anchor: "center",
        color: C.mute,
        letterSpacing: 3,
      });

      glowText({
        text: String(run.score),
        size: 96,
        font: FONT,
        pos: k.vec2(W / 2, 248),
        anchor: "center",
        color: isRecord ? C.volt : C.mintHi,
        glow: isRecord ? C.volt : C.mint,
        intensity: isRecord ? 1.6 : 1.1,
      });

      if (isRecord) {
        glowRect({
          pos: k.vec2(W / 2 - 104, 312),
          width: 208,
          height: 42,
          radius: 21,
          color: C.volt,
          intensity: 1.2,
        });
        k.drawText({
          text: "NEW BEST",
          size: 18,
          font: FONT,
          pos: k.vec2(W / 2, 333),
          anchor: "center",
          color: C.bg,
          letterSpacing: 2,
        });
      } else {
        k.drawText({
          text: `BEST  ${best}`,
          size: 21,
          font: FONT,
          pos: k.vec2(W / 2, 324),
          anchor: "center",
          color: C.mute,
        });
      }

      panel({ pos: k.vec2(MARGIN, TALLY_Y), width: CONTENT_W, height: 116 });
      SNACK_ORDER.forEach((type, i) => {
        const x = MARGIN + 60 + i * 119;
        const eaten = run.eaten[type];
        drawSnack(k, theme, type, k.vec2(x, TALLY_Y + 40), {
          scale: 0.95,
          intensity: eaten > 0 ? 0.9 : 0.2,
        });
        k.drawText({
          text: String(eaten),
          size: 22,
          font: FONT,
          pos: k.vec2(x, TALLY_Y + 76),
          anchor: "center",
          color: eaten > 0 ? C.ink : C.faint,
        });
      });

      k.drawText({
        text: `BEST CHAIN ${run.bestCombo} · ×${comboMult(run.bestCombo)}      ALIVE ${Math.round(run.elapsed)}s`,
        size: 14,
        font: FONT,
        pos: k.vec2(W / 2, 540),
        anchor: "center",
        color: C.mute,
      });

      for (const p of painted) p.paint();

      k.drawText({
        text: "SPACE replay   ·   M menu",
        size: 13,
        font: FONT,
        pos: k.vec2(W / 2, 886),
        anchor: "center",
        color: C.mintDim,
      });
    });

    k.onKeyPress("space", replay);
    k.onKeyPress("enter", replay);
    k.onKeyPress("m", () => k.go("menu"));
    k.onKeyPress("escape", () => k.go("menu"));
  });
}
