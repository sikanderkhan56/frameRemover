import type {SkipReason} from '../constants/skipReasons';
import type {AiCategory, EstimatedScene} from '../types/content';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
} from '../types/flow';
import {secondsToTimeFields} from './cutSceneDrafts';
import {parseTimeInput} from './time';

const AI_CATEGORY_TO_REASON: Record<string, SkipReason> = {
  Violence: 'violence',
  Language: 'language',
  Kissing: 'other',
  'Sexual Content': 'sexual_content',
  Nudity: 'sexual_content',
};

/** Map Gemini category labels onto our skip-reason enums. */
export function mapAiCategoryToReason(
  category: AiCategory | string,
): SkipReason {
  const trimmed = category.trim();
  if (!trimmed) {
    return 'other';
  }

  const direct = AI_CATEGORY_TO_REASON[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('violence') || lower.includes('gore')) {
    return 'violence';
  }
  if (lower.includes('language') || lower.includes('profan')) {
    return 'language';
  }
  if (
    lower.includes('sexual') ||
    lower.includes('nudity') ||
    lower.includes('nude')
  ) {
    return 'sexual_content';
  }

  return 'other';
}

/**
 * Parse AI estimated ranges like "~00:28:30-00:29:15" or "~01:15:00-01:18:00".
 */
export function parseEstimatedTimeRange(
  value: string,
): {start: number; end: number} | null {
  const cleaned = value.replace(/~/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const parts = cleaned.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) {
    return null;
  }

  const start = parseTimeInput(parts[0] ?? '');
  const end = parseTimeInput(parts[1] ?? '');

  if (start === null || end === null || start >= end) {
    return null;
  }

  return {start, end};
}

/** Convert one AI estimated scene into an editable cut-scene draft. */
export function estimatedSceneToDraft(
  scene: EstimatedScene,
): CutSceneDraft | null {
  const range = parseEstimatedTimeRange(scene.estimated_time);
  if (!range) {
    return null;
  }

  const draft = createEmptyCutSceneDraft();
  return {
    ...draft,
    start: secondsToTimeFields(range.start),
    end: secondsToTimeFields(range.end),
    reason: mapAiCategoryToReason(scene.category),
  };
}
