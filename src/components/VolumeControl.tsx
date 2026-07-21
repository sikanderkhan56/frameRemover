import Slider from '@react-native-community/slider';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import {playerTheme as theme} from '../theme/playerTheme';

type VolumeControlProps = {
  volume: number;
  onVolumeChange: (value: number) => void;
};

const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 128;
const AUTO_HIDE_MS = 3000;

function volumeIconName(volume: number): 'volume-mute' | 'volume-low' | 'volume-medium' | 'volume-high' {
  if (volume === 0) {
    return 'volume-mute';
  }
  if (volume < 0.35) {
    return 'volume-low';
  }
  if (volume < 0.7) {
    return 'volume-medium';
  }
  return 'volume-high';
}

export function VolumeControl({volume, onVolumeChange}: VolumeControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const width = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const sliderOpacity = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAudibleVolume = useRef(volume > 0 ? volume : 1);

  const clearAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHide();
    autoHideTimer.current = setTimeout(() => {
      setIsExpanded(false);
    }, AUTO_HIDE_MS);
  }, [clearAutoHide]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(sliderOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isExpanded, sliderOpacity, width]);

  useEffect(() => clearAutoHide, [clearAutoHide]);

  useEffect(() => {
    if (volume > 0) {
      lastAudibleVolume.current = volume;
    }
  }, [volume]);

  const revealTemporarily = useCallback(() => {
    setIsExpanded(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const onIconPress = useCallback(() => {
    if (!isExpanded) {
      revealTemporarily();
      return;
    }

    onVolumeChange(volume > 0 ? 0 : lastAudibleVolume.current);
    scheduleAutoHide();
  }, [
    isExpanded,
    onVolumeChange,
    revealTemporarily,
    scheduleAutoHide,
    volume,
  ]);

  return (
    <Animated.View style={[styles.wrap, {width}]}>
      <Pressable
        accessibilityLabel={
          !isExpanded
            ? 'Open volume'
            : volume === 0
              ? 'Unmute'
              : 'Mute'
        }
        accessibilityRole="button"
        hitSlop={6}
        onPress={onIconPress}
        style={({pressed}) => [styles.button, pressed && styles.pressed]}>
        <Ionicons
          color={theme.white}
          name={volumeIconName(volume)}
          size={20}
        />
      </Pressable>

      <Animated.View
        pointerEvents={isExpanded ? 'auto' : 'none'}
        style={[styles.sliderSlot, {opacity: sliderOpacity}]}>
        <Slider
          accessibilityLabel="Volume"
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          minimumTrackTintColor={theme.orange}
          maximumTrackTintColor="rgba(255,255,255,0.35)"
          thumbTintColor={theme.white}
          onSlidingStart={clearAutoHide}
          onSlidingComplete={scheduleAutoHide}
          onValueChange={value => {
            onVolumeChange(value);
            if (value > 0) {
              lastAudibleVolume.current = value;
            }
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: 22,
    flexDirection: 'row',
    height: 44,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  sliderSlot: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  slider: {
    height: 28,
    transform: [{scale: 0.78}],
    width: '100%',
  },
  button: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 28,
  },
  pressed: {
    opacity: 0.75,
  },
});
