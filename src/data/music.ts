// Original 64-bar score (~137 seconds at 112 BPM), four motifs and eight harmonic phrases.
export const dayScore = {
  bpm: 112,
  bars: 64,
  roots: [48, 53, 55, 48, 57, 53, 50, 55],
  motifs: [
    [0, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, 2, 4],
    [7, 9, 12, 14, 12, 9, 7, 4, 5, 9, 12, 9, 7, 5, 4, 2],
    [0, 2, 4, 7, 4, 2, 0, -3, 0, 4, 9, 7, 4, 2, 4, 7],
    [12, 9, 7, 4, 5, 7, 9, 12, 14, 12, 9, 7, 5, 4, 2, 0],
  ],
};

// Original 64-bar night waltz-like lullaby, 88 BPM (~175 s), playful minor harmony.
export const nightScore = {
  bpm: 88,
  bars: 64,
  roots: [45, 50, 52, 45, 48, 50, 41, 52],
  motifs: [
    [0, 3, 7, 10, 7, 3, 2, 0, 7, 10, 12, 10, 7, 5, 3, 2],
    [7, 5, 3, 2, 0, 3, 5, 7, 10, 7, 5, 3, 2, 5, 7, 3],
    [12, 10, 7, 5, 3, 0, 2, 3, 7, 3, 5, 10, 7, 5, 3, 0],
    [0, 7, 3, 10, 5, 12, 7, 3, 2, 5, 7, 10, 12, 10, 7, 5],
  ],
};
