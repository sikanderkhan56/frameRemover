import type {SkipReason} from '../constants/skipReasons';
import type {CutScene} from '../types/content';
import type {TimeFields} from '../types/flow';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
} from '../types/flow';

export function secondsToTimeFields(totalSeconds: number): TimeFields {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    hours: hours > 0 ? String(hours) : '',
    minutes: minutes > 0 || hours > 0 ? String(minutes) : '',
    seconds: seconds > 0 || (hours === 0 && minutes === 0) ? String(seconds) : '',
  };
}

export function cutSceneToDraft(scene: CutScene, index: number): CutSceneDraft {
  return {
    id: `scene-${index}-${scene.start}-${scene.end}`,
    start: secondsToTimeFields(scene.start),
    end: secondsToTimeFields(scene.end),
    reason: scene.reason as SkipReason,
  };
}

export function cutScenesToDrafts(scenes: CutScene[]): CutSceneDraft[] {
  if (scenes.length === 0) {
    return [createEmptyCutSceneDraft()];
  }

  return scenes.map(cutSceneToDraft);
}
