export type TimeParts = {
  hours?: number;
  minutes?: number;
  seconds?: number;
};

/** Total seconds from the start of the video. */
export function seconds(value: number): number {
  return value;
}

/** Convert minutes to seconds (e.g. minutes(10) → 600). */
export function minutes(totalMinutes: number): number {
  return totalMinutes * 60;
}

/** Convert hours to seconds (e.g. hours(1) → 3600). */
export function hours(totalHours: number): number {
  return totalHours * 3600;
}

/**
 * Build a playback position from hours, minutes, and/or seconds.
 * All values are added together from the start of the video.
 *
 * @example time({ minutes: 10 })           // 10:00 → 600s
 * @example time({ hours: 1 })             // 1:00:00 → 3600s
 * @example time({ hours: 1, minutes: 5 }) // 1:05:00 → 3900s
 */
export function time(parts: TimeParts): number {
  const h = parts.hours ?? 0;
  const m = parts.minutes ?? 0;
  const s = parts.seconds ?? 0;
  return h * 3600 + m * 60 + s;
}
