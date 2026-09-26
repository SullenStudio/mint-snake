import kaplay from "kaplay";
import outfitUrl from "./assets/Outfit-Bold.ttf?url";
import { buzz, isMuted, resumeAudio, setMuted, sfx } from "./audio.js";
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
  stepInterval,
  stepProgress,
  tick,
} from "./game/logic.js";
import { dailySeed, dayNumber, randomSeed } from "./game/rng.js";
import { shareText } from "./game/share.js";
import { createStorage } from "./game/storage.js";

const W = 540;
const H = 960;
const CELL = 28;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const OX = Math.round((W - BOARD_W) / 2);
const OY = 148;
const FONT = "Outfit";
const JOY = { x: W / 2, y: 878, r: 64, knob: 26, dead: 16 };

const k = kaplay({
  global: false,
  width: W,
  height: H,
  letterbox: true,
  crisp: true,
  pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  background: [9, 12, 11],
  font: "sans-serif",
  touchToMouse: true,
});

k.loadFont("Outfit", outfitUrl, { filter: "linear" });

const store = createStorage();

const C = {
  bg: k.rgb(9, 12, 11),
  mint: k.rgb(10, 184, 118),
  mintHi: k.rgb(72, 226, 164),
  mintDim: k.rgb(7, 118, 78),
  mintDeep: k.rgb(4, 72, 50),
  ink: k.rgb(245, 247, 246),
  mute: k.rgb(140, 154, 148),
  panel: k.rgb(18, 24, 22),
  line: k.rgb(46, 72, 62),
  cellA: k.rgb(22, 30, 27),
  cellB: k.rgb(14, 18, 17),
  apple: k.rgb(255, 92, 104),
  volt: k.rgb(250, 204, 40),
  pepper: k.rgb(255, 146, 46),
  bone: k.rgb(226, 232, 235),
  leaf: k.rgb(104, 196, 132),
  danger: k.rgb(255, 72, 72),
};

const STYLE = {
  [FOOD.APPLE]: { color: C.apple, name: "APPLE", hint: "grow  ·  10 pts" },
  [FOOD.VOLT]: {
    color: C.volt,
    name: "VOLT",
    hint: `rush ${VOLT_TIME}s  ·  15 pts`,
  },
  [FOOD.PEPPER]: {
    color: C.pepper,
    name: "PEPPER",
    hint: `phase walls ${WRAP_TIME}s  ·  10 pts`,
  },
  [FOOD.BONE]: { color: C.bone, name: "BONE", hint: "−2 length, breaks chain" },
};

const ORDER = [FOOD.APPLE, FOOD.VOLT, FOOD.PEPPER, FOOD.BONE];
const MULT_COLOR = [C.mintDim, C.mintDim, C.mint, C.mintHi, C.volt];

const BOLT = [
  k.vec2(2, -10),
  k.vec2(-6, 1),
  k.vec2(-1, 1),
  k.vec2(-3, 10),
  k.vec2(6, -2),
  k.vec2(1, -2),
];
const CHILI = [k.vec2(0, 9), k.vec2(-8, -6), k.vec2(8, -6)];

/** Set while the tab is hidden, so a run never dies off-screen. */
let wentAway = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) wentAway = true;
});

function cellOrigin(x, y) {
  return k.vec2(OX + x * CELL, OY + y * CELL);
}

function cellCenter(x, y) {
  return cellOrigin(x, y).add(CELL / 2, CELL / 2);
}

