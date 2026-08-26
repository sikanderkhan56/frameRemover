import {toApiSkipReason} from '../constants/skipReasons';
import type {ApiCutScene, CutScene} from '../types/content';

/** Convert app cut scenes into the backend reason enum for create/update. */
export function cutScenesToApiPayload(scenes: CutScene[]): ApiCutScene[] {
  return scenes.map(scene => ({
    start: scene.start,
    end: scene.end,
    reason: toApiSkipReason(scene.reason),
  }));
}
