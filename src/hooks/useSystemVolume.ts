import {useCallback, useEffect, useState} from 'react';

type VolumeApi = {
  showNativeVolumeUI: (config: {enabled: boolean}) => Promise<void> | void;
  getVolume: () => Promise<{volume: number}>;
  setVolume: (
    value: number,
    config?: {showUI?: boolean},
  ) => Promise<void>;
  addVolumeListener: (
    callback: (result: {volume: number}) => void,
  ) => {remove: () => void};
};

function getVolumeApi(): VolumeApi | null {
  try {
    // Lazy require so a missing/broken native module cannot crash app startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-volume-manager') as {
      VolumeManager?: VolumeApi;
    };
    return mod.VolumeManager ?? null;
  } catch {
    return null;
  }
}

export function useSystemVolume() {
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const VolumeManager = getVolumeApi();
    if (!VolumeManager) {
      return;
    }

    try {
      VolumeManager.showNativeVolumeUI({enabled: false});
    } catch {
      // Ignore native UI toggle failures.
    }

    VolumeManager.getVolume()
      .then(result => {
        if (isMounted) {
          setVolumeState(result.volume);
        }
      })
      .catch(() => {
        // Keep default volume when native module is unavailable.
      });

    let listener: {remove: () => void} | null = null;
    try {
      listener = VolumeManager.addVolumeListener(result => {
        setVolumeState(result.volume);
      });
    } catch {
      // Ignore listener registration failures.
    }

    return () => {
      isMounted = false;
      listener?.remove();
      try {
        VolumeManager.showNativeVolumeUI({enabled: true});
      } catch {
        // Ignore cleanup failures.
      }
    };
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    const VolumeManager = getVolumeApi();
    if (!VolumeManager) {
      return;
    }
    VolumeManager.setVolume(clamped, {showUI: false}).catch(() => {
      // State still updates for the in-app slider.
    });
  }, []);

  return {volume, setVolume};
}
