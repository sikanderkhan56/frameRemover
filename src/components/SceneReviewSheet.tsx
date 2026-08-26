import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppVideoSurface} from './AppVideoSurface';
import {
  SceneTimeline,
  type TimelineDragTarget,
  type TimelineInteractionMode,
} from './SceneTimeline';
import {
  SKIP_REASONS,
  type SkipReason,
} from '../constants/skipReasons';
import type {PlayerLoadData, SeekablePlayerHandle} from '../types/player';
import {formatClockTimestamp} from '../utils/frameSkip';
import {
  buildReviewWindow,
  expandReviewWindow,
} from '../utils/reviewWindow';

export type SceneReviewConfirmPayload = {
  start: number;
  end: number;
  reason: SkipReason;
};

export type SceneReviewInitialValues = {
  start: number | null;
  end: number | null;
  reason: SkipReason | '';
  /** When set, enables "Reset to AI Suggestion". */
  aiOriginal?: {
    start: number;
    end: number;
    reason: SkipReason;
  } | null;
};

type SceneReviewSheetProps = {
  visible: boolean;
  title: string;
  confirmLabel?: string;
  videoUri: string;
  videoFileName?: string;
  duration: number;
  initial: SceneReviewInitialValues;
  onConfirm: (payload: SceneReviewConfirmPayload) => void;
  onCancel: () => void;
  /** Fired when the preview player reports a usable duration. */
  onDurationDetected?: (duration: number) => void;
};

const SEEK_THROTTLE_MS = 140;
const PLAYHEAD_UI_MS = 200;
const EXPAND_THROTTLE_MS = 400;

