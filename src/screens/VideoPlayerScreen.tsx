import {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {
  type OnLoadData,
  type OnProgressData,
  type OnSeekData,
  type VideoRef,
} from 'react-native-video';
import {
  PLAYER_SKIP_SECONDS,
  VideoControls,
} from '../components/VideoControls';
import {
  HARDCODED_SKIP_INTERVALS,
  SKIP_LEAD_TIME_SECONDS,
} from '../constants/hardcodedSkips';
import {useFrameSkipper} from '../hooks/useFrameSkipper';
import type {SkipInterval} from '../types/skipInterval';
import {formatTimestamp} from '../utils/frameSkip';

export function VideoPlayerScreen() {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<VideoRef>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [skipNotice, setSkipNotice] = useState<string | null>(null);
  const skipNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSkipNotice = useCallback((interval: SkipInterval) => {
    if (skipNoticeTimerRef.current) {
      clearTimeout(skipNoticeTimerRef.current);
    }

    const label = interval.label ?? 'Scene';
    setSkipNotice(`Skipped ${label} (${formatTimestamp(interval.start)} – ${formatTimestamp(interval.end)})`);

    skipNoticeTimerRef.current = setTimeout(() => {
      setSkipNotice(null);
      skipNoticeTimerRef.current = null;
    }, 2500);
  }, []);

  const {handleProgress, handleSeek, reset} = useFrameSkipper(videoRef, {
    intervals: HARDCODED_SKIP_INTERVALS,
    leadTimeSeconds: SKIP_LEAD_TIME_SECONDS,
    onSkipped: showSkipNotice,
  });

  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration || time));
    videoRef.current?.seek(clampedTime);
    setCurrentTime(clampedTime);
  }, [duration]);

  const handleChooseFile = useCallback(async () => {
    setErrorMessage(null);
    setIsPicking(true);

    try {
      const [result] = await pick({
        type: [types.video],
        allowMultiSelection: false,
      });

      reset();
      setPaused(false);
      setDuration(0);
      setCurrentTime(0);
      setSkipNotice(null);
      setVideoUri(result.uri);
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      setErrorMessage('Could not open the selected video. Please try again.');
      console.error(error);
    } finally {
      setIsPicking(false);
    }
  }, [reset]);

  const handleChooseAnotherFile = useCallback(() => {
    reset();
    setVideoUri(null);
    setErrorMessage(null);
    setPaused(false);
    setDuration(0);
    setCurrentTime(0);
    setSkipNotice(null);
  }, [reset]);

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setCurrentTime(data.currentTime);
  }, []);

  const handleVideoProgress = useCallback(
    (progress: OnProgressData) => {
      if (!isScrubbing) {
        setCurrentTime(progress.currentTime);
      }
      handleProgress(progress);
    },
    [handleProgress, isScrubbing],
  );

  const handleVideoSeek = useCallback(
    (seekEvent: OnSeekData) => {
      setCurrentTime(seekEvent.currentTime);
      handleSeek(seekEvent);
    },
    [handleSeek],
  );

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      {!videoUri ? (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Frame Remover</Text>
          <Text style={styles.subtitle}>
            Choose a video from your device to start playback. Inappropriate
            scenes will be skipped automatically using hardcoded test intervals.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isPicking}
            onPress={handleChooseFile}
            style={({pressed}) => [
              styles.primaryButton,
              (pressed || isPicking) && styles.primaryButtonPressed,
            ]}>
            {isPicking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Choose file to play</Text>
            )}
          </Pressable>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.playerContainer}>
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{uri: videoUri}}
              style={styles.video}
              resizeMode="contain"
              paused={paused}
              controls={false}
              progressUpdateInterval={100}
              onLoad={handleVideoLoad}
              onProgress={handleVideoProgress}
              onSeek={handleVideoSeek}
            />

            {skipNotice ? (
              <View style={styles.skipNotice}>
                <Text style={styles.skipNoticeText}>{skipNotice}</Text>
              </View>
            ) : null}
          </View>

          <VideoControls
            paused={paused}
            currentTime={currentTime}
            duration={duration}
            isScrubbing={isScrubbing}
            scrubTime={scrubTime}
            onPlayPause={() => setPaused(value => !value)}
            onSkipBack={() => seekTo(currentTime - PLAYER_SKIP_SECONDS)}
            onSkipForward={() => seekTo(currentTime + PLAYER_SKIP_SECONDS)}
            onScrubStart={() => {
              setIsScrubbing(true);
              setScrubTime(currentTime);
            }}
            onScrubChange={setScrubTime}
            onScrubComplete={time => {
              setIsScrubbing(false);
              seekTo(time);
            }}
          />

          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Hardcoded skip intervals</Text>
            {HARDCODED_SKIP_INTERVALS.map(interval => (
              <Text key={`${interval.start}-${interval.end}`} style={styles.infoRow}>
                {interval.label ? `${interval.label}: ` : ''}
                {formatTimestamp(interval.start)} – {formatTimestamp(interval.end)}
              </Text>
            ))}
            <Text style={styles.infoHint}>
              Edit timestamps in src/constants/hardcodedSkips.ts to match your
              video.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={handleChooseAnotherFile}
              style={({pressed}) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}>
              <Text style={styles.secondaryButtonText}>Choose another file</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#b8bec8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    marginTop: 8,
    minWidth: 220,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  playerContainer: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  videoWrapper: {
    position: 'relative',
  },
  video: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  skipNotice: {
    backgroundColor: 'rgba(59, 130, 246, 0.92)',
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  skipNoticeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoPanel: {
    backgroundColor: '#1a1f27',
    borderRadius: 12,
    gap: 6,
    padding: 16,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoRow: {
    color: '#b8bec8',
    fontSize: 14,
  },
  infoHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderColor: '#3b82f6',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
  },
});
