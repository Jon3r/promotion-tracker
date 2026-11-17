// Offline Web Audio cues for BJJ Timer & Check-In.
// Voice lines are Kenney's CC0 Fighter pack (public/audio/*); bells/tones are synthesized.

let audioCtx = null;
let masterVolume = 85; // 0 - 100
let unlocked = false;

/** @type {Map<string, Promise<AudioBuffer>>} */
const clipPromises = new Map();

const VOICE_CLIPS = {
  ready: "/audio/ready.wav",
  fight: "/audio/fight.wav",
  final_round: "/audio/final_round.wav",
  time: "/audio/time.wav",
  prepare_yourself: "/audio/prepare_yourself.wav",
  round_1: "/audio/round_1.wav",
  round_2: "/audio/round_2.wav",
  round_3: "/audio/round_3.wav",
  round_4: "/audio/round_4.wav",
  round_5: "/audio/round_5.wav",
};

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

/**
 * Pick which spoken lines to play when a work round begins.
 * @param {{ round?: number, isFinal?: boolean }} [options]
 * @returns {Array<keyof typeof VOICE_CLIPS>}
 */
export function resolveRoundAnnouncement(options = {}) {
  const round = Number(options.round);
  if (options.isFinal) return ["final_round", "fight"];
  if (Number.isFinite(round) && round >= 1 && round <= 5) {
    return [`round_${round}`, "fight"];
  }
  return ["fight"];
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
    // Warm the common voice lines for the kiosk TV.
    for (const key of [
      "ready",
      "fight",
      "final_round",
      "time",
      "round_1",
      "round_2",
      "round_3",
      "round_4",
      "round_5",
    ]) {
      loadVoiceClip(ctx, key).catch(() => {
        clipPromises.delete(key);
      });
    }
    return unlocked;
  } catch {
    return false;
  }
}

/**
 * @param {AudioContext} ctx
 * @param {keyof typeof VOICE_CLIPS} key
 */
function loadVoiceClip(ctx, key) {
  const path = VOICE_CLIPS[key];
  if (!path) {
    return Promise.reject(new Error(`Unknown voice clip: ${key}`));
  }
  let pending = clipPromises.get(key);
  if (!pending) {
    pending = fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Voice clip missing: ${path}`);
        return res.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .catch((error) => {
        clipPromises.delete(key);
        throw error;
      });
    clipPromises.set(key, pending);
  }
  return pending;
}

/**
 * @param {AudioContext} ctx
 * @param {AudioBuffer} buffer
 * @param {number} startTime
 * @param {number} [baseGain]
 */
function scheduleBuffer(ctx, buffer, startTime, baseGain = 0.95) {
  const level = gainLevel(baseGain);
  if (level <= 0) return 0;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(level, startTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  return buffer.duration;
}

/**
 * @param {AudioContext} ctx
 * @param {keyof typeof VOICE_CLIPS} key
 * @param {number} startTime
 */
async function scheduleVoiceClip(ctx, key, startTime) {
  const buffer = await loadVoiceClip(ctx, key);
  return scheduleBuffer(ctx, buffer, startTime);
}

/**
 * @param {AudioContext} ctx
 * @param {Array<keyof typeof VOICE_CLIPS>} keys
 * @param {number} [gapSec]
 */
async function playVoiceSequence(ctx, keys, gapSec = 0.08) {
  let startTime = ctx.currentTime;
  for (const key of keys) {
    const duration = await scheduleVoiceClip(ctx, key, startTime);
    startTime += duration + gapSec;
  }
  return true;
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
      if (options.announce) {
        try {
          return await playVoiceSequence(ctx, ["ready"]);
        } catch {
          playTone(ctx, ctx.currentTime, 660, 0.12, "triangle", 0.35);
          return true;
        }
      }
      playTone(ctx, now, 660, 0.12, "triangle", 0.35);
      return true;
    }
    case "start": {
      if (options.announce) {
        try {
          return await playVoiceSequence(
            ctx,
            resolveRoundAnnouncement({
              round: options.round,
              isFinal: options.isFinal,
            })
          );
        } catch {
          // Fall through to gym bells if voice clips fail to load.
        }
      }
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
      if (options.announce) {
        try {
          return await playVoiceSequence(ctx, ["time"]);
        } catch {
          // Fall through to clapper knocks.
        }
      }
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
