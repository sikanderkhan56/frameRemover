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
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import {useTvRemote} from '../hooks/useTvRemote';
import {playerTheme as theme} from '../theme/playerTheme';
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
import {
  getSkipReasonStyle,
} from '../constants/skipReasons';

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
  contentId: _contentId,
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

  const revealControls = useCallback(() => {
    setShowControls(true);
  }, []);

  // Android TV remote / hardware keyboard: D-pad left/right seek ±5s,
  // center / play-pause toggles playback, and any key surfaces the controls.
  useTvRemote({
    onSkipForward,
    onSkipBack,
    onPlayPause,
    onAnyKey: revealControls,
  });

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
        backgroundColor={isFullscreen ? '#000000' : theme.pageBg}
        barStyle={isFullscreen ? 'light-content' : 'dark-content'}
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
              <Ionicons color={theme.white} name="play-skip-forward" size={14} />
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
            <Ionicons color={theme.white} name="close" size={22} />
          </Pressable>
        </Animated.View>
      ) : null}

      {!isFullscreen ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 16),
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
                <View
                  style={[
                    styles.contentTypeBadge,
                    contentType === 'episode'
                      ? styles.contentTypeBadgeEpisode
                      : styles.contentTypeBadgeMovie,
                  ]}>
                  <Ionicons
                    color={
                      contentType === 'episode' ? theme.purple : theme.orange
                    }
                    name={contentType === 'episode' ? 'tv-outline' : 'film-outline'}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.contentTypeBadgeText,
                      contentType === 'episode'
                        ? styles.contentTypeBadgeTextEpisode
                        : styles.contentTypeBadgeTextMovie,
                    ]}>
                    {contentType === 'episode' ? 'Web series' : 'Movie'}
                  </Text>
                </View>

                <Text style={styles.infoTitle}>{contentLabel}</Text>

                <Text style={styles.sectionLabel}>
                  {skipIntervals.length > 0
                    ? `${skipIntervals.length} cut scene${
                        skipIntervals.length === 1 ? '' : 's'
                      }`
                    : 'Cut scenes'}
                </Text>

                {skipIntervals.length > 0 ? (
                  skipIntervals.map(interval => {
                    const reasonStyle = getSkipReasonStyle(
                      interval.reason ?? 'other',
                    );

                    return (
                      <View
                        key={`${interval.start}-${interval.end}`}
                        style={styles.sceneRow}>
                        <Text style={styles.sceneTime}>
                          {formatTimestamp(interval.start)} –{' '}
                          {formatTimestamp(interval.end)}
                        </Text>
                        {interval.label ? (
                          <View
                            style={[
                              styles.sceneTag,
                              {backgroundColor: reasonStyle.backgroundColor},
                            ]}>
                            <Text
                              style={[
                                styles.sceneTagText,
                                {color: reasonStyle.textColor},
                              ]}>
                              {interval.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
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
    backgroundColor: theme.pageBg,
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
    gap: 14,
  },
  playerLayoutLandscape: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
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
    borderRadius: 18,
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingSpinner: {
    borderColor: theme.orange,
    borderRadius: 40,
    borderRightColor: 'rgba(255, 107, 0, 0.18)',
    borderWidth: 5,
    height: 64,
    width: 64,
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
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.orange,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 4,
  },
  skipNoticeText: {
    color: theme.white,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  exitFullscreenButton: {
    alignItems: 'center',
    backgroundColor: theme.glassStrong,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    width: 44,
  },
  infoPanel: {
    backgroundColor: theme.cardBg,
    borderColor: theme.cardBorder,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  contentTypeBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contentTypeBadgeMovie: {
    backgroundColor: theme.orangeSoft,
  },
  contentTypeBadgeEpisode: {
    backgroundColor: theme.purpleSoft,
  },
  contentTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentTypeBadgeTextMovie: {
    color: theme.orange,
  },
  contentTypeBadgeTextEpisode: {
    color: theme.purple,
  },
  infoTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLabel: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sceneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sceneTime: {
    color: theme.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  sceneTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sceneTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: theme.cardBorder,
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonPressed: {
    backgroundColor: '#F9FAFB',
  },
  secondaryButtonText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
