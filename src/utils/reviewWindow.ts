/**
 * Build a zoomed timeline window around a cut scene so short ranges
 * are easy to trim (markers aren't crushed on a full-movie scrubber).
 */
export function buildReviewWindow(
  start: number | null,
  end: number | null,
  mediaDuration: number,
): {windowStart: number; windowEnd: number} {
  if (mediaDuration <= 0) {
    return {windowStart: 0, windowEnd: 0};
  }

  if (start === null || end === null || end <= start) {
    return {
      windowStart: 0,
      windowEnd: Math.min(mediaDuration, 120),
    };
  }

  const span = end - start;
  // Pad each side; keep a minimum span so a 15–30s scene still fills the bar.
  const pad = Math.max(span * 0.4, 15);
  const minSpan = Math.max(45, span * 2.2);

  let windowStart = Math.max(0, start - pad);
  let windowEnd = Math.min(mediaDuration, end + pad);

  if (windowEnd - windowStart < minSpan) {
    const mid = (start + end) / 2;
    windowStart = Math.max(0, mid - minSpan / 2);
    windowEnd = Math.min(mediaDuration, windowStart + minSpan);
    windowStart = Math.max(0, windowEnd - minSpan);
  }

  return {windowStart, windowEnd};
}

export function expandReviewWindow(
  windowStart: number,
  windowEnd: number,
  mediaDuration: number,
  edge: 'left' | 'right' | 'both',
  factor = 0.35,
): {windowStart: number; windowEnd: number} {
  if (mediaDuration <= 0) {
    return {windowStart, windowEnd};
  }

  const span = Math.max(0.001, windowEnd - windowStart);
  const grow = span * factor;

  let nextStart = windowStart;
  let nextEnd = windowEnd;

  if (edge === 'left' || edge === 'both') {
    nextStart = Math.max(0, windowStart - grow);
  }
  if (edge === 'right' || edge === 'both') {
    nextEnd = Math.min(mediaDuration, windowEnd + grow);
  }

  return {windowStart: nextStart, windowEnd: nextEnd};
}
