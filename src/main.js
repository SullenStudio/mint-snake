import kaplay from "kaplay";
import outfitUrl from "./assets/Outfit-Bold.ttf?url";

const BEST_KEY = "sullen-mint-snake-best";
const W = 540;
const H = 960;
const CELL = 28;
const COLS = 17;
const ROWS = 22;
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

const C = {
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
  apple: k.rgb(255, 107, 99),
  energy: k.rgb(245, 197, 24),
  pepper: k.rgb(255, 92, 38),
  bone: k.rgb(226, 230, 232),
};

const FOODS = [
  { type: "apple", label: "APPLE", hint: "+grow", color: C.apple },
  { type: "energy", label: "VOLT", hint: "speed", color: C.energy },
  { type: "pepper", label: "PEPPER", hint: "wrap", color: C.pepper },
  { type: "bone", label: "BONE", hint: "shrink", color: C.bone },
];

function readBest() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

function writeBest(score) {
  const best = Math.max(readBest(), score);
  localStorage.setItem(BEST_KEY, String(best));
  return best;
}

function cellOrigin(x, y) {
  return k.vec2(OX + x * CELL, OY + y * CELL);
}

function cellCenter(x, y) {
  return cellOrigin(x, y).add(CELL / 2, CELL / 2);
}

function drawChrome(title) {
  k.add([k.rect(W, H), k.pos(0, 0), k.color(9, 12, 11), k.fixed()]);
  k.add([
    k.text("SULLEN STUDIO", { size: 16, font: FONT }),
    k.pos(32, 28),
    k.color(C.mute),
    k.fixed(),
  ]);
  k.add([
    k.text(title, { size: 40, font: FONT }),
    k.pos(32, 52),
    k.color(C.ink),
    k.fixed(),
  ]);
}

function startGame() {
  k.go("game");
}

k.scene("menu", () => {
  drawChrome("MINT SNAKE");

  k.add([
    k.rect(476, 268, { radius: 22 }),
    k.pos(32, 128),
    k.color(C.panel),
    k.outline(3, C.line),
  ]);

  [
    ["Apple", "grow  +10"],
    ["Volt", "faster  4s"],
    ["Pepper", "wrap walls  2s"],
    ["Bone", "lose 2 segments"],
  ].forEach((row, i) => {
    const food = FOODS[i];
    k.add([k.circle(9), k.pos(68, 174 + i * 54), k.color(food.color)]);
    k.add([
      k.circle(9),
      k.pos(68, 174 + i * 54),
      k.outline(3, k.rgb(9, 12, 11)),
      k.color(food.color),
    ]);
    k.add([
      k.text(row[0].toUpperCase(), { size: 20, font: FONT }),
      k.pos(92, 160 + i * 54),
      k.color(C.ink),
    ]);
    k.add([
      k.text(row[1], { size: 16, font: FONT }),
      k.pos(92, 184 + i * 54),
      k.color(C.mute),
    ]);
  });

  k.add([
    k.text(`BEST   ${readBest()}`, { size: 22, font: FONT }),
    k.pos(32, 424),
    k.color(C.mint),
  ]);
  k.add([
    k.text("Combo every 3 snacks = x2 burst.", {
      size: 16,
      font: FONT,
      width: 460,
    }),
    k.pos(32, 460),
    k.color(C.mute),
  ]);
  k.add([
    k.text("Phone: use the stick under the grid.", {
      size: 16,
      font: FONT,
      width: 460,
    }),
    k.pos(32, 490),
    k.color(C.mute),
  ]);

  const cta = k.add([
    k.rect(476, 72, { radius: 20 }),
    k.pos(32, 832),
    k.color(C.mint),
    k.area(),
  ]);
  k.add([
    k.text("TAP  /  SPACE   START", { size: 18, font: FONT }),
    k.pos(W / 2, 868),
    k.anchor("center"),
    k.color(9, 12, 11),
  ]);

  k.onKeyPress("space", startGame);
  k.onKeyPress("enter", startGame);
  cta.onClick(startGame);
});

function ease(t) {
  return t * t * (3 - 2 * t);
}

function copyBody(body) {
  return body.map((p) => ({ x: p.x, y: p.y }));
}

