import {
  getSkipReasonLabel,
  normalizeSkipReason,
} from '../constants/skipReasons';
import type {CutScene} from '../types/movie';
import type {SkipInterval} from '../types/skipInterval';

export function cutSceneToSkipInterval(cutScene: CutScene): SkipInterval {
  const reason = normalizeSkipReason(cutScene.reason) || undefined;

  return {
    start: cutScene.start,
    end: cutScene.end,
    label: getSkipReasonLabel(cutScene.reason),
    reason,
  };
}

export function cutScenesToSkipIntervals(cutScenes: CutScene[]): SkipInterval[] {
  return cutScenes.map(cutSceneToSkipInterval);
}
