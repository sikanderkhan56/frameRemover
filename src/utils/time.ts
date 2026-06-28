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

/**
 * Parse user time input as total seconds.
 * Accepts plain seconds ("120") or m:ss / h:mm:ss ("2:00", "1:05:30").
 */
export function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(part => Number(part));
    if (parts.some(part => Number.isNaN(part))) {
      return null;
    }

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return null;
  }

  const secondsValue = Number(trimmed);
  return Number.isNaN(secondsValue) ? null : secondsValue;
}

export type TimeFieldParts = {
  hours: string;
  minutes: string;
  seconds: string;
};

/**
 * Combine optional h/m/s fields into total seconds.
 * Empty fields count as zero — leave hours blank for scenes under 1 hour, etc.
 */
export function parseTimeFields(parts: TimeFieldParts): number | null {
  const allEmpty =
    !parts.hours.trim() && !parts.minutes.trim() && !parts.seconds.trim();

  if (allEmpty) {
    return null;
  }

  const hours = parts.hours.trim() === '' ? 0 : Number(parts.hours);
  const minutes = parts.minutes.trim() === '' ? 0 : Number(parts.minutes);
  const secondsPart = parts.seconds.trim() === '' ? 0 : Number(parts.seconds);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(secondsPart)
  ) {
    return null;
  }

  if (hours < 0 || minutes < 0 || secondsPart < 0) {
    return null;
  }

  if (minutes >= 60 || secondsPart >= 60) {
    return null;
  }

  return hours * 3600 + minutes * 60 + secondsPart;
}
