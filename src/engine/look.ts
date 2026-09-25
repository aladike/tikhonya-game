/** Degrees of rotation stay predictable across device sizes and event rates. */
export function lookDelta(
  dx: number,
  dy: number,
  touch: boolean,
  sensitivity: number,
  shortSide: number,
) {
  const gain = touch ? 1.15 / Math.max(320, shortSide) : 0.0025;
  return {
    yaw: -dx * gain * sensitivity,
    pitch: -dy * gain * sensitivity * (touch ? 0.8 : 1),
  };
}
