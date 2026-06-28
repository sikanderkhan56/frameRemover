import {useCallback, useState, type RefObject} from 'react';
import {
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
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(value => !value);
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  return (
    <View style={[styles.root, isFullscreen && styles.rootFullscreen]}>
      <StatusBar hidden={isFullscreen} />

      {isFullscreen ? (
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
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isFullscreen && {
            minHeight: height - insets.top - insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
          },
          !isFullscreen && {
            paddingBottom: Math.max(insets.bottom, 12),
          },
          isLandscape && !isFullscreen && styles.scrollContentLandscape,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isFullscreen}
        showsVerticalScrollIndicator={!isFullscreen}>
        <View
          style={[
            styles.playerLayout,
            isLandscape && !isFullscreen && styles.playerLayoutLandscape,
            isFullscreen && styles.playerLayoutFullscreen,
          ]}>
          <View
            style={[
              styles.videoWrapper,
              isLandscape && !isFullscreen && styles.videoWrapperLandscape,
              isFullscreen && styles.videoWrapperFullscreen,
            ]}>
            <Video
              ref={videoRef}
              source={{uri: videoUri}}
              style={[
                styles.video,
                isLandscape && !isFullscreen && styles.videoLandscape,
                isFullscreen && styles.videoFullscreen,
              ]}
              resizeMode="contain"
              paused={paused}
              volume={volume}
              controls={false}
              progressUpdateInterval={100}
              onLoad={onVideoLoad}
              onProgress={onVideoProgress}
              onSeek={onVideoSeek}
            />

            {skipNotice ? (
              <View style={styles.skipNotice}>
                <Text style={styles.skipNoticeText}>{skipNotice}</Text>
              </View>
            ) : null}

            {!isFullscreen ? (
              <Pressable
                accessibilityLabel="Enter fullscreen"
                accessibilityRole="button"
                onPress={toggleFullscreen}
                style={({pressed}) => [
                  styles.fullscreenOverlayButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.fullscreenOverlayButtonText}>⛶</Text>
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.sideColumn,
              isLandscape && !isFullscreen && styles.sideColumnLandscape,
              isFullscreen && styles.sideColumnFullscreen,
            ]}>
            <VideoControls
              paused={paused}
              currentTime={currentTime}
              duration={duration}
              isScrubbing={isScrubbing}
              scrubTime={scrubTime}
              volume={volume}
              isFullscreen={isFullscreen}
              onPlayPause={onPlayPause}
              onSkipBack={onSkipBack}
              onSkipForward={onSkipForward}
              onScrubStart={onScrubStart}
              onScrubChange={onScrubChange}
              onScrubComplete={onScrubComplete}
              onVolumeChange={onVolumeChange}
              onToggleFullscreen={toggleFullscreen}
            />

            {!isFullscreen ? (
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
            ) : null}
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  playerLayoutFullscreen: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'space-between',
  },
  sideColumn: {
    gap: 12,
  },
  sideColumnLandscape: {
    flex: 1,
    minWidth: 280,
  },
  sideColumnFullscreen: {
    flexGrow: 0,
  },
  videoWrapper: {
    position: 'relative',
  },
  videoWrapperLandscape: {
    flex: 1.4,
    minWidth: 0,
  },
  videoWrapperFullscreen: {
    flex: 1,
  },
  video: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  videoLandscape: {
    aspectRatio: undefined,
    height: 220,
  },
  videoFullscreen: {
    aspectRatio: undefined,
    borderRadius: 0,
    flex: 1,
    height: undefined,
    width: '100%',
  },
  fullscreenOverlayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 8,
    bottom: 10,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    width: 36,
  },
  fullscreenOverlayButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
  exitFullscreenButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    width: 36,
    zIndex: 10,
  },
  exitFullscreenButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
