import {normalizeSkipReason} from '../constants/skipReasons';
import type {CutScene} from '../types/content';
import type {TimeFields} from '../types/flow';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
} from '../types/flow';
import {formatClockTimestamp} from './frameSkip';
import {parseTimeFields, parseTimeInput} from './time';

export function secondsToTimeFields(totalSeconds: number): TimeFields {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    hours: String(hours),
    minutes: String(minutes),
    seconds: String(seconds),
  };
}

export function timeFieldsToClock(fields: TimeFields): string {
  const total = parseTimeFields(fields);
  if (total === null) {
    return '';
  }

  return formatClockTimestamp(total);
}

export function clockToTimeFields(value: string): TimeFields | null {
  const total = parseTimeInput(value);
  if (total === null) {
    return null;
  }

  return secondsToTimeFields(total);
}

export function cutSceneToDraft(scene: CutScene, index: number): CutSceneDraft {
  return {
    id: `scene-${index}-${scene.start}-${scene.end}`,
    start: secondsToTimeFields(scene.start),
    end: secondsToTimeFields(scene.end),
    reason: normalizeSkipReason(scene.reason),
  };
}

export function cutScenesToDrafts(scenes: CutScene[]): CutSceneDraft[] {
  if (scenes.length === 0) {
    return [];
  }

  return scenes.map(cutSceneToDraft);
}

export {createEmptyCutSceneDraft};
