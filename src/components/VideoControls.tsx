import Slider from '@react-native-community/slider';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {formatTimestamp} from '../utils/frameSkip';

const SKIP_SECONDS = 5;

type VideoControlsProps = {
  paused: boolean;
  currentTime: number;
  duration: number;
  isScrubbing: boolean;
  scrubTime: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onScrubComplete: (value: number) => void;
};

export function VideoControls({
  paused,
  currentTime,
  duration,
  isScrubbing,
  scrubTime,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onScrubStart,
  onScrubChange,
  onScrubComplete,
}: VideoControlsProps) {
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const sliderValue = duration > 0 ? displayTime / duration : 0;

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={sliderValue}
        minimumTrackTintColor="#3b82f6"
        maximumTrackTintColor="#3a3f4b"
        thumbTintColor="#ffffff"
        onSlidingStart={onScrubStart}
        onValueChange={value => onScrubChange(value * duration)}
        onSlidingComplete={value => onScrubComplete(value * duration)}
      />

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>
          {formatTimestamp(displayTime)} / {formatTimestamp(duration)}
        </Text>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          accessibilityLabel={`Rewind ${SKIP_SECONDS} seconds`}
          accessibilityRole="button"
          onPress={onSkipBack}
          style={({pressed}) => [styles.controlButton, pressed && styles.pressed]}>
          <Text style={styles.controlButtonText}>-{SKIP_SECONDS}s</Text>
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
          style={({pressed}) => [styles.controlButton, pressed && styles.pressed]}>
          <Text style={styles.controlButtonText}>+{SKIP_SECONDS}s</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PLAYER_SKIP_SECONDS = SKIP_SECONDS;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1f27',
    borderRadius: 12,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slider: {
    height: 40,
    width: '100%',
  },
  timeRow: {
    alignItems: 'center',
  },
  timeText: {
    color: '#d1d5db',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  buttonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  controlButton: {
    alignItems: 'center',
    borderColor: '#3a3f4b',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  controlButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
