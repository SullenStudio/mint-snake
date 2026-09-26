// localStorage wrapper that never throws. Private-mode Safari and sandboxed
// iframes deny access outright, and quota errors happen on writes — neither is
// a reason to lose the run.

const PREFIX = "mint-snake:";

function detectBackend() {
  try {
    const probe = `${PREFIX}probe`;
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function bestKey(mode, seed) {
  return mode === "daily"
    ? `${PREFIX}best:daily:${seed}`
    : `${PREFIX}best:${mode}`;
}

export function createStorage(backend = detectBackend()) {
  function read(key) {
    try {
      return backend?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      backend?.setItem(key, String(value));
    } catch {
      /* read-only storage: the run still counts, it just won't persist */
    }
  }

  function readNumber(key) {
    const raw = Number(read(key));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }

  return {
    readBest(mode, seed = 0) {
      return readNumber(bestKey(mode, seed));
    },

    writeBest(mode, seed, score) {
      const key = bestKey(mode, seed);
      const previous = readNumber(key);
      const isRecord = score > previous;
      if (isRecord) write(key, score);
      return { best: Math.max(previous, score), isRecord };
    },

    hasPlayedDaily(seed) {
      return read(bestKey("daily", seed)) !== null;
    },

    readPlays() {
      return readNumber(`${PREFIX}plays`);
    },

    bumpPlays() {
      const next = this.readPlays() + 1;
      write(`${PREFIX}plays`, next);
      return next;
    },
  };
}
