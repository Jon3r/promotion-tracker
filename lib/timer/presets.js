export const TIMER_PRESETS = [
  {
    id: "standard",
    name: "Standard",
    description: "5:00 rounds · 0:20 rest · Unlimited",
    roundDurationSec: 300,
    restDurationSec: 20,
    totalRounds: 0,
  },
  {
    id: "adults",
    name: "Adults",
    description: "5:00 rounds · 1:00 rest · 6 rounds",
    roundDurationSec: 300,
    restDurationSec: 60,
    totalRounds: 6,
  },
  {
    id: "comp",
    name: "Comp",
    description: "6:00 rounds · 1:00 rest · 6 rounds",
    roundDurationSec: 360,
    restDurationSec: 60,
    totalRounds: 6,
  },
  {
    id: "positional",
    name: "Positional",
    description: "3:00 rounds · 0:30 rest · 8 rounds",
    roundDurationSec: 180,
    restDurationSec: 30,
    totalRounds: 8,
  },
  {
    id: "kids",
    name: "Kids",
    description: "3:00 rounds · 0:20 rest · 5 rounds",
    roundDurationSec: 180,
    restDurationSec: 20,
    totalRounds: 5,
  },
];

/**
 * @param {string|null|undefined} id
 */
export function getPresetById(id) {
  if (!id) return null;
  return TIMER_PRESETS.find((preset) => preset.id === id) || null;
}

/**
 * @param {{ roundDurationSec: number, restDurationSec: number, totalRounds: number }} state
 */
export function findMatchingPreset(state) {
  if (!state) return null;
  return (
    TIMER_PRESETS.find(
      (preset) =>
        preset.roundDurationSec === state.roundDurationSec &&
        preset.restDurationSec === state.restDurationSec &&
        preset.totalRounds === state.totalRounds
    ) || null
  );
}
