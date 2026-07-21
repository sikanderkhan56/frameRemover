import type {SkipReason} from '../constants/skipReasons';

export type SkipInterval = {
  /** Start time of the scene to skip, in seconds */
  start: number;
  /** End time of the scene to skip, in seconds */
  end: number;
  /** Optional label for debugging / future UI */
  label?: string;
  /** Machine reason value used for styling */
  reason?: SkipReason;
};