function ease(t) {
  return t * t * (3 - 2 * t);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ----------------------------------------------------------------- shared UI

function button({
  x = 32,
  y,
  w = 476,
  h = 72,
  label,
  size = 20,
  fill = C.mint,
  ink = C.bg,
  outline = null,
  z = 1,
  onPress,
}) {
  const box = k.add([
    k.rect(w, h, { radius: 20 }),
    k.pos(x, y),
    k.color(fill),
    k.area(),
    k.z(z),
    ...(outline ? [k.outline(3, outline)] : []),
  ]);
  const text = k.add([
    k.text(label, { size, font: FONT }),
    k.pos(x + w / 2, y + h / 2),
    k.anchor("center"),
    k.color(ink),
    k.z(z + 1),
  ]);
  box.onClick(() => {
    resumeAudio();
    sfx.ui();
    onPress();
  });
  return { box, text };
}

function muteButton(x, y) {
  const ref = button({
    x,
    y,
    w: 60,
    h: 60,
    label: isMuted() ? "OFF" : "ON",
    size: 15,
    fill: C.panel,
    ink: isMuted() ? C.mute : C.mint,
    outline: C.line,
    onPress: () => {
      setMuted(!isMuted());
      ref.text.text = isMuted() ? "OFF" : "ON";
      ref.text.color = isMuted() ? C.mute : C.mint;
      sfx.ui();
    },
  });
  return ref;
}

function drawChrome(title) {
  k.add([k.rect(W, H), k.pos(0, 0), k.color(C.bg), k.fixed(), k.z(-10)]);
  k.add([
    k.text("SULLEN STUDIO", { size: 16, font: FONT }),
    k.pos(32, 28),
    k.color(C.mute),
  ]);
  k.add([
    k.text(title, { size: 40, font: FONT }),
    k.pos(32, 52),
    k.color(C.ink),
  ]);
}

/** Snack glyphs — shape carries the meaning, so colour is never the only cue. */
function drawSnack(type, at, scale = 1) {
  const { color } = STYLE[type];
  const p = (x, y) => at.add(x * scale, y * scale);

  k.drawCircle({ pos: at, radius: 13 * scale, color, opacity: 0.16 });

  if (type === FOOD.APPLE) {
    k.drawCircle({ pos: at, radius: 8.5 * scale, color });
    k.drawRect({
      pos: p(-1.5, -12),
      width: 3 * scale,
      height: 6 * scale,
      radius: 1.5 * scale,
      color: C.leaf,
    });
    return;
  }

  if (type === FOOD.VOLT) {
    k.drawPolygon({ pts: BOLT.map((v) => v.scale(scale)), pos: at, color });
    return;
  }

  if (type === FOOD.PEPPER) {
    k.drawPolygon({ pts: CHILI.map((v) => v.scale(scale)), pos: at, color });
    k.drawRect({
      pos: p(-1.5, -11),
      width: 3 * scale,
      height: 5 * scale,
      radius: 1.5 * scale,
      color: C.leaf,
    });
    return;
  }

  // Bone: a bar with knuckles — unmistakable even at 28px.
  k.drawRect({
    pos: p(-7, -2.5),
    width: 14 * scale,
    height: 5 * scale,
    radius: 2.5 * scale,
    color,
  });
  for (const dx of [-7, 7]) {
    for (const dy of [-4, 4]) {
      k.drawCircle({ pos: p(dx, dy), radius: 3.2 * scale, color });
    }
  }
}

// ----------------------------------------------------------------- menu scene

k.scene("menu", () => {
  drawChrome("MINT SNAKE");
  muteButton(W - 92, 32);

  k.add([
    k.rect(476, 252, { radius: 22 }),
    k.pos(32, 116),
    k.color(C.panel),
    k.outline(3, C.line),
  ]);

  ORDER.forEach((type, i) => {
    const style = STYLE[type];
    k.add([
      k.text(style.name, { size: 19, font: FONT }),
      k.pos(104, 141 + i * 58),
      k.color(C.ink),
    ]);
    k.add([
      k.text(style.hint, { size: 15, font: FONT }),
      k.pos(104, 164 + i * 58),
      k.color(C.mute),
    ]);
  });

  k.add([
    k.rect(476, 122, { radius: 22 }),
    k.pos(32, 384),
    k.color(C.panel),
    k.outline(3, C.line),
  ]);
  k.add([
    k.text("CHAIN SNACKS", { size: 17, font: FONT }),
    k.pos(56, 404),
    k.color(C.mintHi),
  ]);
  k.add([
    k.text(
      `Bite again within ${COMBO_WINDOW}s to keep the chain alive: x2 at 3, x3 at 6, x4 at 9. A bone breaks it. The snake speeds up as it grows.`,
      { size: 15, font: FONT, width: 428, lineSpacing: 4 },
    ),
    k.pos(56, 428),
    k.color(C.mute),
  ]);

  const today = dailySeed();
  const day = dayNumber();

  k.add([
    k.text(`BEST  ${store.readBest("classic")}`, { size: 22, font: FONT }),
    k.pos(32, 532),
    k.color(C.mint),
  ]);
  k.add([
    k.text(
      store.hasPlayedDaily(today)
        ? `TODAY  ${store.readBest("daily", today)}`
        : "TODAY  —",
      { size: 22, font: FONT },
    ),
    k.pos(300, 532),
    k.color(C.volt),
  ]);

  const play = (mode) =>
    k.go("game", { mode, seed: mode === "daily" ? today : randomSeed() });

  button({
    y: 588,
    h: 80,
    label: "PLAY",
    size: 24,
    onPress: () => play("classic"),
  });
  button({
    y: 680,
    h: 72,
    label: `DAILY CHALLENGE  ·  DAY #${day}`,
    size: 17,
    fill: C.panel,
    ink: C.volt,
    outline: C.line,
    onPress: () => play("daily"),
  });

  k.add([
    k.text("Same board for everyone, once a day.", { size: 14, font: FONT }),
    k.pos(32, 764),
    k.color(C.mute),
  ]);
  k.add([
    k.text("Arrows / WASD / swipe, or the stick on phone.  P pauses.", {
      size: 14,
      font: FONT,
      width: 476,
      lineSpacing: 4,
    }),
    k.pos(32, 796),
    k.color(C.mute),
  ]);
  k.add([
    k.text("SPACE play   ·   D daily", { size: 14, font: FONT }),
    k.pos(32, 824),
    k.color(C.mintDim),
  ]);

  k.onDraw(() => {
    ORDER.forEach((type, i) => drawSnack(type, k.vec2(70, 151 + i * 58)));
  });

  k.onKeyPress("space", () => {
    resumeAudio();
    play("classic");
  });
  k.onKeyPress("enter", () => {
    resumeAudio();
    play("classic");
  });
  k.onKeyPress("d", () => {
    resumeAudio();
    play("daily");
  });
});

// ----------------------------------------------------------------- game scene

k.scene("game", ({ mode = "classic", seed = randomSeed() } = {}) => {
  drawChrome("MINT SNAKE");

  const state = createGame({ seed, mode });
  const day = dayNumber();
  const best = store.readBest(mode, seed);

  let paused = false;
  let overlay = [];
  let joyActive = false;
  let joyPull = k.vec2(0, 0);
  let swipe = null;
  // Swallow the press that launched the scene so it is not read as a swipe.
  let ignoreInput = 0.35;

  /** Transient visuals: bite rings, score pops, the flash on the fatal cell. */
  const fx = [];
  const addFx = (entry) => fx.push({ t: 0, ...entry });

  // The overlay is painted entirely in onDraw so it always lands on top of the
  // board, whatever order kaplay renders objects vs. scene draw calls in. The
  // only objects are invisible hit zones that carry the clicks.
  const PAUSE_BUTTONS = [
    {
      label: "RESUME",
      y: 520,
      fill: C.mint,
      ink: C.bg,
      outline: null,
      act: () => hidePause(),
    },
    {
      label: "GIVE UP",
      y: 612,
      fill: C.panel,
      ink: C.ink,
      outline: C.line,
      act: () => k.go("menu"),
    },
  ];

  function hidePause() {
    paused = false;
    overlay.forEach((o) => o.destroy());
    overlay = [];
  }

  function showPause() {
    if (paused || !state.alive) return;
    paused = true;
    joyActive = false;
    joyPull = k.vec2(0, 0);
    swipe = null;

    overlay = PAUSE_BUTTONS.map((b) => {
      const zone = k.add([
        k.rect(476, 72),
        k.pos(32, b.y),
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

  function drawPauseOverlay() {
    k.drawRect({
      pos: k.vec2(0, 0),
      width: W,
      height: H,
      color: k.rgb(0, 0, 0),
      opacity: 0.84,
    });
    k.drawText({
      text: "PAUSED",
      font: FONT,
      size: 44,
      pos: k.vec2(W / 2, 400),
      anchor: "center",
      color: C.ink,
    });
    for (const b of PAUSE_BUTTONS) {
      k.drawRect({
        pos: k.vec2(32, b.y),
        width: 476,
        height: 72,
        radius: 20,
        color: b.fill,
        ...(b.outline ? { outline: { width: 3, color: b.outline } } : {}),
      });
      k.drawText({
        text: b.label,
        font: FONT,
        size: 20,
        pos: k.vec2(W / 2, b.y + 36),
        anchor: "center",
        color: b.ink,
      });
    }
  }

  const togglePause = () => (paused ? hidePause() : showPause());

  button({
    x: W - 92,
    y: 32,
    w: 60,
    h: 60,
    label: "II",
    size: 18,
    fill: C.panel,
    ink: C.ink,
    outline: C.line,
    onPress: togglePause,
  });
  muteButton(W - 164, 32);

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
    k.wait(0.8, () =>
      k.go("over", { run, best: result.best, isRecord: result.isRecord, day }),
    );
  }

  function handle(events) {
    for (const event of events) {
      if (event.type === "eat") {
        const style = STYLE[event.food.type];
        const boosted = event.mult > 1;
        addFx({
          kind: "ring",
          x: event.food.x,
          y: event.food.y,
          life: 0.38,
          color: style.color,
        });
        addFx({
          kind: "pop",
          x: event.food.x,
          y: event.food.y,
          life: 0.7,
          color: boosted ? MULT_COLOR[event.mult] : style.color,
          label: boosted ? `+${event.gain} x${event.mult}` : `+${event.gain}`,
        });

        if (boosted) {
          sfx.combo(event.mult);
          k.shake(2 + event.mult);
        } else if (event.food.type === FOOD.BONE) {
          sfx.bone();
          k.shake(4);
        } else {
          sfx[event.food.type]();
        }
        buzz(event.food.type === FOOD.BONE ? 40 : 12);
      }

      if (event.type === "die") {
        addFx({
          kind: "flash",
          x: clamp(event.cell.x, 0, COLS - 1),
          y: clamp(event.cell.y, 0, ROWS - 1),
          life: 0.8,
          color: C.danger,
        });
        k.shake(16);
        sfx.die();
        buzz(140);
        finish();
      }
    }
  }

  // ------------------------------------------------------------------- input

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

  const joyCenter = () => k.vec2(JOY.x, JOY.y);
  const hitJoy = (pos) => pos.dist(joyCenter()) <= JOY.r + 20;

  function steerFromVec(vx, vy) {
    if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return;
    if (Math.abs(vx) > Math.abs(vy)) steer(Math.sign(vx), 0);
    else steer(0, Math.sign(vy));
  }

  function pullJoy(pos) {
    const delta = pos.sub(joyCenter());
    const len = delta.len();
    if (len < JOY.dead) {
      joyPull = k.vec2(0, 0);
      return;
    }
    joyPull = delta.unit().scale(Math.min(len, JOY.r - 8));
    steerFromVec(joyPull.x, joyPull.y);
  }

  k.onMouseDown(() => {
    resumeAudio();
    if (ignoreInput > 0 || paused) return;
    const pos = k.mousePos();
    if (hitJoy(pos)) {
      joyActive = true;
      swipe = null;
      pullJoy(pos);
      return;
    }
    swipe = pos;
  });

  k.onMouseRelease(() => {
    if (joyActive) {
      joyActive = false;
      joyPull = k.vec2(0, 0);
      swipe = null;
      return;
    }
    if (ignoreInput > 0 || paused || !swipe) {
      swipe = null;
      return;
    }
    const d = k.mousePos().sub(swipe);
    swipe = null;
    if (d.len() < 20) return;
    steerFromVec(d.x, d.y);
  });

  // ------------------------------------------------------------------ update

  k.onUpdate(() => {
    const dt = k.dt();
    ignoreInput = Math.max(0, ignoreInput - dt);

    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].t += dt;
      if (fx[i].t >= fx[i].life) fx.splice(i, 1);
    }

    if (wentAway) {
      wentAway = false;
      showPause();
    }
    if (paused || !state.alive) return;

    if (ignoreInput === 0 && joyActive && k.isMouseDown()) pullJoy(k.mousePos());
    handle(tick(state, dt));
  });

  // -------------------------------------------------------------------- draw

  function drawBoard() {
    const frame = { pos: k.vec2(OX - 6, OY - 6), width: BOARD_W + 12, height: BOARD_H + 12, radius: 16 };
    k.drawRect({ ...frame, color: k.rgb(6, 10, 9) });
    k.drawRect({
      ...frame,
      fill: false,
      outline: { width: 3, color: state.wrapLeft > 0 ? C.pepper : C.line },
    });

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        k.drawRect({
          pos: cellOrigin(x, y),
          width: CELL,
          height: CELL,
          color: (x + y) % 2 === 1 ? C.cellA : C.cellB,
        });
      }
    }
    for (let x = 0; x <= COLS; x++) {
      k.drawLine({
        p1: k.vec2(OX + x * CELL, OY),
        p2: k.vec2(OX + x * CELL, OY + BOARD_H),
        width: 1,
        color: C.line,
      });
    }
    for (let y = 0; y <= ROWS; y++) {
      k.drawLine({
        p1: k.vec2(OX, OY + y * CELL),
        p2: k.vec2(OX + BOARD_W, OY + y * CELL),
        width: 1,
        color: C.line,
      });
    }
  }

  function drawSnake() {
    const t = state.alive ? ease(stepProgress(state)) : 1;
    const rushing = state.voltLeft > 0;

    for (let i = state.snake.length - 1; i >= 0; i--) {
      const to = state.snake[i];
      const from = state.prevSnake[i] || to;
      const jumped = Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1;
      const px = jumped ? to.x : from.x + (to.x - from.x) * t;
      const py = jumped ? to.y : from.y + (to.y - from.y) * t;
      const p = k.vec2(OX + px * CELL, OY + py * CELL);
      const isHead = i === 0;
      const pad = isHead ? 3 : 4;

      let body = i % 2 === 0 ? C.mint : C.mintDim;
      if (isHead) body = C.mintHi;
      else if (rushing) body = i % 2 === 0 ? C.mintHi : C.mint;

      const cell = {
        pos: p.add(pad, pad),
        width: CELL - pad * 2,
        height: CELL - pad * 2,
        radius: 6,
      };
      k.drawRect({ ...cell, color: body });
      k.drawRect({
        ...cell,
        fill: false,
        outline: { width: 2, color: C.mintDeep },
      });

      if (isHead) {
        const c = p.add(CELL / 2, CELL / 2);
        const ox = state.dir.x * 4;
        const oy = state.dir.y * 4;
        for (const side of [1, -1]) {
          k.drawCircle({
            pos: c.add(ox - state.dir.y * 4 * side, oy + state.dir.x * 4 * side),
            radius: 2.4,
            color: C.bg,
          });
        }
      }
    }
  }

  function drawFx() {
    for (const e of fx) {
      const at = cellCenter(e.x, e.y);
      const p = e.t / e.life;

      if (e.kind === "ring") {
        k.drawCircle({
          pos: at,
          radius: 8 + 22 * ease(p),
          fill: false,
          opacity: 1 - p,
          outline: { width: 3, color: e.color },
        });
      }

      if (e.kind === "pop") {
        k.drawText({
          text: e.label,
          font: FONT,
          size: 19,
          pos: at.add(0, -10 - 34 * ease(p)),
          anchor: "center",
          color: e.color,
          opacity: 1 - p * p,
        });
      }

      if (e.kind === "flash") {
        k.drawRect({
          pos: cellOrigin(e.x, e.y),
          width: CELL,
          height: CELL,
          radius: 4,
          color: e.color,
          opacity: 0.85 * (1 - p),
        });
      }
    }
  }

  function drawHud() {
    k.drawText({
      text: String(state.score),
      font: FONT,
      size: 30,
      pos: k.vec2(32, 98),
      color: C.mint,
    });
    k.drawText({
      text: state.mode === "daily" ? `DAILY #${day}` : `BEST ${best}`,
      font: FONT,
      size: 14,
      pos: k.vec2(32, 128),
      color: C.mute,
    });

    // Live chips, so the HUD can never claim a boost that has already expired.
    const chips = [];
    if (state.voltLeft > 0) chips.push(["VOLT", state.voltLeft / VOLT_TIME, C.volt]);
    if (state.wrapLeft > 0) chips.push(["PHASE", state.wrapLeft / WRAP_TIME, C.pepper]);

    chips.forEach(([text, frac, color], i) => {
      const x = W - 32 - 96;
      const y = 96 + i * 32;
      k.drawRect({
        pos: k.vec2(x, y),
        width: 96,
        height: 26,
        radius: 13,
        color: C.panel,
        outline: { width: 2, color },
      });
      k.drawText({
        text,
        font: FONT,
        size: 13,
        pos: k.vec2(x + 48, y + 10),
        anchor: "center",
        color,
      });
      k.drawRect({
        pos: k.vec2(x + 6, y + 19),
        width: (96 - 12) * frac,
        height: 3,
        radius: 1.5,
        color,
      });
    });
  }

  function drawComboBar() {
    const y = 784;
    const mult = comboMult(state.combo);
    const color = MULT_COLOR[Math.min(mult, MULT_COLOR.length - 1)];
    const frac = state.comboLeft / COMBO_WINDOW;

    k.drawRect({
      pos: k.vec2(32, y),
      width: 476,
      height: 14,
      radius: 7,
      color: C.panel,
      outline: { width: 2, color: C.line },
    });
    if (frac > 0) {
      k.drawRect({
        pos: k.vec2(34, y + 2),
        width: (476 - 4) * frac,
        height: 10,
        radius: 5,
        color,
      });
    }
    k.drawText({
      text: state.combo > 0 ? `CHAIN ${state.combo}  ·  x${mult}` : "CHAIN  —",
      font: FONT,
      size: 14,
      pos: k.vec2(32, y + 22),
      color: state.combo > 0 ? color : C.mute,
    });
    k.drawText({
      text: `${(1 / stepInterval(state)).toFixed(1)} cells/s`,
      font: FONT,
      size: 14,
      pos: k.vec2(508, y + 22),
      anchor: "topright",
      color: state.voltLeft > 0 ? C.volt : C.mute,
    });
  }

  function drawJoystick() {
    const base = joyCenter();
    k.drawCircle({ pos: base, radius: JOY.r, color: k.rgb(12, 20, 17) });
    k.drawCircle({
      pos: base,
      radius: JOY.r,
      fill: false,
      outline: { width: 3, color: joyActive ? C.mint : C.line },
    });
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      k.drawCircle({
        pos: base.add(dx * 42, dy * 42),
        radius: 3,
        color: C.mintDim,
      });
    }
    k.drawCircle({
      pos: base.add(joyPull),
      radius: JOY.knob,
      color: joyActive ? C.mintHi : C.mint,
    });
    k.drawCircle({
      pos: base.add(joyPull),
      radius: JOY.knob,
      fill: false,
      outline: { width: 2, color: C.mintDeep },
    });
  }

  k.onDraw(() => {
    drawBoard();
    for (const food of state.foods) {
      const phase = food.x * 7 + food.y * 13;
      drawSnack(
        food.type,
        cellCenter(food.x, food.y),
        1 + 0.05 * Math.sin(k.time() * 5 + phase),
      );
    }
    drawSnake();
    drawFx();
    drawHud();
    drawComboBar();
    drawJoystick();
    if (paused) drawPauseOverlay();
  });
});

