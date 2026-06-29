import {useCallback, useEffect, useState} from 'react';
import {VolumeManager} from 'react-native-volume-manager';

export function useSystemVolume() {
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    let isMounted = true;

    VolumeManager.showNativeVolumeUI({enabled: false});

    VolumeManager.getVolume()
      .then(result => {
        if (isMounted) {
          setVolumeState(result.volume);
        }
      })
      .catch(() => {
        // Keep default volume when native module is unavailable.
      });

    const listener = VolumeManager.addVolumeListener(result => {
      setVolumeState(result.volume);
    });

    return () => {
      isMounted = false;
      listener.remove();
      VolumeManager.showNativeVolumeUI({enabled: true});
    };
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    VolumeManager.setVolume(clamped, {showUI: false}).catch(() => {
      // State still updates for the in-app slider.
    });
  }, []);

  return {volume, setVolume};
}
