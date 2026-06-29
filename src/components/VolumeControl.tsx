import Slider from '@react-native-community/slider';
import {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';

type VolumeControlProps = {
  volume: number;
  onVolumeChange: (value: number) => void;
};

function volumeIcon(level: number): string {
  if (level === 0) {
    return '🔇';
  }

  if (level < 0.5) {
    return '🔉';
  }

  return '🔊';
}

export function VolumeControl({volume, onVolumeChange}: VolumeControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(popupOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(popupTranslateY, {
        toValue: isOpen ? 0 : 8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, popupOpacity, popupTranslateY]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.popup,
          {
            opacity: popupOpacity,
            transform: [{translateY: popupTranslateY}],
          },
        ]}>
        <View style={styles.sliderSlot}>
          <Slider
            accessibilityLabel="Volume"
            style={styles.verticalSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor="#ffffff"
            onValueChange={onVolumeChange}
          />
        </View>
      </Animated.View>

      <Pressable
        accessibilityLabel={isOpen ? 'Close volume' : 'Open volume'}
        accessibilityRole="button"
        onPress={() => setIsOpen(value => !value)}
        style={({pressed}) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.icon}>{volumeIcon(volume)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 40,
  },
  popup: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    bottom: 44,
    paddingHorizontal: 6,
    paddingVertical: 8,
    position: 'absolute',
  },
  sliderSlot: {
    alignItems: 'center',
    height: 96,
    justifyContent: 'center',
    width: 24,
  },
  verticalSlider: {
    height: 20,
    transform: [{rotate: '-90deg'}],
    width: 96,
  },
  button: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  icon: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
