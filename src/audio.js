// Synthesised blips — no audio assets to ship, and nothing here throws if the
// browser has no WebAudio or has not had a user gesture yet.

let ctx = null;
let muted = false;

function context() {
  if (ctx) return ctx;
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** Browsers keep the context suspended until a real user gesture. */
export function resumeAudio() {
  const ac = context();
  if (ac?.state === "suspended") ac.resume?.().catch(() => {});
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function blip({ freq, to = freq, dur = 0.09, type = "square", gain = 0.06 }) {
  if (muted) return;
  const ac = context();
  if (!ac || ac.state !== "running") return;

  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (to !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + dur);
    }
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    /* audio is a nicety, never a failure */
  }
}

export const sfx = {
  apple: () => blip({ freq: 520, to: 800, dur: 0.08 }),
  volt: () => blip({ freq: 700, to: 1300, dur: 0.11, type: "sawtooth" }),
  portal: () => blip({ freq: 300, to: 900, dur: 0.16, type: "sine", gain: 0.07 }),
  bone: () => blip({ freq: 240, to: 110, dur: 0.18, gain: 0.05 }),
  combo: (mult) =>
    blip({
      freq: 560 + mult * 150,
      to: 980 + mult * 220,
      dur: 0.13,
      type: "triangle",
      gain: 0.07,
    }),
  die: () => blip({ freq: 340, to: 70, dur: 0.5, type: "sawtooth", gain: 0.07 }),
  ui: () => blip({ freq: 440, dur: 0.05, type: "triangle", gain: 0.04 }),
};

export function buzz(ms) {
  if (muted) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported or blocked by permissions policy */
  }
}
