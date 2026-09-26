import kaplay from "kaplay";

const BEST_KEY = "sullen-mint-snake-best";

const k = kaplay({
  global: false,
  width: 420,
  height: 720,
  letterbox: true,
  background: [8, 8, 8],
  font: "sans-serif",
  touchToMouse: true,
});

const CELL = 20;
const COLS = 19;
const ROWS = 22;
const OX = (420 - COLS * CELL) / 2;
const OY = 118;

const C = {
  mint: k.rgb(10, 184, 118),
  mintDim: k.rgb(8, 92, 64),
  ink: k.rgb(249, 249, 249),
  mute: k.rgb(120, 128, 124),
  panel: k.rgb(16, 16, 16),
  line: k.rgb(32, 36, 34),
  apple: k.rgb(254, 113, 106),
  energy: k.rgb(245, 197, 24),
  pepper: k.rgb(255, 90, 40),
  bone: k.rgb(210, 214, 218),
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

function cellCenter(x, y) {
  return k.vec2(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2);
}

function drawChrome(title) {
  k.add([
    k.rect(420, 720),
    k.pos(0, 0),
    k.color(8, 8, 8),
    k.fixed(),
  ]);
  k.add([
    k.text("SULLEN STUDIO", { size: 11, font: "sans-serif" }),
    k.pos(24, 22),
    k.color(C.mute),
    k.fixed(),
  ]);
  k.add([
    k.text(title, { size: 28, font: "sans-serif" }),
    k.pos(24, 40),
    k.color(C.ink),
    k.fixed(),
  ]);
}

k.scene("menu", () => {
  drawChrome("MINT SNAKE");

  k.add([
    k.rect(372, 220, { radius: 18 }),
    k.pos(24, 96),
    k.color(C.panel),
    k.outline(2, C.line),
  ]);

  [
    ["Apple", "grow + 10"],
    ["Volt", "faster for 4s"],
    ["Pepper", "wrap walls 2s"],
    ["Bone", "lose 2 segments"],
  ].forEach((row, i) => {
    const food = FOODS[i];
    k.add([
      k.circle(7),
      k.pos(52, 132 + i * 44),
      k.color(food.color),
    ]);
    k.add([
      k.text(row[0].toUpperCase(), { size: 16 }),
      k.pos(74, 122 + i * 44),
      k.color(C.ink),
    ]);
    k.add([
      k.text(row[1], { size: 13 }),
      k.pos(74, 142 + i * 44),
      k.color(C.mute),
    ]);
  });

  k.add([
    k.text(`BEST  ${readBest()}`, { size: 18 }),
    k.pos(24, 340),
    k.color(C.mint),
  ]);

  k.add([
    k.text("Combo every 3 snacks = x2 burst.", { size: 14, width: 360 }),
    k.pos(24, 372),
    k.color(C.mute),
  ]);

  const cta = k.add([
    k.rect(372, 64, { radius: 16 }),
    k.pos(24, 620),
    k.color(C.mint),
    k.area(),
  ]);
  k.add([
    k.text("TAP / SPACE  START", { size: 18 }),
    k.pos(210, 652),
    k.anchor("center"),
    k.color(8, 8, 8),
  ]);

  const start = () => k.go("game");
  k.onKeyPress("space", start);
  k.onKeyPress("enter", start);
  cta.onClick(start);
  k.onMousePress(start);
});

k.scene("game", () => {
  drawChrome("MINT SNAKE");

  let snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = spawnFood(snake);
  let score = 0;
  let combo = 0;
  let alive = true;
  let wrapLeft = 0;
  let speedLeft = 0;
  let step = 0.14;
  let acc = 0;

  const scoreText = k.add([
    k.text("0", { size: 22 }),
    k.pos(24, 78),
    k.color(C.mint),
    k.fixed(),
  ]);
  const statusText = k.add([
    k.text("EAT", { size: 13 }),
    k.pos(396, 82),
    k.anchor("right"),
    k.color(C.mute),
    k.fixed(),
  ]);

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if ((x + y) % 2 === 0) {
        k.add([
          k.rect(CELL, CELL),
          k.pos(OX + x * CELL, OY + y * CELL),
          k.color(14, 16, 15),
        ]);
      }
    }
  }

  k.add([
    k.rect(COLS * CELL + 4, ROWS * CELL + 4, { radius: 8 }),
    k.pos(OX - 2, OY - 2),
    k.outline(2, C.line),
    k.color(0, 0, 0, 0),
  ]);

  function occupied(list, x, y) {
    return list.some((p) => p.x === x && p.y === y);
  }

  function spawnFood(body) {
    for (let i = 0; i < 80; i++) {
      const x = k.randi(0, COLS);
      const y = k.randi(0, ROWS);
      if (!occupied(body, x, y)) {
        return { x, y, ...FOODS[Math.floor(Math.random() * FOODS.length)] };
      }
    }
    return { x: 10, y: 10, ...FOODS[0] };
  }

  function setDir(x, y) {
    if (dir.x + x === 0 && dir.y + y === 0) return;
    nextDir = { x, y };
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
    swipe = k.mousePos();
  });
  k.onMouseRelease(() => {
    if (!swipe) return;
    const d = k.mousePos().sub(swipe);
    swipe = null;
    if (d.len() < 24) return;
    if (Math.abs(d.x) > Math.abs(d.y)) setDir(Math.sign(d.x), 0);
    else setDir(0, Math.sign(d.y));
  });

  function die() {
    if (!alive) return;
    alive = false;
    const best = writeBest(score);
    k.wait(0.35, () => k.go("over", { score, best }));
  }

  function applyFood(kind) {
    combo += 1;
    let gain = 10;
    if (kind === "energy") {
      step = 0.07;
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
      statusText.color = C.mint;
    }
    score += gain;
    scoreText.text = String(score);
  }

  k.onUpdate(() => {
    if (!alive) return;
    wrapLeft = Math.max(0, wrapLeft - k.dt());
    speedLeft = Math.max(0, speedLeft - k.dt());
    if (speedLeft === 0) step = 0.14;
    acc += k.dt();
    if (acc < step) return;
    acc = 0;
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
      if (ate !== "bone") {
        // keep extra segment (growth). bone already shrinks.
      }
      if (ate === "apple" || ate === "energy" || ate === "pepper") {
        // grew by not popping
      } else {
        snake.pop();
      }
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
    for (let i = snake.length - 1; i >= 0; i--) {
      const p = cellCenter(snake[i].x, snake[i].y);
      const s = i === 0 ? CELL - 4 : CELL - 6;
      k.drawRect({
        pos: p.sub(s / 2, s / 2),
        width: s,
        height: s,
        radius: 4,
        color: i === 0 ? C.mint : C.mintDim,
      });
    }

    const f = cellCenter(food.x, food.y);
    k.drawCircle({
      pos: f,
      radius: 6,
      color: food.color,
    });
  });
});

