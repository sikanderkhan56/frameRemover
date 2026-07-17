import {useCallback, useRef, type RefObject} from 'react';
import type {PlayerProgressData, SeekablePlayerHandle} from '../types/player';
import type {SkipInterval} from '../types/skipInterval';
import {findActiveSkipInterval} from '../utils/frameSkip';

const SEEK_RESET_MS = 600;

type UseFrameSkipperOptions = {
  intervals: SkipInterval[];
  leadTimeSeconds?: number;
  onSkipped?: (interval: SkipInterval) => void;
};

export function useFrameSkipper(
  playerRef: RefObject<SeekablePlayerHandle | null>,
  {intervals, leadTimeSeconds = 0.25, onSkipped}: UseFrameSkipperOptions,
) {
  const isSeekingRef = useRef(false);
  const seekResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSeekResetTimer = useCallback(() => {
    if (seekResetTimerRef.current) {
      clearTimeout(seekResetTimerRef.current);
      seekResetTimerRef.current = null;
    }
  }, []);

  const scheduleSeekReset = useCallback(() => {
    clearSeekResetTimer();
    seekResetTimerRef.current = setTimeout(() => {
      isSeekingRef.current = false;
      seekResetTimerRef.current = null;
    }, SEEK_RESET_MS);
  }, [clearSeekResetTimer]);

  const skipIfNeeded = useCallback(
    (currentTime: number) => {
      const activeInterval = findActiveSkipInterval(
        currentTime,
        intervals,
        leadTimeSeconds,
      );

      if (!activeInterval || isSeekingRef.current) {
        return;
      }

      isSeekingRef.current = true;
      playerRef.current?.seek(activeInterval.end);
      onSkipped?.(activeInterval);
      scheduleSeekReset();
    },
    [intervals, leadTimeSeconds, onSkipped, playerRef, scheduleSeekReset],
  );

  const handleProgress = useCallback(
    (progress: PlayerProgressData) => {
      skipIfNeeded(progress.currentTime);
    },
    [skipIfNeeded],
  );

  const handleSeek = useCallback(
    (seekEvent: {currentTime: number}) => {
      isSeekingRef.current = false;
      clearSeekResetTimer();
      skipIfNeeded(seekEvent.currentTime);
    },
    [clearSeekResetTimer, skipIfNeeded],
  );

  const reset = useCallback(() => {
    isSeekingRef.current = false;
    clearSeekResetTimer();
  }, [clearSeekResetTimer]);

  return {
    handleProgress,
    handleSeek,
    reset,
  };
}
