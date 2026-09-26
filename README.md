# Mint Snake

Arcade snake for [Sullen Studio](https://github.com/SullenStudio). Dark mint grid,
four snacks on the board at once, and a chain multiplier that punishes hesitation.

Built with [Kaplay](https://kaplayjs.com). Visual vibe referenced from Dribbble/Behance
(we drew our own shapes — no ripped assets).

## Play

```bash
npm install
npm run dev
```

**Move:** arrows / WASD / swipe, or the direction pad under the grid on phone.
**Pause:** `P` or `Esc`.

| Snack | Shape | Effect |
| --- | --- | --- |
| Apple | circle | grow by 1, 10 pts |
| Volt | bolt | grow + 4s speed rush, 15 pts |
| Portal | ring | grow + 3s of no walls, 10 pts |
| Bone | bone | −2 length, breaks the chain, 5 pts |

Shape carries the meaning, not just colour. The portal used to be a pepper —
testers read the orange triangle as a carrot, and no vegetable suggests
"walk through walls". A ring you can see through does.

In-game the rules live on their own **HOW TO PLAY** screen, reachable from the
menu or with `H`.

Three snacks sit on the board at once and at least one is always an apple, so
which one you go for is a decision rather than a coin flip.

**Chain:** bite again within 3.2s and the chain grows — x2 at 3, x3 at 6, x4 at 9.
Let the timer run out, or eat a bone, and it resets.

**Speed:** the step interval shrinks as the snake grows, from 0.18s down to 0.085s.

**Daily challenge:** the board is seeded from the UTC date, so everyone gets the
same run on the same day, with its own best score.

**Themes:** five neon palettes (mint, ice, amber, magenta, toxic), picked on the
menu and remembered. Only the accent changes — snack colours stay fixed so they
stay learnable.

Best scores live in `localStorage` (and the game still runs if that is blocked).

## Layout

```
src/
  game/              pure rules — no kaplay, no DOM, no wall clock
    logic.js         step, collisions, snacks, chain, difficulty curve
    rng.js           seeded PRNG + daily seed / day number
    storage.js       localStorage wrapper that never throws
    share.js         the one-line result brag
  ui/
    theme.js         palette, colour ramps, neon glow primitives
    layout.js        screen and board geometry
    snacks.js        snack glyphs
    controls.js      the direction pad: geometry, hit testing, drawing
    widgets.js       buttons, drifting background, wordmark
  scenes/            menu.js, help.js, game.js, over.js
  audio.js           synthesised blips (no audio assets)
  main.js            kaplay init and scene registration
tests/               vitest, covering src/game and the pure parts of src/ui
```

`scenes/` and `ui/` own pixels and input only. Everything that decides what
happens in a run lives in `src/game/logic.js`, drives off an injected `dt`, and
emits events (`eat`, `die`, `comboLost`) that a scene turns into sound and
effects.

kaplay has no blur, so the neon glow is layered translucent copies of a shape
(`theme.glowLayers`) rather than a shader.

Two kaplay input quirks are worked around in `scenes/game.js`: `onMouseDown`
fires while a pointer is *held*, not on press, so fast taps were dropped
entirely; and the touch-to-mouse emulation loses `mouseRelease` when `touchmove`
events came in between, so swipes never completed. Input listens on the mouse
and touch APIs both, with a gesture flag making the pair idempotent.

## Test

```bash
npm test
npm run test:watch
```

## Build

```bash
npm run build
```

Static files land in `dist/` (GitHub Pages friendly, `base: ./`). CI runs the
tests before it builds.

## Refs

- https://dribbble.com/shots/15700123-Snake-play
- https://dribbble.com/shots/20285709--Snake-Hyper-Casual-Mobile-Game-Design
