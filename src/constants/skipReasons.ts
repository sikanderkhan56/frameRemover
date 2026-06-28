export type SkipReason = 'violence' | 'inappropriate' | 'eighteen_plus';

export const SKIP_REASONS: {value: SkipReason; label: string}[] = [
  {value: 'violence', label: 'Violence'},
  {value: 'inappropriate', label: 'Inappropriate'},
  {value: 'eighteen_plus', label: '18+'},
];

export function isSkipReason(value: string): value is SkipReason {
  return SKIP_REASONS.some(reason => reason.value === value);
}

export function getSkipReasonLabel(value: string): string {
  return SKIP_REASONS.find(reason => reason.value === value)?.label ?? value;
}