// ----------------------------------------------------------------- over scene

k.scene("over", ({ run, best, isRecord, day }) => {
  drawChrome("GAME OVER");
  muteButton(W - 92, 32);

  const replay = () =>
    k.go("game", {
      mode: run.mode,
      seed: run.mode === "daily" ? dailySeed() : randomSeed(),
    });

  k.add([
    k.text(run.mode === "daily" ? `DAILY  ·  DAY #${day}` : "CLASSIC", {
      size: 16,
      font: FONT,
    }),
    k.pos(W / 2, 172),
    k.anchor("center"),
    k.color(C.mute),
  ]);
  k.add([
    k.text(String(run.score), { size: 88, font: FONT }),
    k.pos(W / 2, 258),
    k.anchor("center"),
    k.color(isRecord ? C.volt : C.mint),
  ]);

  if (isRecord) {
    k.add([
      k.rect(200, 40, { radius: 20 }),
      k.pos(W / 2 - 100, 316),
      k.color(C.volt),
    ]);
    k.add([
      k.text("NEW BEST", { size: 18, font: FONT }),
      k.pos(W / 2, 336),
      k.anchor("center"),
      k.color(C.bg),
    ]);
  } else {
    k.add([
      k.text(`BEST  ${best}`, { size: 22, font: FONT }),
      k.pos(W / 2, 336),
      k.anchor("center"),
      k.color(C.mute),
    ]);
  }

  k.add([
    k.rect(476, 116, { radius: 22 }),
    k.pos(32, 392),
    k.color(C.panel),
    k.outline(3, C.line),
  ]);
  ORDER.forEach((type, i) => {
    k.add([
      k.text(String(run.eaten[type]), { size: 22, font: FONT }),
      k.pos(88 + i * 120, 470),
      k.anchor("center"),
      k.color(run.eaten[type] > 0 ? C.ink : C.mute),
    ]);
  });

  k.add([
    k.text(
      `BEST CHAIN ${run.bestCombo} · x${comboMult(run.bestCombo)}      ALIVE ${Math.round(run.elapsed)}s`,
      { size: 15, font: FONT },
    ),
    k.pos(W / 2, 542),
    k.anchor("center"),
    k.color(C.mute),
  ]);

  const text = shareText(run, {
    day,
    isRecord,
    url: window.location.href.split(/[?#]/)[0],
  });
  const share = button({
    y: 590,
    h: 64,
    label: "SHARE RESULT",
    size: 18,
    fill: C.panel,
    ink: C.mintHi,
    outline: C.line,
    onPress: async () => {
      share.text.text = await copyOrShare(text);
    },
  });

  button({ y: 674, h: 80, label: "PLAY AGAIN", size: 22, onPress: replay });
  button({
    y: 774,
    h: 64,
    label: "MENU",
    size: 18,
    fill: C.panel,
    ink: C.ink,
    outline: C.line,
    onPress: () => k.go("menu"),
  });

  k.add([
    k.text("SPACE replay   ·   M menu", { size: 14, font: FONT }),
    k.pos(W / 2, 868),
    k.anchor("center"),
    k.color(C.mintDim),
  ]);

  k.onDraw(() => {
    ORDER.forEach((type, i) => drawSnack(type, k.vec2(88 + i * 120, 430), 0.9));
  });

  k.onKeyPress("space", replay);
  k.onKeyPress("enter", replay);
  k.onKeyPress("m", () => k.go("menu"));
  k.onKeyPress("escape", () => k.go("menu"));
});

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

k.onLoad(() => {
  const start = () => k.go("menu");
  if (document.fonts?.ready) {
    document.fonts.ready.then(start, start);
    return;
  }
  start();
});
