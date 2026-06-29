import Slider from '@react-native-community/slider';
import {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';

type VolumeControlProps = {
  volume: number;
  onVolumeChange: (value: number) => void;
};

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
        hitSlop={6}
        style={({pressed}) => [styles.button, pressed && styles.pressed]}>
        <SpeakerIcon volume={volume} />
      </Pressable>
    </View>
  );
}

const ICON_COLOR = '#ffffff';

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 28,
  },
  popup: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    bottom: 30,
    paddingHorizontal: 6,
    paddingVertical: 8,
    position: 'absolute',
  },
  sliderSlot: {
    alignItems: 'center',
    height: 88,
    justifyContent: 'center',
    width: 20,
  },
  verticalSlider: {
    height: 18,
    transform: [{rotate: '-90deg'}],
    width: 88,
  },
  button: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  speaker: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 14,
    width: 16,
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
    borderRightColor: ICON_COLOR,
    borderTopColor: 'transparent',
    borderWidth: 1,
    height: 7,
    marginLeft: 1,
    transform: [{rotate: '-45deg'}],
    width: 7,
  },
  waveInner: {
    borderColor: ICON_COLOR,
    borderRadius: 4,
    borderRightColor: ICON_COLOR,
    borderTopColor: 'transparent',
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
