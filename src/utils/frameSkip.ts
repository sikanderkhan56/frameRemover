import type {SkipInterval} from '../types/skipInterval';

export function getIntervalKey(interval: SkipInterval): string {
  return `${interval.start}-${interval.end}`;
}

export function findActiveSkipInterval(
  currentTime: number,
  intervals: SkipInterval[],
  leadTimeSeconds = 0,
): SkipInterval | undefined {
  return intervals.find(
    interval =>
      currentTime >= interval.start - leadTimeSeconds &&
      currentTime < interval.end,
  );
}

export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/** Always HH:MM:SS, matching the cut-scene editor Figma. */
export function formatClockTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
