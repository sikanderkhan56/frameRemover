import {isSkipReason} from '../constants/skipReasons';
import type {CutScene} from '../types/movie';
import type {CutSceneDraft, TimeFields} from '../types/flow';
import {parseTimeFields} from './time';

function isTimeFieldsEmpty(fields: TimeFields): boolean {
  return (
    !fields.hours.trim() && !fields.minutes.trim() && !fields.seconds.trim()
  );
}

function isDraftPartiallyFilled(draft: CutSceneDraft): boolean {
  return (
    !isTimeFieldsEmpty(draft.start) ||
    !isTimeFieldsEmpty(draft.end) ||
    draft.reason !== ''
  );
}

function getTimeFieldsRangeError(fields: TimeFields): string | null {
  const minutes =
    fields.minutes.trim() === '' ? 0 : Number(fields.minutes);
  const seconds =
    fields.seconds.trim() === '' ? 0 : Number(fields.seconds);

  if (!Number.isNaN(minutes) && minutes >= 60) {
    return 'Minutes must be between 0 and 59.';
  }

  if (!Number.isNaN(seconds) && seconds >= 60) {
    return 'Seconds must be between 0 and 59.';
  }

  return null;
}

export function draftsToCutScenes(drafts: CutSceneDraft[]): {
  cutScenes: CutScene[] | null;
  error: string | null;
} {
  const filledDrafts = drafts.filter(isDraftPartiallyFilled);

  if (filledDrafts.length === 0) {
    return {cutScenes: [], error: null};
  }

  const cutScenes: CutScene[] = [];

  for (let index = 0; index < filledDrafts.length; index += 1) {
    const draft = filledDrafts[index];
    const sceneNumber = index + 1;
    const start = parseTimeFields(draft.start);
    const end = parseTimeFields(draft.end);
    const reason = draft.reason;

    if (start === null) {
      const rangeError = getTimeFieldsRangeError(draft.start);
      return {
        cutScenes: null,
        error:
          rangeError ??
          `Scene ${sceneNumber}: enter a valid start time (Hr / Min / Sec).`,
      };
    }

    if (end === null) {
      const rangeError = getTimeFieldsRangeError(draft.end);
      return {
        cutScenes: null,
        error:
          rangeError ??
          `Scene ${sceneNumber}: enter a valid end time (Hr / Min / Sec).`,
      };
    }

    if (!isSkipReason(reason)) {
      return {
        cutScenes: null,
        error: `Scene ${sceneNumber}: select a reason.`,
      };
    }

    if (start >= end) {
      return {
        cutScenes: null,
        error: `Scene ${sceneNumber}: start must be before end.`,
      };
    }

    cutScenes.push({start, end, reason});
  }

  return {cutScenes, error: null};
}