export function SceneReviewSheet({
  visible,
  title,
  confirmLabel = 'Confirm Scene',
  videoUri,
  videoFileName,
  duration,
  initial,
  onConfirm,
  onCancel,
  onDurationDetected,
}: SceneReviewSheetProps) {
  const playerRef = useRef<SeekablePlayerHandle | null>(null);
  const playheadRef = useRef(initial.start ?? initial.end ?? 0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const startTimeRef = useRef<number | null>(initial.start);
  const endTimeRef = useRef<number | null>(initial.end);
  const lastSeekAtRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playheadUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExpandAtRef = useRef(0);
  const hasSeekedOnLoadRef = useRef(false);

  const [startTime, setStartTime] = useState<number | null>(initial.start);
  const [endTime, setEndTime] = useState<number | null>(initial.end);
  const [playhead, setPlayhead] = useState(
    initial.start ?? initial.end ?? 0,
  );
  const [reason, setReason] = useState<SkipReason | ''>(initial.reason);
  const [error, setError] = useState<string | null>(null);
  const [draggingTarget, setDraggingTarget] =
    useState<TimelineDragTarget | null>(null);
  const [interactionMode, setInteractionMode] =
    useState<TimelineInteractionMode>('scrub');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [resolvedDuration, setResolvedDuration] = useState(
    duration > 0 ? duration : 0,
  );
  const [isPaused, setIsPaused] = useState(false);
  const [windowStart, setWindowStart] = useState(0);
  const [windowEnd, setWindowEnd] = useState(0);
  const windowRef = useRef({start: 0, end: 0});

  startTimeRef.current = startTime;
  endTimeRef.current = endTime;
  windowRef.current = {start: windowStart, end: windowEnd};

  const applyWindow = useCallback(
    (start: number | null, end: number | null, mediaDuration: number) => {
      const next = buildReviewWindow(start, end, mediaDuration);
      windowRef.current = {start: next.windowStart, end: next.windowEnd};
      setWindowStart(next.windowStart);
      setWindowEnd(next.windowEnd);
    },
    [],
  );

  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSeek = useCallback((seconds: number) => {
    pendingSeekRef.current = null;
    lastSeekAtRef.current = Date.now();
    playerRef.current?.seek(Math.max(0, seconds));
  }, []);

  const kickPlayback = useCallback(
    (atSeconds: number) => {
      const t = Math.max(0, atSeconds);
      playheadRef.current = t;
      // VLC often shows a black surface after unpause until a seek forces decode.
      flushSeek(t);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null;
        flushSeek(t);
      }, 80);
    },
    [flushSeek],
  );

  const scheduleSeek = useCallback(
    (seconds: number, force = false) => {
      const clamped = Math.max(0, seconds);
      playheadRef.current = clamped;
      setPlayhead(clamped);

      if (force) {
        if (seekTimerRef.current) {
          clearTimeout(seekTimerRef.current);
          seekTimerRef.current = null;
        }
        flushSeek(clamped);
        return;
      }

      const elapsed = Date.now() - lastSeekAtRef.current;
      if (elapsed >= SEEK_THROTTLE_MS) {
        flushSeek(clamped);
        return;
      }

      pendingSeekRef.current = clamped;
      if (seekTimerRef.current) {
        return;
      }
      seekTimerRef.current = setTimeout(() => {
        seekTimerRef.current = null;
        if (pendingSeekRef.current !== null) {
          flushSeek(pendingSeekRef.current);
        }
      }, SEEK_THROTTLE_MS - elapsed);
    },
    [flushSeek],
  );

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setIsPaused(next);
  }, []);

  // After unpause commits to the native player, re-seek so VLC paints frames again.
  const wasPausedRef = useRef(false);
  useEffect(() => {
    if (wasPausedRef.current && !isPaused && visible) {
      const t = playheadRef.current;
      const frame = requestAnimationFrame(() => {
        kickPlayback(t);
      });
      const delayed = setTimeout(() => {
        kickPlayback(playheadRef.current);
      }, 160);
      wasPausedRef.current = isPaused;
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(delayed);
      };
    }
    wasPausedRef.current = isPaused;
  }, [isPaused, kickPlayback, visible]);

  useEffect(() => {
    if (duration <= 0) {
      return;
    }
    setResolvedDuration(current => (current > 0 ? current : duration));
  }, [duration]);

  useEffect(() => {
    if (!visible || resolvedDuration <= 0) {
      return;
    }
    if (windowRef.current.end <= windowRef.current.start) {
      applyWindow(startTimeRef.current, endTimeRef.current, resolvedDuration);
    }
  }, [applyWindow, resolvedDuration, visible]);

  useEffect(() => {
    if (!visible) {
      hasSeekedOnLoadRef.current = false;
      pausedRef.current = false;
      if (seekTimerRef.current) {
        clearTimeout(seekTimerRef.current);
        seekTimerRef.current = null;
      }
      if (playheadUiTimerRef.current) {
        clearTimeout(playheadUiTimerRef.current);
        playheadUiTimerRef.current = null;
      }
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      return;
    }

    const openAt = initial.start ?? initial.end ?? 0;
    setStartTime(initial.start);
    setEndTime(initial.end);
    startTimeRef.current = initial.start;
    endTimeRef.current = initial.end;
    setReason(initial.reason);
    setError(null);
    setDraggingTarget(null);
    setInteractionMode('scrub');
    setScrollEnabled(true);
    setIsPreviewLoading(true);
    pausedRef.current = false;
    setIsPaused(false);
    hasSeekedOnLoadRef.current = false;
    playheadRef.current = openAt;
    setPlayhead(openAt);

    const media = duration > 0 ? duration : resolvedDuration;
    if (media > 0) {
      setResolvedDuration(media);
      applyWindow(initial.start, initial.end, media);
    } else {
      setWindowStart(0);
      setWindowEnd(0);
    }

    return () => {
      if (seekTimerRef.current) {
        clearTimeout(seekTimerRef.current);
        seekTimerRef.current = null;
      }
      if (playheadUiTimerRef.current) {
        clearTimeout(playheadUiTimerRef.current);
        playheadUiTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visible,
    initial.start,
    initial.end,
    initial.reason,
    initial.aiOriginal?.start,
    initial.aiOriginal?.end,
    initial.aiOriginal?.reason,
  ]);

  const handlePreviewLoad = useCallback(
    (data: PlayerLoadData) => {
      if (data.duration > 0) {
        setResolvedDuration(data.duration);
        onDurationDetected?.(data.duration);
        applyWindow(startTimeRef.current, endTimeRef.current, data.duration);
      }

      if (!hasSeekedOnLoadRef.current) {
        hasSeekedOnLoadRef.current = true;
        flushSeek(playheadRef.current);
      }

      setIsPreviewLoading(false);
    },
    [applyWindow, flushSeek, onDurationDetected],
  );

  const handleProgress = useCallback(
    (currentTime: number) => {
      if (isPreviewLoading) {
        setIsPreviewLoading(false);
      }

      if (draggingRef.current || pausedRef.current) {
        return;
      }

      const sceneEnd = endTimeRef.current;
      const sceneStart = startTimeRef.current;

      // Loop inside the selected scene so review stays focused.
      if (
        sceneEnd !== null &&
        sceneStart !== null &&
        currentTime >= sceneEnd - 0.05
      ) {
        playheadRef.current = sceneStart;
        setPlayhead(sceneStart);
        flushSeek(sceneStart);
        return;
      }

      playheadRef.current = currentTime;
      if (playheadUiTimerRef.current) {
        return;
      }
      playheadUiTimerRef.current = setTimeout(() => {
        playheadUiTimerRef.current = null;
        setPlayhead(playheadRef.current);
      }, PLAYHEAD_UI_MS);
    },
    [flushSeek, isPreviewLoading],
  );

  const handleDraggingTargetChange = useCallback(
    (target: TimelineDragTarget | null) => {
      draggingRef.current = target !== null;
      setDraggingTarget(target);
      setScrollEnabled(target === null);
      if (target === null && pendingSeekRef.current !== null) {
        flushSeek(pendingSeekRef.current);
      }
    },
    [flushSeek],
  );

  const handleRequestExpand = useCallback(
    (edge: 'left' | 'right') => {
      const now = Date.now();
      if (now - lastExpandAtRef.current < EXPAND_THROTTLE_MS) {
        return;
      }
      lastExpandAtRef.current = now;
      const expanded = expandReviewWindow(
        windowRef.current.start,
        windowRef.current.end,
        resolvedDuration,
        edge,
      );
      windowRef.current = {start: expanded.windowStart, end: expanded.windowEnd};
      setWindowStart(expanded.windowStart);
      setWindowEnd(expanded.windowEnd);
    },
    [resolvedDuration],
  );

  const handleWidenWindow = useCallback(() => {
    const expanded = expandReviewWindow(
      windowRef.current.start,
      windowRef.current.end,
      resolvedDuration,
      'both',
      0.5,
    );
    windowRef.current = {start: expanded.windowStart, end: expanded.windowEnd};
    setWindowStart(expanded.windowStart);
    setWindowEnd(expanded.windowEnd);
  }, [resolvedDuration]);

  const handleFitToScene = useCallback(() => {
    applyWindow(startTime, endTime, resolvedDuration);
  }, [applyWindow, endTime, resolvedDuration, startTime]);

  const handleStartChange = useCallback(
    (seconds: number) => {
      setStartTime(seconds);
      startTimeRef.current = seconds;
      setError(null);
      scheduleSeek(seconds);
    },
    [scheduleSeek],
  );

  const handleEndChange = useCallback(
    (seconds: number) => {
      setEndTime(seconds);
      endTimeRef.current = seconds;
      setError(null);
      scheduleSeek(seconds);
    },
    [scheduleSeek],
  );

  const handlePlayheadChange = useCallback(
    (seconds: number) => {
      setError(null);
      setInteractionMode('scrub');
      scheduleSeek(seconds);
    },
    [scheduleSeek],
  );

  const handleAdjustStart = useCallback(() => {
    setStartTime(playhead);
    startTimeRef.current = playhead;
    setInteractionMode('start');
    setError(null);
    if (endTime !== null && playhead >= endTime) {
      setError('Start must be before end');
    }
  }, [endTime, playhead]);

  const handleAdjustEnd = useCallback(() => {
    setEndTime(playhead);
    endTimeRef.current = playhead;
    setInteractionMode('end');
    setError(null);
    if (startTime !== null && playhead <= startTime) {
      setError('Start must be before end');
    }
  }, [playhead, startTime]);

  const handleClear = useCallback(() => {
    setStartTime(null);
    setEndTime(null);
    startTimeRef.current = null;
    endTimeRef.current = null;
    setInteractionMode('scrub');
    setError(null);
    if (resolvedDuration > 0) {
      applyWindow(null, null, resolvedDuration);
    }
  }, [applyWindow, resolvedDuration]);

  const handleResetToAi = useCallback(() => {
    const original = initial.aiOriginal;
    if (!original) {
      return;
    }
    setStartTime(original.start);
    setEndTime(original.end);
    startTimeRef.current = original.start;
    endTimeRef.current = original.end;
    setReason(original.reason);
    setInteractionMode('scrub');
    setError(null);
    pausedRef.current = false;
    setIsPaused(false);
    applyWindow(original.start, original.end, resolvedDuration);
    scheduleSeek(original.start, true);
  }, [applyWindow, initial.aiOriginal, resolvedDuration, scheduleSeek]);

  const handleConfirm = useCallback(() => {
    if (startTime === null) {
      setError('Set a start time.');
      return;
    }
    if (endTime === null) {
      setError('Set an end time.');
      return;
    }
    if (!reason) {
      setError('Select a reason.');
      return;
    }
    if (startTime >= endTime) {
      setError('Start must be before end');
      return;
    }

    onConfirm({start: startTime, end: endTime, reason});
  }, [endTime, onConfirm, reason, startTime]);

  const startLabel =
    startTime !== null ? formatClockTimestamp(startTime) : '—';
  const endLabel = endTime !== null ? formatClockTimestamp(endTime) : '—';
  const hasRange = startTime !== null || endTime !== null;
  const adjustStartLabel = startTime !== null ? 'Adjust Start' : 'Set Start';
  const adjustEndLabel = endTime !== null ? 'Adjust End' : 'Set End';

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.sheetBackdrop}
        />

        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.previewFrame}>
              {visible ? (
                <AppVideoSurface
                  ref={playerRef}
                  fileName={videoFileName}
                  muted
                  paused={isPaused}
                  resizeMode="contain"
                  style={styles.previewVideo}
                  uri={videoUri}
                  onLoad={handlePreviewLoad}
                  onProgress={data => handleProgress(data.currentTime)}
                  onError={() => {
                    setIsPreviewLoading(false);
                    pausedRef.current = true;
                    setIsPaused(true);
                    setError('Could not load video preview for this file.');
                  }}
                />
              ) : null}

              {isPreviewLoading ? (
                <View style={styles.previewLoading} pointerEvents="none">
                  <ActivityIndicator color="#FF6B00" size="large" />
                  <Text style={styles.previewLoadingText}>Loading preview…</Text>
                </View>
              ) : null}

              <View style={styles.previewChrome} pointerEvents="box-none">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Play preview' : 'Pause preview'}
                  hitSlop={12}
                  onPress={togglePause}
                  style={({pressed}) => [
                    styles.previewPlayButton,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.previewPlayButtonText}>
                    {isPaused ? 'Play' : 'Pause'}
                  </Text>
                </Pressable>
                <Text style={styles.previewTime}>
                  {formatClockTimestamp(playhead)}
                </Text>
              </View>
            </View>

            <SceneTimeline
              draggingTarget={draggingTarget}
              endTime={endTime}
              interactionMode={interactionMode}
              mediaDuration={resolvedDuration}
              playhead={playhead}
              startTime={startTime}
              windowEnd={windowEnd}
              windowStart={windowStart}
              onDraggingTargetChange={handleDraggingTargetChange}
              onEndChange={handleEndChange}
              onPlayheadChange={handlePlayheadChange}
              onRequestExpand={handleRequestExpand}
              onStartChange={handleStartChange}
            />

            <View style={styles.windowActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleFitToScene}
                style={({pressed}) => [
                  styles.windowButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.windowButtonText}>Fit to scene</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleWidenWindow}
                style={({pressed}) => [
                  styles.windowButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.windowButtonText}>Widen window</Text>
              </Pressable>
            </View>

            <Text style={styles.timestampsDisplay} accessibilityRole="text">
              Start: {startLabel}  |  End: {endLabel}
            </Text>

            <View style={styles.adjustRow}>
              <Pressable
                accessibilityRole="button"
                onPress={handleAdjustStart}
                style={({pressed}) => [
                  styles.adjustButton,
                  interactionMode === 'start' && styles.adjustButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.adjustButtonText,
                    interactionMode === 'start' && styles.adjustButtonTextActive,
                  ]}>
                  {adjustStartLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleAdjustEnd}
                style={({pressed}) => [
                  styles.adjustButton,
                  interactionMode === 'end' && styles.adjustButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.adjustButtonText,
                    interactionMode === 'end' && styles.adjustButtonTextActive,
                  ]}>
                  {adjustEndLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleClear}
                style={({pressed}) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            </View>

            {interactionMode !== 'scrub' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setInteractionMode('scrub')}
                style={({pressed}) => [
                  styles.resetAiButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.resetAiButtonText}>Done adjusting</Text>
              </Pressable>
            ) : null}

            {initial.aiOriginal ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleResetToAi}
                style={({pressed}) => [
                  styles.resetAiButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.resetAiButtonText}>
                  Reset to AI Suggestion
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.fieldLabel}>Reason</Text>
            <View style={styles.reasonGrid}>
              {SKIP_REASONS.map(item => {
                const selected = reason === item.value;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                      setReason(item.value);
                      setError(null);
                    }}
                    style={[
                      styles.reasonChip,
                      selected && {
                        backgroundColor: item.style.backgroundColor,
                        borderColor: item.style.borderColor,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.reasonChipText,
                        selected && {color: item.style.textColor},
                      ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.sheetErrorText}>{error}</Text> : null}

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={({pressed}) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleConfirm}
                style={({pressed}) => [
                  styles.confirmButton,
                  !hasRange && styles.confirmButtonMuted,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
    height: 5,
    marginBottom: 10,
    width: 42,
  },
  sheetTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  previewFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  previewVideo: {
    ...StyleSheet.absoluteFill,
  },
  previewLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    gap: 10,
  },
  previewLoadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  previewChrome: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  previewPlayButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewPlayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewTime: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  windowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  windowButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  windowButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  timestampsDisplay: {
    color: '#111827',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustButton: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  adjustButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  adjustButtonText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  adjustButtonTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  resetAiButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resetAiButtonText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonChip: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reasonChipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetErrorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  confirmButtonMuted: {
    opacity: 0.9,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
