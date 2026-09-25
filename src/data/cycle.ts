export const cycleConfig = {
  day: 420,
  sunset: 60,
  night: 210,
  dawn: 30,
  maxMobs: 8,
  spawnInterval: 17,
};
export const cycleLength =
  cycleConfig.day + cycleConfig.sunset + cycleConfig.night + cycleConfig.dawn;
export function cycleAt(clock: number) {
  const t = ((clock % cycleLength) + cycleLength) % cycleLength;
  const duskAt = cycleConfig.day,
    nightAt = duskAt + cycleConfig.sunset,
    dawnAt = nightAt + cycleConfig.night;
  const phase: "day" | "sunset" | "night" | "dawn" =
    t < duskAt ? "day" : t < nightAt ? "sunset" : t < dawnAt ? "night" : "dawn";
  const light =
    phase === "day"
      ? 1
      : phase === "sunset"
        ? 1 - ((t - duskAt) / cycleConfig.sunset) * 0.7
        : phase === "night"
          ? 0.3
          : 0.3 + ((t - dawnAt) / cycleConfig.dawn) * 0.7;
  return {
    t,
    phase,
    light,
    night: phase === "night",
    day: Math.floor(clock / cycleLength) + 1,
    hour: (6 + (t / cycleLength) * 24) % 24,
  };
}