k.scene("game", () => {
  drawChrome("MINT SNAKE");

  let snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  let fromSnake = copyBody(snake);
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = spawnFood(snake);
  let score = 0;
  let combo = 0;
  let alive = true;
  let wrapLeft = 0;
  let speedLeft = 0;
  let step = 0.16;
  let acc = 0;
  let joyActive = false;
  let joyPull = k.vec2(0, 0);
  let ignorePad = 0.45;
  let primed = false;

  k.add([
    k.text("0", { size: 26, font: FONT }),
    k.pos(32, 112),
    k.color(C.mint),
    k.fixed(),
    "score",
  ]);
  k.add([
    k.text("STEER", { size: 16, font: FONT }),
    k.pos(W - 32, 116),
    k.anchor("right"),
    k.color(C.mint),
    k.fixed(),
    "status",
  ]);

  const scoreText = k.get("score")[0];
  const statusText = k.get("status")[0];

  function occupied(list, x, y) {
    return list.some((p) => p.x === x && p.y === y);
  }

  function spawnFood(body) {
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!occupied(body, x, y)) {
        return { x, y, ...FOODS[Math.floor(Math.random() * FOODS.length)] };
      }
    }
    return { x: 8, y: 8, ...FOODS[0] };
  }

  function setDir(x, y) {
    if (primed && dir.x + x === 0 && dir.y + y === 0) return;
    nextDir = { x, y };
    if (!primed) {
      primed = true;
      if (statusText.text === "STEER") {
        statusText.text = "EAT";
        statusText.color = C.mute;
      }
    }
  }

  function joyCenter() {
    return k.vec2(JOY.x, JOY.y);
  }

  function hitJoy(pos) {
    return pos.dist(joyCenter()) <= JOY.r + 20;
  }

  function steerFromVec(vx, vy) {
    if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return;
    if (Math.abs(vx) > Math.abs(vy)) setDir(Math.sign(vx), 0);
    else setDir(0, Math.sign(vy));
  }

  function pullJoy(pos) {
    const delta = pos.sub(joyCenter());
    const len = delta.len();
    if (len < JOY.dead) {
      joyPull = k.vec2(0, 0);
      return;
    }
    const clamped = Math.min(len, JOY.r - 8);
    joyPull = delta.unit().scale(clamped);
    steerFromVec(joyPull.x, joyPull.y);
  }

  k.onKeyPress("left", () => setDir(-1, 0));
  k.onKeyPress("right", () => setDir(1, 0));
  k.onKeyPress("up", () => setDir(0, -1));
  k.onKeyPress("down", () => setDir(0, 1));
  k.onKeyPress("a", () => setDir(-1, 0));
  k.onKeyPress("d", () => setDir(1, 0));
  k.onKeyPress("w", () => setDir(0, -1));
  k.onKeyPress("s", () => setDir(0, 1));

  let swipe = null;
  k.onMouseDown(() => {
    if (ignorePad > 0) return;
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
    if (ignorePad > 0 || !swipe) {
      swipe = null;
      return;
    }
    const d = k.mousePos().sub(swipe);
    swipe = null;
    if (d.len() < 20) return;
    steerFromVec(d.x, d.y);
  });

  function die() {
    if (!alive) return;
    alive = false;
    const best = writeBest(score);
    k.wait(0.28, () => k.go("over", { score, best }));
  }

  function applyFood(kind) {
    combo += 1;
    let gain = 10;
    if (kind === "energy") {
      step = 0.08;
      speedLeft = 4;
      statusText.text = "VOLT";
      statusText.color = C.energy;
    } else if (kind === "pepper") {
      wrapLeft = 2;
      statusText.text = "WRAP";
      statusText.color = C.pepper;
    } else if (kind === "bone") {
      if (snake.length > 3) snake.pop();
      if (snake.length > 3) snake.pop();
      gain = 5;
      statusText.text = "BONE";
      statusText.color = C.bone;
    } else {
      statusText.text = "GROW";
      statusText.color = C.apple;
    }
    if (combo > 0 && combo % 3 === 0) {
      gain *= 2;
      statusText.text = "COMBO x2";
      statusText.color = C.mintHi;
    }
    score += gain;
    scoreText.text = String(score);
  }

  k.onUpdate(() => {
    const dt = k.dt();
    ignorePad = Math.max(0, ignorePad - dt);
    if (ignorePad === 0 && joyActive && k.isMouseDown()) pullJoy(k.mousePos());
    if (!alive || !primed) return;
    wrapLeft = Math.max(0, wrapLeft - dt);
    speedLeft = Math.max(0, speedLeft - dt);
    if (speedLeft === 0) step = 0.16;
    acc += dt;
    if (acc < step) return;
    acc -= step;
    fromSnake = copyBody(snake);
    dir = nextDir;

    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;
    const wrapping = wrapLeft > 0;

    if (wrapping) {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      die();
      return;
    }

    if (occupied(snake, nx, ny)) {
      die();
      return;
    }

    snake.unshift({ x: nx, y: ny });
    if (nx === food.x && ny === food.y) {
      const ate = food.type;
      if (ate === "bone") snake.pop();
      applyFood(ate);
      food = spawnFood(snake);
    } else {
      snake.pop();
    }

    if (wrapLeft === 0 && statusText.text === "WRAP") {
      statusText.text = "EAT";
      statusText.color = C.mute;
    }
  });

  k.onDraw(() => {
    k.drawRect({
      pos: k.vec2(OX - 6, OY - 6),
      width: BOARD_W + 12,
      height: BOARD_H + 12,
      radius: 16,
      color: k.rgb(6, 10, 9),
    });
    k.drawRect({
      pos: k.vec2(OX - 6, OY - 6),
      width: BOARD_W + 12,
      height: BOARD_H + 12,
      radius: 16,
      fill: false,
      outline: { width: 3, color: C.line },
    });

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const odd = (x + y) % 2 === 1;
        k.drawRect({
          pos: cellOrigin(x, y),
          width: CELL,
          height: CELL,
          color: odd ? C.cellA : C.cellB,
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

    const t = alive ? ease(Math.min(1, acc / step)) : 1;

    for (let i = snake.length - 1; i >= 0; i--) {
      const to = snake[i];
      const from = fromSnake[i] || to;
      const wrapped = Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1;
      const px = wrapped ? to.x : from.x + (to.x - from.x) * t;
      const py = wrapped ? to.y : from.y + (to.y - from.y) * t;
      const p = k.vec2(OX + px * CELL, OY + py * CELL);
      const pad = i === 0 ? 3 : 4;
      const isHead = i === 0;
      k.drawRect({
        pos: p.add(pad, pad),
        width: CELL - pad * 2,
        height: CELL - pad * 2,
        radius: 6,
        color: isHead ? C.mintHi : i % 2 === 0 ? C.mint : C.mintDim,
      });
      k.drawRect({
        pos: p.add(pad, pad),
        width: CELL - pad * 2,
        height: CELL - pad * 2,
        radius: 6,
        fill: false,
        outline: { width: 2, color: C.mintDeep },
      });
      if (isHead) {
        const c = p.add(CELL / 2, CELL / 2);
        const ox = dir.x * 4;
        const oy = dir.y * 4;
        k.drawCircle({
          pos: c.add(ox - dir.y * 4, oy + dir.x * 4),
          radius: 2.4,
          color: k.rgb(9, 12, 11),
        });
        k.drawCircle({
          pos: c.add(ox + dir.y * 4, oy - dir.x * 4),
          radius: 2.4,
          color: k.rgb(9, 12, 11),
        });
      }
    }

    const f = cellCenter(food.x, food.y);
    k.drawCircle({
      pos: f,
      radius: 9,
      color: k.rgb(9, 12, 11),
    });
    k.drawCircle({
      pos: f,
      radius: 7,
      color: food.color,
    });

    const base = joyCenter();
    k.drawCircle({
      pos: base,
      radius: JOY.r,
      color: k.rgb(12, 20, 17),
    });
    k.drawCircle({
      pos: base,
      radius: JOY.r,
      fill: false,
      outline: { width: 3, color: joyActive ? C.mint : C.line },
    });
    [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ].forEach(([dx, dy]) => {
      k.drawCircle({
        pos: base.add(dx * 36, dy * 36),
        radius: 3,
        color: C.mintDim,
      });
    });
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
  });
});

