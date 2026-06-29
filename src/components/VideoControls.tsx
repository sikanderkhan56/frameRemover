import Slider from '@react-native-community/slider';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {formatTimestamp} from '../utils/frameSkip';
import {VolumeControl} from './VolumeControl';

const SKIP_SECONDS = 5;

type VideoControlsProps = {
  paused: boolean;
  currentTime: number;
  duration: number;
  isScrubbing: boolean;
  scrubTime: number;
  volume: number;
  isFullscreen: boolean;
  bottomInset?: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onScrubComplete: (value: number) => void;
  onVolumeChange: (value: number) => void;
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
  bottomInset = 0,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onScrubStart,
  onScrubChange,
  onScrubComplete,
  onVolumeChange,
  onToggleFullscreen,
}: VideoControlsProps) {
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const sliderValue = duration > 0 ? displayTime / duration : 0;

  return (
    <View
      style={[styles.root, {paddingBottom: Math.max(bottomInset, 8)}]}
      pointerEvents="box-none">
      <View style={styles.scrim} pointerEvents="none" />

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

      <View style={styles.bottomBar} pointerEvents="box-none">
        <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />

        <View style={styles.progressColumn}>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={sliderValue}
            minimumTrackTintColor="#ff0000"
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor="#ffffff"
            onSlidingStart={onScrubStart}
            onValueChange={value => onScrubChange(value * duration)}
            onSlidingComplete={value => onScrubComplete(value * duration)}
          />
          <Text style={styles.timeText}>
            {formatTimestamp(displayTime)} / {formatTimestamp(duration)}
          </Text>
        </View>

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
          <Text style={styles.fullscreenIcon}>
            {isFullscreen ? '⤡' : '⤢'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PLAYER_SKIP_SECONDS = SKIP_SECONDS;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    zIndex: 3,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  centerRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
  },
  centerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 20,
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
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  bottomBar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
  },
  progressColumn: {
    flex: 1,
    gap: 2,
    justifyContent: 'flex-end',
    minWidth: 0,
    paddingBottom: 4,
  },
  progressSlider: {
    height: 10,
    marginHorizontal: -6,
    width: '100%',
  },
  timeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cornerButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  fullscreenIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
