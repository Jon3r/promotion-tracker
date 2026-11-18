// Offline Web Audio cues for BJJ Timer & Check-In.
// Gym bells and tones are synthesized in-browser (no voice clips).

let audioCtx = null;
let masterVolume = 85; // 0 - 100
let unlocked = false;

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function ensureContext() {
  if (audioCtx) return audioCtx;
  const Ctx = getAudioContextClass();
  if (!Ctx) return null;
  try {
    audioCtx = new Ctx();
    if (audioCtx.state === "running") {
      unlocked = true;
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function setAudioVolume(volume) {
  const n = Number(volume);
  if (Number.isFinite(n)) {
    masterVolume = Math.min(100, Math.max(0, Math.round(n)));
  }
}

export function getAudioVolume() {
  return masterVolume;
}

export function isAudioUnlocked() {
  if (!audioCtx) {
    const ctx = ensureContext();
    if (ctx && ctx.state === "running") {
      unlocked = true;
    }
  } else if (audioCtx.state === "running") {
    unlocked = true;
  }
  return unlocked;
}

export async function unlockAudio() {
  const ctx = ensureContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // Play a silent 1-sample buffer to satisfy strict autoplay policies.
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    unlocked = ctx.state === "running";
    return unlocked;
  } catch {
    return false;
  }
}

function gainLevel(baseGain) {
  if (masterVolume <= 0) return 0;
  // Slightly perceptual volume curve
  const norm = masterVolume / 100;
  return baseGain * (norm * norm * 0.65 + norm * 0.35);
}

/**
 * Strike a synthesized metallic gym bell at `startTime`.
 * @param {AudioContext} ctx
 * @param {number} startTime
 * @param {{ pitchScale?: number, duration?: number, gain?: number }} [opts]
 */
function strikeBell(ctx, startTime, opts = {}) {
  const pitch = opts.pitchScale ?? 1;
  const duration = opts.duration ?? 1.25;
  const level = gainLevel(opts.gain ?? 0.55);
  if (level <= 0) return;

  const partials = [
    { freq: 880 * pitch, amp: 1.0, decay: duration },
    { freq: 1318.5 * pitch, amp: 0.65, decay: duration * 0.8 },
    { freq: 1760 * pitch, amp: 0.45, decay: duration * 0.65 },
    { freq: 2489 * pitch, amp: 0.3, decay: duration * 0.45 },
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(p.freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, level * p.amp),
      startTime + 0.008
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + p.decay + 0.05);
  }
}

/**
 * Play a crisp percussive tone/clapper.
 * @param {AudioContext} ctx
 * @param {number} startTime
 * @param {number} freq
 * @param {number} duration
 * @param {OscillatorType} type
 * @param {number} baseGain
 */
function playTone(ctx, startTime, freq, duration, type = "sine", baseGain = 0.35) {
  const level = gainLevel(baseGain);
  if (level <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(level, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

/**
 * Play a named timer or check-in cue.
 * @param {"ready"|"start"|"soon"|"finish"|"checkin"} cue
 * @param {{ announce?: boolean, round?: number, isFinal?: boolean }} [options]
 */
export async function playTimerCue(cue, options = {}) {
  void options;
  const ctx = ensureContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state === "running") {
      unlocked = true;
    }
  } catch {
    return false;
  }

  const now = ctx.currentTime;

  switch (cue) {
    case "ready": {
      playTone(ctx, now, 660, 0.12, "triangle", 0.35);
      return true;
    }
    case "start": {
      // Double boxing/BJJ round bell strike
      strikeBell(ctx, ctx.currentTime, {
        pitchScale: 1.0,
        duration: 1.3,
        gain: 0.55,
      });
      strikeBell(ctx, ctx.currentTime + 0.18, {
        pitchScale: 1.0,
        duration: 1.4,
        gain: 0.5,
      });
      return true;
    }
    case "soon": {
      // Three crisp wooden clapper knocks for 10s warning
      playTone(ctx, now, 1180, 0.07, "square", 0.25);
      playTone(ctx, now + 0.12, 1180, 0.07, "square", 0.25);
      playTone(ctx, now + 0.24, 1180, 0.09, "square", 0.28);
      return true;
    }
    case "finish": {
      // Triple lower-pitched end-of-round bell
      strikeBell(ctx, now, { pitchScale: 0.85, duration: 0.9, gain: 0.55 });
      strikeBell(ctx, now + 0.22, { pitchScale: 0.85, duration: 0.9, gain: 0.55 });
      strikeBell(ctx, now + 0.44, { pitchScale: 0.85, duration: 1.5, gain: 0.6 });
      return true;
    }
    case "checkin": {
      // Warm ascending two-note chime
      playTone(ctx, now, 1046.5, 0.28, "sine", 0.28);
      playTone(ctx, now + 0.11, 1318.5, 0.42, "sine", 0.3);
      return true;
    }
    default:
      return false;
  }
}
