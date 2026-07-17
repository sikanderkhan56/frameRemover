import {useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type RefObject} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  LayoutAnimation,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {ContentType} from '../types/content';
import type {
  PlayerLoadData,
  PlayerProgressData,
  SeekablePlayerHandle,
} from '../types/player';
import type {SkipInterval} from '../types/skipInterval';
import {formatTimestamp} from '../utils/frameSkip';
import {computeVideoFrame} from '../utils/videoLayout';
import {AppVideoSurface} from './AppVideoSurface';
import {VideoControls} from './VideoControls';

type VideoPlayerPanelProps = {
  playerRef: RefObject<SeekablePlayerHandle | null>;
  videoUri: string;
  videoFileName?: string;
  paused: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  isScrubbing: boolean;
  scrubTime: number;
  skipNotice: string | null;
  contentType: ContentType | null;
  contentLabel: string;
  contentId: string;
  skipIntervals: SkipInterval[];
  onVideoLoad: (data: PlayerLoadData) => void;
  onVideoProgress: (data: PlayerProgressData) => void;
  onVideoSeek: (data: {currentTime: number}) => void;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onScrubComplete: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onResetSession: () => void;
  onBackFromPlayer: () => void;
  onPlaybackError?: (message: string) => void;
};

const HORIZONTAL_PADDING = 16;
const SWIPE_DISTANCE = 50;
const SEEK_TIMEOUT_MS = 3000;
type AspectRatioMode = 'fit' | 'fill';

