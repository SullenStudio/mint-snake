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

**Move:** arrows / WASD / swipe, or the stick under the grid on phone.
**Pause:** `P` or `Esc`.

| Snack | Shape | Effect |
| --- | --- | --- |
| Apple | circle | grow, 10 pts |
| Volt | bolt | 4s speed rush, 15 pts |
| Pepper | triangle | 3s phase through walls, 10 pts |
| Bone | bone | −2 length, breaks the chain, 5 pts |

Three snacks sit on the board at once and at least one is always an apple, so
which one you go for is a decision rather than a coin flip.

**Chain:** bite again within 3.2s and the chain grows — x2 at 3, x3 at 6, x4 at 9.
Let the timer run out, or eat a bone, and it resets.

**Speed:** the step interval shrinks as the snake grows, from 0.18s down to 0.085s.

**Daily challenge:** the board is seeded from the UTC date, so everyone gets the
same run on the same day, with its own best score.

Best scores live in `localStorage` (and the game still runs if that is blocked).

## Layout

```
src/
  game/
    logic.js    pure rules — no kaplay, no DOM, no wall clock
    rng.js      seeded PRNG + daily seed / day number
    storage.js  localStorage wrapper that never throws
    share.js    the one-line result brag
  audio.js      synthesised blips (no audio assets)
  main.js       kaplay rendering and input
tests/          vitest, covering everything under src/game
```

`main.js` owns pixels and input only. Everything that decides what happens in a
run lives in `src/game/logic.js`, drives off an injected `dt`, and emits events
(`eat`, `die`, `comboLost`) that the renderer turns into sound and effects.

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
