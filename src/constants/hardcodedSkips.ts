import type {SkipInterval} from '../types/skipInterval';
import {hours, minutes, seconds, time} from '../utils/time';

/**
 * Legacy local test data — the app now loads cut scenes from the API.
 * Kept for reference when testing without a backend.
 *
 * `start` and `end` are total seconds from the beginning of the video.
 */
export const HARDCODED_SKIP_INTERVALS: SkipInterval[] = [
  {start: seconds(10), end: seconds(15), label: 'Scene 1'},
  {start: seconds(20), end: seconds(55), label: 'Scene 2'},
  {
    start: minutes(1) + seconds(15),
    end: time({hours: 1, minutes: 10, seconds: 45}),
    label: 'Scene at 1:10',
  },
];
