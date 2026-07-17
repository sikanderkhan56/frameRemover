import Slider from '@react-native-community/slider';
import {Pressable, StyleSheet, Text, View} from 'react-native';
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
      style={[styles.root, {paddingBottom: Math.max(bottomInset, 8)}]}
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
            <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
            <Text style={styles.skipLabel}>sec</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={paused ? 'Play' : 'Pause'}
            accessibilityRole="button"
            onPress={onPlayPause}
            style={({pressed}) => [
              styles.playButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.playButtonText}>{paused ? '▶' : '❚❚'}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
            accessibilityRole="button"
            onPress={onSkipForward}
            style={({pressed}) => [
              styles.centerButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
            <Text style={styles.skipLabel}>sec</Text>
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
            thumbTintColor="#ffffff"
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
              <Text style={styles.cornerButtonIcon}>
                {isFillMode ? '▣' : '⇱'}
              </Text>
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
              <Text style={styles.cornerButtonIcon}>
                {isFullscreen ? '⤡' : '⤢'}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderColor: 'rgba(229, 9, 20, 0.75)',
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  skipLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: '#e50914',
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  bottomArea: {
    gap: 2,
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
    backgroundColor: 'rgba(255,255,255,0.35)',
    height: 3,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
  },
  progressFill: {
    backgroundColor: '#e50914',
    height: 3,
  },
  progressSlider: {
    height: 22,
    width: '100%',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  cornerButtonGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  cornerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cornerButtonIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  timeText: {
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.75,
  },
});
