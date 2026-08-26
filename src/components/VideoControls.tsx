import Slider from '@react-native-community/slider';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import {playerTheme as theme} from '../theme/playerTheme';
import {formatTimestamp} from '../utils/frameSkip';
import {VolumeControl} from './VolumeControl';

const SKIP_SECONDS = 5;
const SLIDER_THUMB = require('../assets/slider-thumb.png');

type VideoControlsProps = {
  paused: boolean;
  currentTime: number;
  duration: number;
  isScrubbing: boolean;
  scrubTime: number;
  volume: number;
  isFullscreen: boolean;
  isFillMode: boolean;
  bottomInset?: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onScrubComplete: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleAspectRatio: () => void;
  onToggleFullscreen: () => void;
};

export function VideoControls({
  paused,
  currentTime,
  duration,
  isScrubbing,
  scrubTime,
  volume,
  isFullscreen,
  isFillMode,
  bottomInset = 0,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onScrubStart,
  onScrubChange,
  onScrubComplete,
  onVolumeChange,
  onToggleAspectRatio,
  onToggleFullscreen,
}: VideoControlsProps) {
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const sliderValue =
    duration > 0 && Number.isFinite(displayTime)
      ? Math.max(0, Math.min(1, displayTime / duration))
      : 0;
  const progressWidth = `${sliderValue * 100}%` as `${number}%`;

  return (
    <View
      style={[styles.root, {paddingBottom: Math.max(bottomInset, 10)}]}
      pointerEvents="box-none">
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.centerArea} pointerEvents="box-none">
        <View style={styles.centerRow} pointerEvents="box-none">
          <Pressable
            accessibilityLabel={`Rewind ${SKIP_SECONDS} seconds`}
            accessibilityRole="button"
            onPress={onSkipBack}
            style={({pressed}) => [
              styles.centerButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={theme.white} name="play-back" size={18} />
            <Text style={styles.skipBadge}>{SKIP_SECONDS}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={paused ? 'Play' : 'Pause'}
            accessibilityRole="button"
            onPress={onPlayPause}
            style={({pressed}) => [
              styles.playButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              color={theme.white}
              name={paused ? 'play' : 'pause'}
              size={24}
              style={paused ? styles.playIconOffset : undefined}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
            accessibilityRole="button"
            onPress={onSkipForward}
            style={({pressed}) => [
              styles.centerButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={theme.white} name="play-forward" size={18} />
            <Text style={styles.skipBadge}>{SKIP_SECONDS}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomArea} pointerEvents="box-none">
        <View style={styles.progressRow}>
          <View style={styles.progressTrack} pointerEvents="none">
            <View style={[styles.progressFill, {width: progressWidth}]} />
          </View>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={sliderValue}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbImage={SLIDER_THUMB}
            thumbTintColor={theme.orange}
            onSlidingStart={onScrubStart}
            onValueChange={value => onScrubChange(value * duration)}
            onSlidingComplete={value => onScrubComplete(value * duration)}
          />
        </View>

        <View style={styles.bottomRow}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />

          <Text style={styles.timeText} numberOfLines={1}>
            {formatTimestamp(displayTime)} / {formatTimestamp(duration)}
          </Text>

          <View style={styles.cornerButtonGroup}>
            <Pressable
              accessibilityLabel={
                isFillMode ? 'Switch to fit mode' : 'Switch to fill mode'
              }
              accessibilityRole="button"
              onPress={onToggleAspectRatio}
              style={({pressed}) => [
                styles.cornerButton,
                pressed && styles.pressed,
              ]}>
              <Ionicons
                color={theme.white}
                name={isFillMode ? 'contract-outline' : 'expand-outline'}
                size={16}
              />
            </Pressable>

            <Pressable
              accessibilityLabel={
                isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
              }
              accessibilityRole="button"
              onPress={onToggleFullscreen}
              style={({pressed}) => [
                styles.cornerButton,
                pressed && styles.pressed,
              ]}>
              <Ionicons
                color={theme.white}
                name={
                  isFullscreen ? 'close-outline' : 'tablet-landscape-outline'
                }
                size={18}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export const PLAYER_SKIP_SECONDS = SKIP_SECONDS;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 3,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.scrim,
  },
  centerArea: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  centerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  centerButton: {
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: 26,
    height: 44,
    justifyContent: 'center',
    width: 42,
  },
  skipBadge: {
    color: theme.white,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: theme.orange,
    borderRadius: 32,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  playIconOffset: {
    marginLeft: 3,
  },
  bottomArea: {
    gap: 4,
    width: '100%',
    zIndex: 4,
  },
  progressRow: {
    height: 22,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    width: '100%',
  },
  progressTrack: {
    backgroundColor: theme.track,
    borderRadius: 999,
    height: 4,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
  },
  progressFill: {
    backgroundColor: theme.orange,
    borderRadius: 999,
    height: 4,
  },
  progressSlider: {
    height: 22,
    width: '100%',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  cornerButtonGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  cornerButton: {
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  timeText: {
    color: 'rgba(255,255,255,0.95)',
    flexShrink: 1,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
