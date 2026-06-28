import {getSkipReasonLabel} from '../constants/skipReasons';
import type {CutScene} from '../types/movie';
import type {SkipInterval} from '../types/skipInterval';

export function cutSceneToSkipInterval(cutScene: CutScene): SkipInterval {
  return {
    start: cutScene.start,
    end: cutScene.end,
    label: getSkipReasonLabel(cutScene.reason),
  };
}

export function cutScenesToSkipIntervals(cutScenes: CutScene[]): SkipInterval[] {
  return cutScenes.map(cutSceneToSkipInterval);
}