k.scene("over", ({ score, best }) => {
  drawChrome("GAME OVER");
  k.add([
    k.text(String(score), { size: 64 }),
    k.pos(210, 280),
    k.anchor("center"),
    k.color(C.mint),
  ]);
  k.add([
    k.text(`BEST  ${best}`, { size: 18 }),
    k.pos(210, 348),
    k.anchor("center"),
    k.color(C.mute),
  ]);

  const again = k.add([
    k.rect(372, 64, { radius: 16 }),
    k.pos(24, 540),
    k.color(C.mint),
    k.area(),
  ]);
  k.add([
    k.text("AGAIN", { size: 18 }),
    k.pos(210, 572),
    k.anchor("center"),
    k.color(8, 8, 8),
  ]);
  const home = k.add([
    k.rect(372, 56, { radius: 16 }),
    k.pos(24, 616),
    k.outline(2, C.line),
    k.color(C.panel),
    k.area(),
  ]);
  k.add([
    k.text("MENU", { size: 16 }),
    k.pos(210, 644),
    k.anchor("center"),
    k.color(C.ink),
  ]);

  again.onClick(() => k.go("game"));
  home.onClick(() => k.go("menu"));
  k.onKeyPress("space", () => k.go("game"));
  k.onKeyPress("enter", () => k.go("game"));
});

k.go("menu");