export function VideoPlayerPanel({
  playerRef,
  videoUri,
  videoFileName,
  paused,
  volume,
  duration,
  currentTime,
  isScrubbing,
  scrubTime,
  skipNotice,
  contentType,
  contentLabel,
  contentId,
  skipIntervals,
  onVideoLoad,
  onVideoProgress,
  onVideoSeek,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onScrubStart,
  onScrubChange,
  onScrubComplete,
  onVolumeChange,
  onResetSession,
  onBackFromPlayer,
  onPlaybackError,
}: VideoPlayerPanelProps) {
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const [aspectRatioMode, setAspectRatioMode] =
    useState<AspectRatioMode>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const loaderOpacity = useRef(new Animated.Value(1)).current;
  const loaderRotation = useRef(new Animated.Value(0)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const seekTargetRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLoader = isVideoLoading || isSeeking;

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity, showControls]);

  useEffect(() => {
    Animated.timing(loaderOpacity, {
      duration: showLoader ? 120 : 180,
      toValue: showLoader ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [loaderOpacity, showLoader]);

  useEffect(() => {
    if (!showLoader) {
      loaderRotation.stopAnimation();
      loaderRotation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(loaderRotation, {
        duration: 850,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [loaderRotation, showLoader]);

  const toggleControls = useCallback(() => {
    setShowControls(value => !value);
  }, []);

  const animateStageTransition = useCallback(() => {
    LayoutAnimation.configureNext({
      create: {
        duration: 240,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      duration: 280,
      update: {
        duration: 280,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    stageOpacity.setValue(0.72);
    Animated.timing(stageOpacity, {
      duration: 240,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [stageOpacity]);

  const enterFullscreen = useCallback(() => {
    // Do not force an orientation. iOS will keep portrait when the user's
    // system orientation lock is enabled and rotate naturally when it is not.
    setIsFullscreen(true);
    setShowControls(true);
    animateStageTransition();
  }, [animateStageTransition]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setShowControls(true);
    animateStageTransition();
  }, [animateStageTransition]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, isFullscreen]);

  const toggleAspectRatioMode = useCallback(() => {
    setAspectRatioMode(mode => (mode === 'fit' ? 'fill' : 'fit'));
    setShowControls(true);
    animateStageTransition();
  }, [animateStageTransition]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 12 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          const isIntentionalSwipe =
            Math.abs(gesture.dy) >= SWIPE_DISTANCE ||
            Math.abs(gesture.vy) >= 0.35;
          if (!isIntentionalSwipe) {
            return;
          }

          if (!isFullscreen && gesture.dy > 0) {
            enterFullscreen();
          } else if (isFullscreen && gesture.dy < 0) {
            exitFullscreen();
          }
        },
      }),
    [enterFullscreen, exitFullscreen, isFullscreen],
  );

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (isFullscreen) {
        exitFullscreen();
        return true;
      }

      onBackFromPlayer();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress,
    );

    return () => subscription.remove();
  }, [exitFullscreen, isFullscreen, onBackFromPlayer]);

  const handleVideoLoad = useCallback(
    (data: PlayerLoadData) => {
      const naturalWidth = data.naturalSize?.width ?? 0;
      const naturalHeight = data.naturalSize?.height ?? 0;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setVideoAspectRatio(naturalWidth / naturalHeight);
      }
      onVideoLoad(data);
    },
    [onVideoLoad],
  );

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setIsVideoLoading(isLoading);
  }, []);

  const clearSeeking = useCallback(() => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    seekTargetRef.current = null;
    setIsSeeking(false);
  }, []);

  const handleScrubStart = useCallback(() => {
    setIsSeeking(true);
    seekTargetRef.current = null;
    onScrubStart();
  }, [onScrubStart]);

  const handleScrubComplete = useCallback(
    (targetTime: number) => {
      const clampedTarget = Math.max(0, Math.min(targetTime, duration));
      seekTargetRef.current = clampedTarget;
      setIsSeeking(true);
      onScrubComplete(clampedTarget);

      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      seekTimeoutRef.current = setTimeout(() => {
        // Fail safe: never leave the player blocked behind a loader if the
        // native player omits its seek-complete/progress callback.
        setIsVideoLoading(false);
        clearSeeking();
      }, SEEK_TIMEOUT_MS);
    },
    [clearSeeking, duration, onScrubComplete],
  );

  const handleVideoProgress = useCallback(
    (data: PlayerProgressData) => {
      const seekTarget = seekTargetRef.current;
      if (seekTarget !== null) {
        const tolerance = Math.max(1.5, duration * 0.002);
        if (Math.abs(data.currentTime - seekTarget) <= tolerance) {
          clearSeeking();
        }
      }
      onVideoProgress(data);
    },
    [clearSeeking, duration, onVideoProgress],
  );

  const handleVideoSeek = useCallback(
    (data: {currentTime: number}) => {
      clearSeeking();
      onVideoSeek(data);
    },
    [clearSeeking, onVideoSeek],
  );

  useEffect(() => clearSeeking, [clearSeeking, videoUri]);

  const inlineStageSize = useMemo(() => {
    const horizontalInset = isLandscape ? 12 : HORIZONTAL_PADDING;

    if (isLandscape) {
      const availableWidth = windowWidth - horizontalInset * 2 - 12;
      const videoColumnWidth = availableWidth * (1.4 / 2.4);
      return {
        width: videoColumnWidth,
        height: 220,
      };
    }

    const stageWidth = windowWidth - horizontalInset * 2;
    return {
      width: stageWidth,
      height: stageWidth * (9 / 16),
    };
  }, [isLandscape, windowWidth]);

  const stageSize = isFullscreen
    ? {width: windowWidth, height: windowHeight}
    : inlineStageSize;

  const videoFrame = useMemo(() => {
    const mode = aspectRatioMode === 'fill' ? 'cover' : 'contain';

    return computeVideoFrame(
      stageSize.width,
      stageSize.height,
      videoAspectRatio,
      mode,
    );
  }, [
    aspectRatioMode,
    stageSize.height,
    stageSize.width,
    videoAspectRatio,
  ]);

  const controlProps: ComponentProps<typeof VideoControls> = {
    paused,
    currentTime,
    duration,
    isScrubbing,
    scrubTime,
    volume,
    isFullscreen,
    isFillMode: aspectRatioMode === 'fill',
    bottomInset: 0,
    onPlayPause,
    onSkipBack,
    onSkipForward,
    onScrubStart: handleScrubStart,
    onScrubChange,
    onScrubComplete: handleScrubComplete,
    onVolumeChange,
    onToggleAspectRatio: toggleAspectRatioMode,
    onToggleFullscreen: toggleFullscreen,
  };

  return (
    <View style={[styles.root, isFullscreen && styles.rootFullscreen]}>
      <StatusBar
        animated
        backgroundColor="#0f1115"
        barStyle="light-content"
        hidden={isFullscreen}
      />

      <View
        style={[
          styles.videoHost,
          isFullscreen
            ? styles.videoHostFullscreen
            : [
                styles.videoHostInline,
                {
                  left: isLandscape ? 12 : HORIZONTAL_PADDING,
                  top: insets.top + 12,
                },
              ],
        ]}>
        <Animated.View
          {...swipeResponder.panHandlers}
          style={[
            styles.videoStage,
            isFullscreen
              ? styles.videoStageFullscreen
              : {
                  width: stageSize.width,
                  height: stageSize.height,
                },
            !isFullscreen && styles.videoStageRounded,
            {opacity: stageOpacity},
          ]}>
          <AppVideoSurface
            ref={playerRef}
            uri={videoUri}
            fileName={videoFileName}
            paused={paused}
            style={[
              styles.videoElement,
              {
                left: videoFrame.left,
                top: videoFrame.top,
                width: videoFrame.width,
                height: videoFrame.height,
              },
            ]}
            resizeMode={aspectRatioMode === 'fill' ? 'cover' : 'contain'}
            onLoad={handleVideoLoad}
            onProgress={handleVideoProgress}
            onSeek={handleVideoSeek}
            onLoadingChange={handleLoadingChange}
            onError={message => {
              console.error('Video playback error', message);
              onPlaybackError?.(message);
            }}
          />

          <Animated.View
            style={[styles.loadingOverlay, {opacity: loaderOpacity}]}
            pointerEvents="none">
            <Animated.View
              style={[
                styles.loadingSpinner,
                {
                  transform: [
                    {
                      rotate: loaderRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>

          <Pressable
            accessibilityLabel={showControls ? 'Hide controls' : 'Show controls'}
            accessibilityRole="button"
            onPress={toggleControls}
            style={styles.tapLayer}
          />

          {!showLoader || isScrubbing ? (
            <Animated.View
              pointerEvents={showControls ? 'box-none' : 'none'}
              style={[styles.controlsWrap, {opacity: controlsOpacity}]}>
              <VideoControls {...controlProps} />
            </Animated.View>
          ) : null}

          {skipNotice ? (
            <View style={styles.skipNotice} pointerEvents="none">
              <Text style={styles.skipNoticeText}>{skipNotice}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {isFullscreen ? (
        <Animated.View
          pointerEvents={showControls ? 'auto' : 'none'}
          style={[styles.exitButtonWrap, {opacity: controlsOpacity}]}>
          <Pressable
            accessibilityLabel="Exit fullscreen"
            accessibilityRole="button"
            onPress={exitFullscreen}
            style={({pressed}) => [
              styles.exitFullscreenButton,
              {top: insets.top + 8},
              pressed && styles.pressed,
            ]}>
            <Text style={styles.exitFullscreenButtonText}>✕</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {!isFullscreen ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingTop: insets.top + 12,
            },
            isLandscape && styles.scrollContentLandscape,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          <View
            style={[
              styles.playerLayout,
              isLandscape && styles.playerLayoutLandscape,
            ]}>
            <View
              style={[
                styles.inlineVideoSpacer,
                {
                  width: inlineStageSize.width,
                  height: inlineStageSize.height,
                },
              ]}
            />

            <View
              style={[
                styles.sideColumn,
                isLandscape && styles.sideColumnLandscape,
              ]}>
              <View style={styles.infoPanel}>
                <Text style={styles.contentTypeBadge}>
                  {contentType === 'episode' ? 'Web series' : 'Movie'}
                </Text>
                <Text style={styles.infoTitle}>{contentLabel}</Text>
                <Text style={styles.infoSubtitle}>ID: {contentId}</Text>

                {skipIntervals.length > 0 ? (
                  skipIntervals.map(interval => (
                    <Text
                      key={`${interval.start}-${interval.end}`}
                      style={styles.infoRow}>
                      {interval.label ? `${interval.label}: ` : ''}
                      {formatTimestamp(interval.start)} –{' '}
                      {formatTimestamp(interval.end)}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.infoRow}>
                    No cut scenes — playing full video.
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={onResetSession}
                  style={({pressed}) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}>
                  <Text style={styles.secondaryButtonText}>
                    Choose another video
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootFullscreen: {
    backgroundColor: '#000000',
  },
  videoHost: {
    zIndex: 2,
  },
  videoHostInline: {
    position: 'absolute',
  },
  videoHostFullscreen: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  scrollContentLandscape: {
    paddingHorizontal: 12,
  },
  playerLayout: {
    gap: 12,
  },
  playerLayoutLandscape: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  inlineVideoSpacer: {
    flexShrink: 0,
  },
  videoStage: {
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  videoStageFullscreen: {
    ...StyleSheet.absoluteFill,
  },
  videoStageRounded: {
    borderRadius: 12,
  },
  videoElement: {
    position: 'absolute',
  },
  tapLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  controlsWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingSpinner: {
    borderColor: '#ef4444',
    borderRadius: 40,
    borderRightColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 6,
    height: 80,
    width: 80,
  },
  exitButtonWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 11,
  },
  sideColumn: {
    gap: 12,
  },
  sideColumnLandscape: {
    flex: 1,
    minWidth: 280,
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
    zIndex: 4,
  },
  skipNoticeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  exitFullscreenButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    width: 40,
  },
  exitFullscreenButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '400',
  },
  infoPanel: {
    backgroundColor: '#1a1f27',
    borderRadius: 12,
    gap: 6,
    padding: 16,
  },
  contentTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderRadius: 6,
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  infoRow: {
    color: '#b8bec8',
    fontSize: 14,
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
  pressed: {
    opacity: 0.85,
  },
});
