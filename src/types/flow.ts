import type {SkipReason} from '../constants/skipReasons';

export type SetupStep =
  | 'welcome'
  | 'choose_content_type'
  | 'identify'
  | 'checking'
  | 'already_exists'
  | 'not_found'
  | 'edit_cut_scenes'
  | 'saving'
  | 'playing';

export type SceneEditMode = 'create' | 'update';

export type {ContentType} from './content';

export type TimeFields = {
  hours: string;
  minutes: string;
  seconds: string;
};

export type CutSceneDraft = {
  id: string;
  start: TimeFields;
  end: TimeFields;
  reason: SkipReason | '';
};

export function createEmptyTimeFields(): TimeFields {
  return {hours: '', minutes: '', seconds: ''};
}

export function createEmptyCutSceneDraft(): CutSceneDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    start: createEmptyTimeFields(),
    end: createEmptyTimeFields(),
    reason: '',
  };
}
