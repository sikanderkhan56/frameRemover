import {useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type RefObject} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {
  type OnLoadData,
  type OnProgressData,
  type OnSeekData,
  type VideoRef,
} from 'react-native-video';
import type {ContentType} from '../types/content';
import type {SkipInterval} from '../types/skipInterval';
import {formatTimestamp} from '../utils/frameSkip';
import {computeVideoFrame} from '../utils/videoLayout';
import {VideoControls} from './VideoControls';

type VideoPlayerPanelProps = {
  videoRef: RefObject<VideoRef | null>;
  videoUri: string;
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
  onVideoLoad: (data: OnLoadData) => void;
  onVideoProgress: (data: OnProgressData) => void;
  onVideoSeek: (data: OnSeekData) => void;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onScrubComplete: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onResetSession: () => void;
};

const HORIZONTAL_PADDING = 16;

export function VideoPlayerPanel({
  videoRef,
  videoUri,
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
}: VideoPlayerPanelProps) {
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity, showControls]);

  const toggleControls = useCallback(() => {
    setShowControls(value => !value);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(value => !value);
    setShowControls(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setShowControls(true);
  }, []);

  const handleVideoLoad = useCallback(
    (data: OnLoadData) => {
      const {width: naturalWidth, height: naturalHeight} = data.naturalSize;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setVideoAspectRatio(naturalWidth / naturalHeight);
      }
      onVideoLoad(data);
    },
    [onVideoLoad],
  );

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
    const mode = isFullscreen
      ? isLandscape
        ? 'cover'
        : 'contain'
      : 'contain';

    return computeVideoFrame(
      stageSize.width,
      stageSize.height,
      videoAspectRatio,
      mode,
    );
  }, [
    isFullscreen,
    isLandscape,
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
    bottomInset: isFullscreen ? insets.bottom : 0,
    onPlayPause,
    onSkipBack,
    onSkipForward,
    onScrubStart,
    onScrubChange,
    onScrubComplete,
    onVolumeChange,
    onToggleFullscreen: toggleFullscreen,
  };

  return (
    <View style={[styles.root, isFullscreen && styles.rootFullscreen]}>
      <StatusBar hidden={isFullscreen} />

      <View
        style={[
          styles.videoHost,
          isFullscreen
            ? styles.videoHostFullscreen
            : [
                styles.videoHostInline,
                {left: isLandscape ? 12 : HORIZONTAL_PADDING},
              ],
        ]}>
        <View
          style={[
            styles.videoStage,
            isFullscreen
              ? styles.videoStageFullscreen
              : {
                  width: stageSize.width,
                  height: stageSize.height,
                },
            !isFullscreen && styles.videoStageRounded,
          ]}>
          <Video
            ref={videoRef}
            source={{uri: videoUri}}
            style={[
              styles.videoElement,
              {
                left: videoFrame.left,
                top: videoFrame.top,
                width: videoFrame.width,
                height: videoFrame.height,
              },
            ]}
            resizeMode="contain"
            paused={paused}
            volume={1}
            controls={false}
            progressUpdateInterval={100}
            onLoad={handleVideoLoad}
            onProgress={onVideoProgress}
            onSeek={onVideoSeek}
          />

          <Pressable
            accessibilityLabel={showControls ? 'Hide controls' : 'Show controls'}
            accessibilityRole="button"
            onPress={toggleControls}
            style={styles.tapLayer}
          />

          <Animated.View
            pointerEvents={showControls ? 'box-none' : 'none'}
            style={[styles.controlsWrap, {opacity: controlsOpacity}]}>
            <VideoControls {...controlProps} />
          </Animated.View>

          {skipNotice ? (
            <View style={styles.skipNotice} pointerEvents="none">
              <Text style={styles.skipNoticeText}>{skipNotice}</Text>
            </View>
          ) : null}
        </View>
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
            {paddingBottom: Math.max(insets.bottom, 12)},
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
    top: 12,
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
