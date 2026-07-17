import Slider from '@react-native-community/slider';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';

type VolumeControlProps = {
  volume: number;
  onVolumeChange: (value: number) => void;
};

const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 120;
const AUTO_HIDE_MS = 3000;

function SpeakerIcon({volume}: {volume: number}) {
  const isMuted = volume === 0;

  return (
    <View style={styles.speaker}>
      <View style={styles.speakerBody} />
      <View style={styles.speakerCone} />
      {!isMuted && volume >= 0.35 ? <View style={styles.waveOuter} /> : null}
      {!isMuted && volume >= 0.65 ? <View style={styles.waveInner} /> : null}
      {isMuted ? <View style={styles.muteSlash} /> : null}
    </View>
  );
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
        <SpeakerIcon volume={volume} />
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
          minimumTrackTintColor="#ef4444"
          maximumTrackTintColor="rgba(255,255,255,0.35)"
          thumbTintColor="#ffffff"
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

const ICON_COLOR = '#ffffff';

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  speaker: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 14,
    width: 18,
  },
  speakerBody: {
    backgroundColor: ICON_COLOR,
    height: 8,
    width: 3,
  },
  speakerCone: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 4,
    borderRightColor: ICON_COLOR,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderTopWidth: 4,
    height: 0,
    marginLeft: 1,
    width: 0,
  },
  waveOuter: {
    borderColor: ICON_COLOR,
    borderRadius: 5,
    borderWidth: 1,
    height: 7,
    marginLeft: 1,
    transform: [{rotate: '-45deg'}],
    width: 7,
  },
  waveInner: {
    borderColor: ICON_COLOR,
    borderRadius: 4,
    borderWidth: 1,
    height: 5,
    marginLeft: -3,
    transform: [{rotate: '-45deg'}],
    width: 5,
  },
  muteSlash: {
    backgroundColor: ICON_COLOR,
    height: 12,
    marginLeft: -6,
    transform: [{rotate: '-45deg'}],
    width: 1.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
