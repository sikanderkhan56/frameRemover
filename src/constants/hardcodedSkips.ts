import type {SkipInterval} from '../types/skipInterval';
import {hours, minutes, seconds, time} from '../utils/time';

/**
 * Temporary stand-in for backend-provided skip data.
 *
 * `start` and `end` are always **total seconds from the beginning of the video** —
 * not "seconds within a minute". The skip logic handles any duration: seconds,
 * minutes, or hours.
 *
 * Use the helpers below so timestamps stay readable:
 *   seconds(15)              → 0:15
 *   minutes(10)              → 10:00
 *   hours(1)                 → 1:00:00
 *   time({ hours: 1, minutes: 5 }) → 1:05:00
 */
export const HARDCODED_SKIP_INTERVALS: SkipInterval[] = [
  // Quick test skips (good for short clips)
  {start: seconds(10), end: seconds(15), label: 'Scene 1'},
  {start: seconds(20), end: seconds(55), label: 'Scene 2'},
  {
    start: minutes(1) + seconds(15), // 1:10:15
    end: time({ hours: 1, minutes: 10, seconds: 45 }),   // 1:10:45
    label: 'Scene at 1:10',
  },

  // Example for a ~1h 20m movie — uncomment and adjust to your video:
  // { start: minutes(10), end: minutes(20), label: 'Skip 10th–20th minute' },
  // { start: hours(1), end: time({ hours: 1, minutes: 10 }), label: 'Skip at 1 hour mark' },
];

/** How many seconds before a skip interval to start seeking */
export const SKIP_LEAD_TIME_SECONDS = 0.25;