k.scene("over", ({ score, best }) => {
  drawChrome("GAME OVER");
  k.add([
    k.text(String(score), { size: 88, font: FONT }),
    k.pos(W / 2, 360),
    k.anchor("center"),
    k.color(C.mint),
  ]);
  k.add([
    k.text(`BEST   ${best}`, { size: 22, font: FONT }),
    k.pos(W / 2, 444),
    k.anchor("center"),
    k.color(C.mute),
  ]);

  const again = k.add([
    k.rect(476, 72, { radius: 20 }),
    k.pos(32, 748),
    k.color(C.mint),
    k.area(),
  ]);
  k.add([
    k.text("AGAIN", { size: 22, font: FONT }),
    k.pos(W / 2, 784),
    k.anchor("center"),
    k.color(9, 12, 11),
  ]);
  const home = k.add([
    k.rect(476, 64, { radius: 20 }),
    k.pos(32, 836),
    k.color(C.panel),
    k.outline(3, C.line),
    k.area(),
  ]);
  k.add([
    k.text("MENU", { size: 18, font: FONT }),
    k.pos(W / 2, 868),
    k.anchor("center"),
    k.color(C.ink),
  ]);

  again.onClick(() => k.go("game"));
  home.onClick(() => k.go("menu"));
  k.onKeyPress("space", () => k.go("game"));
  k.onKeyPress("enter", () => k.go("game"));
});

k.onLoad(() => {
  const start = () => k.go("menu");
  if (document.fonts?.ready) {
    document.fonts.ready.then(start, start);
    return;
  }
  start();
});
