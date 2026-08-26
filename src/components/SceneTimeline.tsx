import {useCallback, useEffect, useMemo, useRef} from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {formatClockTimestamp} from '../utils/frameSkip';

const MARKER_HIT_PX = 32;
const TRACK_HEIGHT = 12;
const MARKER_SIZE = 28;

export type TimelineInteractionMode = 'scrub' | 'start' | 'end';
export type TimelineDragTarget = 'start' | 'end' | 'playhead';

type SceneTimelineProps = {
  /** Absolute media duration (full movie). */
  mediaDuration: number;
  /** Visible window start (absolute seconds). */
  windowStart: number;
  /** Visible window end (absolute seconds). */
  windowEnd: number;
  playhead: number;
  startTime: number | null;
  endTime: number | null;
  interactionMode: TimelineInteractionMode;
  draggingTarget: TimelineDragTarget | null;
  onDraggingTargetChange: (target: TimelineDragTarget | null) => void;
  onPlayheadChange: (seconds: number) => void;
  onStartChange: (seconds: number) => void;
  onEndChange: (seconds: number) => void;
  /** Called when the user drags near a window edge (request more room). */
  onRequestExpand?: (edge: 'left' | 'right') => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function timeToRatio(
  time: number,
  windowStart: number,
  windowSpan: number,
): number {
  if (windowSpan <= 0) {
    return 0;
  }
  return clamp((time - windowStart) / windowSpan, 0, 1);
}

export function SceneTimeline({
  mediaDuration,
  windowStart,
  windowEnd,
  playhead,
  startTime,
  endTime,
  interactionMode,
  draggingTarget,
  onDraggingTargetChange,
  onPlayheadChange,
  onStartChange,
  onEndChange,
  onRequestExpand,
}: SceneTimelineProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const dragTargetRef = useRef<TimelineDragTarget | null>(null);
  const valuesRef = useRef({
    mediaDuration,
    windowStart,
    windowEnd,
    playhead,
    startTime,
    endTime,
    interactionMode,
  });

  valuesRef.current = {
    mediaDuration,
    windowStart,
    windowEnd,
    playhead,
    startTime,
    endTime,
    interactionMode,
  };

  const windowSpan = Math.max(0.001, windowEnd - windowStart);
  const ready = mediaDuration > 0 && windowEnd > windowStart;

  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackPageXRef.current = x;
      trackWidthRef.current = width;
    });
  }, []);

  useEffect(() => {
    measureTrack();
  }, [measureTrack, windowStart, windowEnd]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidthRef.current = event.nativeEvent.layout.width;
      measureTrack();
    },
    [measureTrack],
  );

  const pageXToTime = useCallback((pageX: number): number | null => {
    const width = trackWidthRef.current;
    const {windowStart: ws, windowEnd: we} = valuesRef.current;
    const span = we - ws;
    if (width <= 0 || span <= 0) {
      return null;
    }
    const x = pageX - trackPageXRef.current;
    return clamp(ws + (x / width) * span, ws, we);
  }, []);

  const pickTarget = useCallback((pageX: number): TimelineDragTarget => {
    const width = trackWidthRef.current;
    const {
      windowStart: ws,
      windowEnd: we,
      playhead: p,
      startTime: s,
      endTime: e,
      interactionMode: mode,
    } = valuesRef.current;
    const span = we - ws;

    if (mode === 'start' && s !== null) {
      return 'start';
    }
    if (mode === 'end' && e !== null) {
      return 'end';
    }

    if (width <= 0 || span <= 0) {
      return 'playhead';
    }

    const x = pageX - trackPageXRef.current;
    const candidates: {target: TimelineDragTarget; dist: number}[] = [
      {
        target: 'playhead',
        dist: Math.abs(timeToRatio(p, ws, span) * width - x),
      },
    ];
    if (s !== null) {
      candidates.push({
        target: 'start',
        dist: Math.abs(timeToRatio(s, ws, span) * width - x),
      });
    }
    if (e !== null) {
      candidates.push({
        target: 'end',
        dist: Math.abs(timeToRatio(e, ws, span) * width - x),
      });
    }

    candidates.sort((a, b) => a.dist - b.dist);
    const nearest = candidates[0];
    if (
      nearest &&
      nearest.target !== 'playhead' &&
      nearest.dist <= MARKER_HIT_PX
    ) {
      return nearest.target;
    }

    return 'playhead';
  }, []);

  const applyDrag = useCallback(
    (target: TimelineDragTarget, pageX: number) => {
      const next = pageXToTime(pageX);
      if (next === null) {
        return;
      }

      const {
        mediaDuration: media,
        windowStart: ws,
        windowEnd: we,
        startTime: s,
        endTime: e,
      } = valuesRef.current;
      const edgePad = (we - ws) * 0.04;

      if (target === 'start') {
        if (next <= ws + edgePad) {
          onRequestExpand?.('left');
        }
        const maxStart = e !== null ? Math.max(0, e - 0.25) : media;
        onStartChange(clamp(next, 0, maxStart));
        return;
      }

      if (target === 'end') {
        if (next >= we - edgePad) {
          onRequestExpand?.('right');
        }
        const minEnd = s !== null ? Math.min(media, s + 0.25) : 0;
        onEndChange(clamp(next, minEnd, media));
        return;
      }

      onPlayheadChange(next);
    },
    [onEndChange, onPlayheadChange, onRequestExpand, onStartChange, pageXToTime],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => ready,
        onMoveShouldSetPanResponder: () => ready,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: event => {
          measureTrack();
          const pageX = event.nativeEvent.pageX;
          const target = pickTarget(pageX);
          dragTargetRef.current = target;
          onDraggingTargetChange(target);
          applyDrag(target, pageX);
        },
        onPanResponderMove: (_event, gestureState) => {
          const target = dragTargetRef.current;
          if (!target) {
            return;
          }
          applyDrag(target, gestureState.moveX);
        },
        onPanResponderRelease: () => {
          dragTargetRef.current = null;
          onDraggingTargetChange(null);
        },
        onPanResponderTerminate: () => {
          dragTargetRef.current = null;
          onDraggingTargetChange(null);
        },
      }),
    [applyDrag, measureTrack, onDraggingTargetChange, pickTarget, ready],
  );

  const startRatio =
    startTime !== null
      ? timeToRatio(startTime, windowStart, windowSpan)
      : null;
  const endRatio =
    endTime !== null ? timeToRatio(endTime, windowStart, windowSpan) : null;
  const playheadRatio = timeToRatio(playhead, windowStart, windowSpan);

  const rangeLeft = startRatio !== null && endRatio !== null ? startRatio : 0;
  const rangeWidth =
    startRatio !== null && endRatio !== null
      ? Math.max(0, endRatio - startRatio)
      : 0;

  const hint =
    draggingTarget === 'start' || interactionMode === 'start'
      ? 'Drag to set start'
      : draggingTarget === 'end' || interactionMode === 'end'
        ? 'Drag to set end'
        : draggingTarget === 'playhead'
          ? 'Scrubbing this scene'
          : !ready
            ? 'Waiting for video duration…'
            : 'Zoomed to this scene — drag S / E to trim';

  return (
    <View style={styles.container}>
      <View style={styles.labelsRow}>
        <Text style={styles.boundLabel}>
          {formatClockTimestamp(windowStart)}
        </Text>
        <Text style={styles.hintLabel}>{hint}</Text>
        <Text style={styles.boundLabel}>
          {formatClockTimestamp(windowEnd)}
        </Text>
      </View>

      <View
        ref={trackRef}
        {...panResponder.panHandlers}
        accessibilityLabel="Scene timeline"
        accessibilityRole="adjustable"
        onLayout={onLayout}
        style={[styles.trackHitArea, !ready && styles.trackDisabled]}>
        <View style={styles.track}>
          {startRatio !== null && endRatio !== null ? (
            <View
              pointerEvents="none"
              style={[
                styles.rangeFill,
                {
                  left: `${rangeLeft * 100}%`,
                  width: `${rangeWidth * 100}%`,
                },
              ]}
            />
          ) : null}

          {startRatio !== null ? (
            <View
              pointerEvents="none"
              style={[
                styles.marker,
                styles.startMarker,
                (draggingTarget === 'start' || interactionMode === 'start') &&
                  styles.markerActive,
                {left: `${startRatio * 100}%`},
              ]}>
              <Text style={styles.markerCaption}>S</Text>
            </View>
          ) : null}

          {endRatio !== null ? (
            <View
              pointerEvents="none"
              style={[
                styles.marker,
                styles.endMarker,
                (draggingTarget === 'end' || interactionMode === 'end') &&
                  styles.markerActive,
                {left: `${endRatio * 100}%`},
              ]}>
              <Text style={styles.markerCaption}>E</Text>
            </View>
          ) : null}

          <View
            pointerEvents="none"
            style={[
              styles.playhead,
              draggingTarget === 'playhead' &&
                interactionMode === 'scrub' &&
                styles.playheadActive,
              {left: `${playheadRatio * 100}%`},
            ]}
          />
        </View>
      </View>

      {ready && startTime !== null && endTime !== null ? (
        <View style={styles.markerTimesRow}>
          <Text style={[styles.markerTime, styles.startTimeText]}>
            Start {formatClockTimestamp(startTime)}
          </Text>
          <Text style={styles.sceneLength}>
            Scene {formatClockTimestamp(Math.max(0, endTime - startTime))}
          </Text>
          <Text style={[styles.markerTime, styles.endTimeText]}>
            End {formatClockTimestamp(endTime)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  labelsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boundLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  hintLabel: {
    color: '#9CA3AF',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 8,
    textAlign: 'center',
  },
  trackHitArea: {
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: 16,
  },
  trackDisabled: {
    opacity: 0.45,
  },
  track: {
    backgroundColor: '#E5E7EB',
    borderRadius: TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    overflow: 'visible',
    position: 'relative',
    width: '100%',
  },
  rangeFill: {
    backgroundColor: 'rgba(255, 107, 0, 0.35)',
    borderRadius: TRACK_HEIGHT / 2,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  marker: {
    alignItems: 'center',
    borderRadius: MARKER_SIZE / 2,
    height: MARKER_SIZE,
    justifyContent: 'center',
    marginLeft: -(MARKER_SIZE / 2),
    position: 'absolute',
    top: -(MARKER_SIZE - TRACK_HEIGHT) / 2,
    width: MARKER_SIZE,
    zIndex: 3,
  },
  startMarker: {
    backgroundColor: '#16A34A',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  endMarker: {
    backgroundColor: '#DC2626',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  markerActive: {
    transform: [{scale: 1.18}],
  },
  markerCaption: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  playhead: {
    backgroundColor: '#FF6B00',
    borderRadius: 2,
    height: 30,
    marginLeft: -2,
    position: 'absolute',
    top: -9,
    width: 4,
    zIndex: 4,
  },
  playheadActive: {
    backgroundColor: '#EA580C',
    width: 5,
  },
  markerTimesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  markerTime: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  sceneLength: {
    color: '#6B7280',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  startTimeText: {
    color: '#16A34A',
  },
  endTimeText: {
    color: '#DC2626',
  },
});
