import { buzz, resumeAudio, sfx } from "../audio.js";
import {
  COLS,
  COMBO_WINDOW,
  FOOD,
  ROWS,
  VOLT_TIME,
  WRAP_TIME,
  comboMult,
  createGame,
  queueDir,
  stepProgress,
  tick,
} from "../game/logic.js";
import { dayNumber, randomSeed } from "../game/rng.js";
import { PAD, PAD_BUTTONS, drawPad, hitPad } from "../ui/controls.js";
import {
  BOARD_H,
  BOARD_W,
  CELL,
  CONTENT_W,
  FONT,
  H,
  MARGIN,
  OX,
  OY,
  W,
  cellCenter,
  cellOrigin,
  ease,
} from "../ui/layout.js";
import { drawSnack, snackColor } from "../ui/snacks.js";
import { bodyTint } from "../ui/theme.js";

const CHAIN = { x: MARGIN, y: 86, w: 196, h: 12 };
const SEG_R = (CELL - 6) / 2;
const PRESS_FEEDBACK = 0.12;
const SWIPE_MIN = 24;

/** Set while the tab is hidden, so a run never dies off-screen. */
let wentAway = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) wentAway = true;
});

export function registerGame(k, ctx) {
  const { theme, widgets, store } = ctx;
  const { C, tint, glowRect, glowCircle, glowText } = theme;

  k.scene("game", ({ mode = "classic", seed = randomSeed() } = {}) => {
    const state = createGame({ seed, mode });
    const day = dayNumber();
    const best = store.readBest(mode, seed);

    let paused = false;
    let overlay = [];
    let pressed = null;
    let pressHold = 0;
    let swipe = null;
    // Swallow the press that launched the scene so it is not read as a swipe.
    let ignoreInput = 0.35;
    let multPop = 0;

    /** Bite rings, score pops, the flash on the fatal cell. */
    const fx = [];
    const addFx = (e) => fx.push({ t: 0, ...e });

    // ----------------------------------------------------------------- pause

    const PAUSE_BUTTONS = [
      { label: "RESUME", y: 520, act: () => hidePause() },
      { label: "GIVE UP", y: 612, act: () => k.go("menu") },
    ];

    function hidePause() {
      paused = false;
      overlay.forEach((o) => o.destroy());
      overlay = [];
    }

    function showPause() {
      if (paused || !state.alive) return;
      paused = true;
      pressed = null;
      pressHold = 0;
      swipe = null;
      gesturing = false;
      overlay = PAUSE_BUTTONS.map((b) => {
        const zone = k.add([
          k.rect(CONTENT_W, 72),
          k.pos(MARGIN, b.y),
          k.opacity(0),
          k.area(),
          k.z(60),
        ]);
        zone.onClick(() => {
          resumeAudio();
          sfx.ui();
          b.act();
        });
        return zone;
      });
    }

    const togglePause = () => (paused ? hidePause() : showPause());

    const chrome = [
      widgets.iconButton({
        x: W - MARGIN - 56,
        y: 22,
        glyph: "II",
        onPress: togglePause,
      }),
      widgets.muteButton(W - MARGIN - 120, 22),
    ];

    // ---------------------------------------------------------------- events

    function finish() {
      const result = store.writeBest(state.mode, state.seed, state.score);
      store.bumpPlays();
      const run = {
        mode: state.mode,
        score: state.score,
        bestCombo: state.bestCombo,
        eaten: { ...state.eaten },
        elapsed: state.elapsed,
      };
      k.wait(0.85, () =>
        k.go("over", { run, best: result.best, isRecord: result.isRecord, day }),
      );
    }

    function handle(events) {
      for (const e of events) {
        if (e.type === "eat") {
          const boosted = e.mult > 1;
          addFx({
            kind: "ring",
            x: e.food.x,
            y: e.food.y,
            life: 0.4,
            color: snackColor(theme, e.food.type),
          });
          addFx({
            kind: "pop",
            x: e.food.x,
            y: e.food.y,
            life: 0.7,
            color: boosted ? C.accentHi : snackColor(theme, e.food.type),
            label: boosted ? `+${e.gain}  ×${e.mult}` : `+${e.gain}`,
          });
          if (boosted) {
            multPop = 1;
            sfx.combo(e.mult);
            k.shake(2 + e.mult);
          } else if (e.food.type === FOOD.BONE) {
            sfx.bone();
            k.shake(4);
          } else {
            sfx[e.food.type]();
          }
          buzz(e.food.type === FOOD.BONE ? 40 : 12);
        }

        if (e.type === "die") {
          addFx({
            kind: "flash",
            x: Math.min(COLS - 1, Math.max(0, e.cell.x)),
            y: Math.min(ROWS - 1, Math.max(0, e.cell.y)),
            life: 0.85,
            color: C.danger,
          });
          k.shake(16);
          sfx.die();
          buzz(140);
          finish();
        }
      }
    }

    // ----------------------------------------------------------------- input

    const steer = (x, y) => {
      if (!paused) queueDir(state, x, y);
    };

    const KEYS = {
      left: [-1, 0],
      right: [1, 0],
      up: [0, -1],
      down: [0, 1],
      a: [-1, 0],
      d: [1, 0],
      w: [0, -1],
      s: [0, 1],
    };
    for (const [key, [x, y]] of Object.entries(KEYS)) {
      k.onKeyPress(key, () => {
        resumeAudio();
        steer(x, y);
      });
    }
    k.onKeyPress("p", togglePause);
    k.onKeyPress("escape", togglePause);

    function steerFromVec(vx, vy) {
      if (Math.abs(vx) > Math.abs(vy)) steer(Math.sign(vx), 0);
      else steer(0, Math.sign(vy));
    }

    // Two bugs lived here.
    //
    // 1. onMouseDown fires every frame the pointer is HELD, not once on press.
    //    kaplay batches touchstart and touchend into the same "input" tick, so
    //    a quick tap could start and end without the handler ever running —
    //    the "I tap and nothing happens" report.
    // 2. kaplay's touch-to-mouse emulation drops the mouseRelease entirely
    //    when touchmove events came in between, so swipes never completed.
    //
    // So: listen on both the mouse and the touch APIs, and make the pair
    // idempotent with a gesture flag. Whichever fires first wins; the
    // duplicate is ignored, and neither ordering nor a missing event matters.
    let gesturing = false;

    function beginPointer(pos) {
      resumeAudio();
      if (gesturing || ignoreInput > 0 || paused) return;
      gesturing = true;

      const button = hitPad(pos.x, pos.y);
      if (button) {
        // Act on press, not release — turning has to feel instant.
        pressed = button.name;
        pressHold = PRESS_FEEDBACK;
        swipe = null;
        steer(button.dir.x, button.dir.y);
        buzz(8);
        return;
      }
      swipe = k.vec2(pos.x, pos.y);
    }

    function endPointer(pos) {
      if (!gesturing) return;
      gesturing = false;
      const start = swipe;
      swipe = null;
      if (!start || ignoreInput > 0 || paused) return;
      const d = k.vec2(pos.x, pos.y).sub(start);
      if (d.len() >= SWIPE_MIN) steerFromVec(d.x, d.y);
    }

    k.onMousePress(() => beginPointer(k.mousePos()));
    k.onMouseRelease(() => endPointer(k.mousePos()));
    k.onTouchStart((pos) => beginPointer(pos));
    k.onTouchEnd((pos) => endPointer(pos));

    // ---------------------------------------------------------------- update

    k.onUpdate(() => {
      const dt = k.dt();
      ignoreInput = Math.max(0, ignoreInput - dt);
      multPop = Math.max(0, multPop - dt * 2.4);
      // Hold the lit state briefly: a tap can be over before the next frame,
      // and a button that never visibly reacts reads as a dropped input.
      pressHold = Math.max(0, pressHold - dt);
      if (pressHold === 0 && !k.isMouseDown()) pressed = null;

      for (let i = fx.length - 1; i >= 0; i--) {
        fx[i].t += dt;
        if (fx[i].t >= fx[i].life) fx.splice(i, 1);
      }

      if (wentAway) {
        wentAway = false;
        showPause();
      }
      if (paused || !state.alive) return;

      handle(tick(state, dt));
    });

    // ------------------------------------------------------------------ draw

    function drawBoard() {
      const phasing = state.wrapLeft > 0;
      glowRect({
        pos: k.vec2(OX - 8, OY - 8),
        width: BOARD_W + 16,
        height: BOARD_H + 16,
        radius: 20,
        color: k.rgb(3, 6, 5),
        glow: phasing ? C.portal : C.accent,
        intensity: phasing ? 0.9 : 0.35,
        outline: { width: 2, color: phasing ? C.portal : C.line },
      });

      // Faint lattice — the light in this design comes from the snake, not the
      // board, so the grid only needs to hint at the cells.
      for (let x = 1; x < COLS; x++) {
        k.drawLine({
          p1: k.vec2(OX + x * CELL, OY),
          p2: k.vec2(OX + x * CELL, OY + BOARD_H),
          width: 1,
          color: C.line,
          opacity: 0.55,
        });
      }
      for (let y = 1; y < ROWS; y++) {
        k.drawLine({
          p1: k.vec2(OX, OY + y * CELL),
          p2: k.vec2(OX + BOARD_W, OY + y * CELL),
          width: 1,
          color: C.line,
          opacity: 0.55,
        });
      }
    }

    /** Interpolated centre of segment `i`, or null across a wrap jump. */
    function segCentre(i, t) {
      const to = state.snake[i];
      const from = state.prevSnake[i] || to;
      if (Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) {
        return { at: cellCenter(k, to.x, to.y), jumped: true };
      }
      return {
        at: k.vec2(
          OX + (from.x + (to.x - from.x) * t) * CELL + CELL / 2,
          OY + (from.y + (to.y - from.y) * t) * CELL + CELL / 2,
        ),
        jumped: false,
      };
    }

    function drawSnake() {
      const t = state.alive ? ease(stepProgress(state)) : 1;
      const len = state.snake.length;
      const points = Array.from({ length: len }, (_, i) => segCentre(i, t));
      const rushing = state.voltLeft > 0;

      // One cheap halo pass for the whole body, then the solid tube on top.
      for (let i = len - 1; i >= 0; i--) {
        k.drawCircle({
          pos: points[i].at,
          radius: SEG_R + 5,
          color: C.accent,
          opacity: (rushing ? 0.16 : 0.1) * (1 - i / (len + 4)),
        });
      }

      for (let i = len - 1; i >= 1; i--) {
        const color = tint(bodyTint(i, len, theme.ramp()));
        k.drawCircle({ pos: points[i].at, radius: SEG_R, color });
        if (!points[i].jumped && !points[i - 1].jumped) {
          k.drawLine({
            p1: points[i].at,
            p2: points[i - 1].at,
            width: SEG_R * 2,
            color,
          });
        }
      }

      // Glow in `mint`, core in `mintHi`: stacking the bright tone in both
      // blows the head out to a white blob and loses the shape.
      const head = points[0].at;
      glowCircle({
        pos: head,
        radius: SEG_R + 1,
        color: C.accentHi,
        glow: C.accent,
        intensity: rushing ? 1 : 0.65,
      });
      const { x: dx, y: dy } = state.dir;
      for (const side of [1, -1]) {
        k.drawCircle({
          pos: head.add(dx * 4 - dy * 4 * side, dy * 4 + dx * 4 * side),
          radius: 2.6,
          color: C.bg,
        });
      }
    }

    function drawFx() {
      for (const e of fx) {
        const at = cellCenter(k, e.x, e.y);
        const p = e.t / e.life;

        if (e.kind === "ring") {
          k.drawCircle({
            pos: at,
            radius: 7 + 22 * ease(p),
            fill: false,
            opacity: 1 - p,
            outline: { width: 3, color: e.color },
          });
        }
        if (e.kind === "pop") {
          glowText({
            text: e.label,
            size: 19,
            font: FONT,
            pos: at.add(0, -10 - 34 * ease(p)),
            anchor: "center",
            color: e.color,
            opacity: 1 - p * p,
            intensity: 0.6 * (1 - p),
          });
        }
        if (e.kind === "flash") {
          glowRect({
            pos: cellOrigin(k, e.x, e.y),
            width: CELL,
            height: CELL,
            radius: 6,
            color: e.color,
            opacity: 0.9 * (1 - p),
            intensity: 1.4 * (1 - p),
          });
        }
      }
    }

    function drawHud() {
      glowText({
        text: String(state.score),
        size: 46,
        font: FONT,
        pos: k.vec2(MARGIN, 14),
        color: C.accentHi,
        glow: C.accent,
        intensity: 1,
      });
      k.drawText({
        text: state.mode === "daily" ? `DAILY #${day}` : `BEST ${best}`,
        size: 13,
        font: FONT,
        pos: k.vec2(MARGIN, 64),
        color: C.mute,
        letterSpacing: 2,
      });

      const mult = comboMult(state.combo);
      const frac = state.comboLeft / COMBO_WINDOW;
      const live = state.combo > 0;
      const accent = mult >= 4 ? C.volt : mult >= 3 ? C.accentHi : C.accent;

      k.drawRect({
        pos: k.vec2(CHAIN.x, CHAIN.y),
        width: CHAIN.w,
        height: CHAIN.h,
        radius: CHAIN.h / 2,
        color: C.panel,
        outline: { width: 1, color: C.line },
      });
      if (frac > 0) {
        glowRect({
          pos: k.vec2(CHAIN.x + 1, CHAIN.y + 1),
          width: (CHAIN.w - 2) * frac,
          height: CHAIN.h - 2,
          radius: (CHAIN.h - 2) / 2,
          color: accent,
          intensity: 0.5 + mult * 0.25,
        });
      }
      // Label sits beside the bar, not under it — the board starts at y=108.
      glowText({
        text: live ? `CHAIN ${state.combo}` : "CHAIN —",
        size: 13,
        font: FONT,
        pos: k.vec2(CHAIN.x + CHAIN.w + 14, CHAIN.y + 6),
        anchor: "left",
        color: live ? accent : C.faint,
        intensity: live ? 0.5 : 0,
      });
      if (live) {
        glowText({
          text: `×${mult}`,
          size: 17 + multPop * 9,
          font: FONT,
          pos: k.vec2(CHAIN.x + CHAIN.w + 96, CHAIN.y + 6),
          anchor: "left",
          color: accent,
          intensity: 0.7 + multPop,
        });
      }

      const chips = [];
      if (state.voltLeft > 0) {
        chips.push(["VOLT", state.voltLeft / VOLT_TIME, C.volt]);
      }
      if (state.wrapLeft > 0) {
        chips.push(["PHASE", state.wrapLeft / WRAP_TIME, C.portal]);
      }
      chips.forEach(([text, frac_, color], i) => {
        const x = W - MARGIN - 92 - i * 100;
        const y = 82;
        glowRect({
          pos: k.vec2(x, y),
          width: 92,
          height: 26,
          radius: 13,
          color: C.panel,
          glow: color,
          intensity: 0.7,
          outline: { width: 2, color },
        });
        k.drawText({
          text,
          size: 12,
          font: FONT,
          pos: k.vec2(x + 46, y + 9),
          anchor: "center",
          color,
          letterSpacing: 1,
        });
        k.drawRect({
          pos: k.vec2(x + 8, y + 19),
          width: 76 * frac_,
          height: 3,
          radius: 1.5,
          color,
        });
      });
    }


    function drawPauseOverlay() {
      k.drawRect({
        pos: k.vec2(0, 0),
        width: W,
        height: H,
        color: k.rgb(0, 0, 0),
        opacity: 0.86,
      });
      glowText({
        text: "PAUSED",
        size: 46,
        font: FONT,
        pos: k.vec2(W / 2, 400),
        anchor: "center",
        color: C.ink,
        glow: C.accent,
        intensity: 1,
      });
      PAUSE_BUTTONS.forEach((b, i) => {
        const primary = i === 0;
        glowRect({
          pos: k.vec2(MARGIN, b.y),
          width: CONTENT_W,
          height: 72,
          radius: 22,
          color: primary ? C.accent : C.panel,
          glow: C.accent,
          intensity: primary ? 0.9 : 0.3,
          outline: primary ? null : { width: 2, color: C.line },
        });
        k.drawText({
          text: b.label,
          size: 20,
          font: FONT,
          pos: k.vec2(W / 2, b.y + 36),
          anchor: "center",
          color: primary ? C.bg : C.ink,
        });
      });
    }

    k.onDraw(() => {
      widgets.drawBackdrop();
      widgets.drawDrift(0.07);
      drawBoard();
      for (const food of state.foods) {
        const phase = food.x * 7 + food.y * 13;
        const pulse = 1 + 0.05 * Math.sin(k.time() * 5 + phase);
        drawSnack(k, theme, food.type, cellCenter(k, food.x, food.y), {
          scale: pulse,
          intensity: 0.9 + 0.15 * Math.sin(k.time() * 5 + phase),
        });
      }
      drawSnake();
      drawFx();
      drawHud();
      for (const c of chrome) c.paint();
      drawPad(k, theme, { pressed, facing: state.dir });
      if (paused) drawPauseOverlay();
    });
  });
}

export { PAD_BUTTONS };
