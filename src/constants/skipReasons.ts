export type SkipReason =
  | 'violence'
  | 'language'
  | 'sexual_content'
  | 'other';

export type SkipReasonStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

export const SKIP_REASONS: {
  value: SkipReason;
  label: string;
  style: SkipReasonStyle;
}[] = [
  {
    value: 'violence',
    label: 'Violence',
    style: {
      backgroundColor: '#FEE2E2',
      borderColor: '#FECACA',
      textColor: '#DC2626',
    },
  },
  {
    value: 'language',
    label: 'Language',
    style: {
      backgroundColor: '#FFEDD5',
      borderColor: '#FED7AA',
      textColor: '#EA580C',
    },
  },
  {
    value: 'sexual_content',
    label: 'Sexual Content',
    style: {
      backgroundColor: '#EDE9FE',
      borderColor: '#DDD6FE',
      textColor: '#7C3AED',
    },
  },
  {
    value: 'other',
    label: 'Other',
    style: {
      backgroundColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      textColor: '#6B7280',
    },
  },
];

const LEGACY_REASON_MAP: Record<string, SkipReason> = {
  inappropriate: 'language',
  eighteen_plus: 'sexual_content',
};

export function isSkipReason(value: string): value is SkipReason {
  return SKIP_REASONS.some(reason => reason.value === value);
}

export function normalizeSkipReason(value: string): SkipReason | '' {
  if (isSkipReason(value)) {
    return value;
  }

  return LEGACY_REASON_MAP[value] ?? '';
}

export function getSkipReasonLabel(value: string): string {
  const normalized = normalizeSkipReason(value);
  if (!normalized) {
    return value;
  }

  return (
    SKIP_REASONS.find(reason => reason.value === normalized)?.label ?? value
  );
}

export function getSkipReasonStyle(value: string): SkipReasonStyle {
  const normalized = normalizeSkipReason(value);
  const matched = SKIP_REASONS.find(reason => reason.value === normalized);

  return (
    matched?.style ?? {
      backgroundColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      textColor: '#6B7280',
    }
  );
}
