// Seeded PRNG (mulberry32). Deterministic so a daily challenge plays out the
// same board for everyone, and so the game logic is testable without stubs.

const EPOCH_DAY = Math.floor(Date.UTC(2025, 11, 31) / 86400000);

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (list) => list[next.int(list.length)];
  return next;
}

export function randomSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export function dailySeed(date = new Date()) {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

export function dayNumber(date = new Date()) {
  const day = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86400000,
  );
  return day - EPOCH_DAY;
}
