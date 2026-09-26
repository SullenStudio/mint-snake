import { describe, expect, test } from "vitest";
import { createStorage } from "../src/game/storage.js";

function memoryBackend(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

const hostileBackend = {
  getItem() {
    throw new DOMException("denied");
  },
  setItem() {
    throw new DOMException("quota");
  },
};

describe("best score", () => {
  test("starts at zero", () => {
    expect(createStorage(memoryBackend()).readBest("classic")).toBe(0);
  });

  test("persists across reads", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("classic", 0, 120);
    expect(store.readBest("classic")).toBe(120);
  });

  test("keeps the higher score", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("classic", 0, 120);
    store.writeBest("classic", 0, 80);
    expect(store.readBest("classic")).toBe(120);
  });

  test("reports a record when the score beats the stored best", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("classic", 0, 50);
    expect(store.writeBest("classic", 0, 90).isRecord).toBe(true);
  });

  test("does not report a record for a tie", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("classic", 0, 50);
    expect(store.writeBest("classic", 0, 50).isRecord).toBe(false);
  });

  test("does not report a record for a zero score on a fresh install", () => {
    const store = createStorage(memoryBackend());
    expect(store.writeBest("classic", 0, 0).isRecord).toBe(false);
  });

  test("returns the resulting best alongside the record flag", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("classic", 0, 200);
    expect(store.writeBest("classic", 0, 10)).toEqual({
      best: 200,
      isRecord: false,
    });
  });

  test("ignores a corrupt stored value", () => {
    const store = createStorage(
      memoryBackend({ "mint-snake:best:classic": "not-a-number" }),
    );
    expect(store.readBest("classic")).toBe(0);
  });

  test("ignores a negative stored value", () => {
    const store = createStorage(
      memoryBackend({ "mint-snake:best:classic": "-50" }),
    );
    expect(store.readBest("classic")).toBe(0);
  });
});

describe("daily bests", () => {
  test("are tracked per day", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("daily", 20260926, 100);
    expect(store.readBest("daily", 20260926)).toBe(100);
    expect(store.readBest("daily", 20260927)).toBe(0);
  });

  test("do not leak into the classic best", () => {
    const store = createStorage(memoryBackend());
    store.writeBest("daily", 20260926, 500);
    expect(store.readBest("classic")).toBe(0);
  });

  test("report whether today has been played", () => {
    const store = createStorage(memoryBackend());
    expect(store.hasPlayedDaily(20260926)).toBe(false);
    store.writeBest("daily", 20260926, 10);
    expect(store.hasPlayedDaily(20260926)).toBe(true);
  });
});

describe("play count", () => {
  test("starts at zero", () => {
    expect(createStorage(memoryBackend()).readPlays()).toBe(0);
  });

  test("increments on each run", () => {
    const store = createStorage(memoryBackend());
    store.bumpPlays();
    store.bumpPlays();
    expect(store.readPlays()).toBe(2);
  });
});

describe("hostile environments", () => {
  test("survives a backend that throws on read", () => {
    const store = createStorage(hostileBackend);
    expect(store.readBest("classic")).toBe(0);
  });

  test("survives a backend that throws on write", () => {
    const store = createStorage(hostileBackend);
    expect(() => store.writeBest("classic", 0, 10)).not.toThrow();
  });

  test("still reports the record so the UI can celebrate it", () => {
    const store = createStorage(hostileBackend);
    expect(store.writeBest("classic", 0, 10).isRecord).toBe(true);
  });

  test("survives no backend at all", () => {
    const store = createStorage(null);
    expect(store.readBest("classic")).toBe(0);
    expect(() => store.writeBest("classic", 0, 10)).not.toThrow();
    expect(() => store.bumpPlays()).not.toThrow();
  });
});
