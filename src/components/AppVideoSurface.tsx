import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import Video, {type VideoRef} from 'react-native-video';
import {VLCPlayer} from 'react-native-vlc-media-player';
import {
  needsVlcPlayback,
  normalizeVlcSeconds,
} from '../constants/videoPicker';
import type {
  PlayerLoadData,
  PlayerProgressData,
  SeekablePlayerHandle,
} from '../types/player';

/** Prefer smoother playback over perfect frame timing (helps MKV on device). */
const VLC_INIT_OPTIONS = [
  '--file-caching=2000',
  '--live-caching=2000',
  '--sout-mux-caching=2000',
  '--drop-late-frames',
  '--skip-frames',
  '--avcodec-skiploopfilter=3',
  '--avcodec-skip-frame=1',
  '--avcodec-skip-idct=1',
  '--avcodec-fast',
  '--avcodec-threads=0',
  '--no-stats',
  '--quiet',
];

const VLC_PROGRESS_THROTTLE_MS = 250;
/** Ignore VLC buffering spam if we got progress this recently. */
const VLC_BUFFERING_IGNORE_MS = 600;

type AppVideoSurfaceProps = {
  uri: string;
  fileName?: string;
  paused: boolean;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'none';
  hidden?: boolean;
  onLoad?: (data: PlayerLoadData) => void;
  onProgress?: (data: PlayerProgressData) => void;
  onSeek?: (data: {currentTime: number}) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (message: string) => void;
};

function AppVideoSurfaceInner(
  {
    uri,
    fileName,
    paused,
    style,
    resizeMode = 'contain',
    hidden = false,
    onLoad,
    onProgress,
    onSeek,
    onLoadingChange,
    onError,
  }: AppVideoSurfaceProps,
  ref: Ref<SeekablePlayerHandle | null>,
) {
  const useVlc = needsVlcPlayback(fileName || uri);
  const nativeRef = useRef<VideoRef>(null);
  const vlcRef = useRef<InstanceType<typeof VLCPlayer> | null>(null);
  const durationRef = useRef(0);
  const lastSeekSecondsRef = useRef<number | null>(null);
  const lastProgressEmitRef = useRef(0);
  const lastProgressAtRef = useRef(0);
  const isLoadingRef = useRef(true);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const setLoading = useCallback((isLoading: boolean) => {
    if (isLoadingRef.current === isLoading) {
      return;
    }
    isLoadingRef.current = isLoading;
    onLoadingChangeRef.current?.(isLoading);
  }, []);

  const markReady = useCallback(() => {
    lastProgressAtRef.current = Date.now();
    setLoading(false);
  }, [setLoading]);

  const vlcSource = {
    uri,
    initType: 2 as const,
    initOptions: VLC_INIT_OPTIONS,
  };

  useImperativeHandle(
    ref,
    () => ({
      seek: (timeSeconds: number) => {
        const clamped = Math.max(0, timeSeconds);
        lastSeekSecondsRef.current = clamped;

        if (useVlc) {
          const duration = durationRef.current;
          if (duration > 0) {
            vlcRef.current?.seek(Math.min(1, clamped / duration));
          }
          return;
        }

        nativeRef.current?.seek(clamped);
      },
    }),
    [onSeek, useVlc],
  );

  useEffect(() => {
    durationRef.current = 0;
    lastSeekSecondsRef.current = null;
    lastProgressEmitRef.current = 0;
    lastProgressAtRef.current = 0;
    isLoadingRef.current = true;
    onLoadingChangeRef.current?.(true);
  }, [uri]);

  const emitThrottledProgress = useCallback(
    (currentTime: number) => {
      const pendingSeek = lastSeekSecondsRef.current;
      if (pendingSeek !== null) {
        const tolerance = Math.max(1.5, durationRef.current * 0.002);
        if (Math.abs(currentTime - pendingSeek) <= tolerance) {
          lastSeekSecondsRef.current = null;
          onSeek?.({currentTime});
        }
      }

      // Any real progress means frames are flowing — hide the loader.
      if (currentTime > 0.05) {
        markReady();
      }

      const now = Date.now();
      if (now - lastProgressEmitRef.current < VLC_PROGRESS_THROTTLE_MS) {
        return;
      }
      lastProgressEmitRef.current = now;
      onProgress?.({currentTime});
    },
    [markReady, onProgress, onSeek],
  );

  const handleVlcBuffering = useCallback(() => {
    // MobileVLCKit often reports Buffering while playback continues.
    // Only show the spinner if progress has stalled.
    const stalled =
      lastProgressAtRef.current === 0 ||
      Date.now() - lastProgressAtRef.current > VLC_BUFFERING_IGNORE_MS;
    if (stalled) {
      setLoading(true);
    }
  }, [setLoading]);

  if (hidden) {
    if (useVlc) {
      return (
        <VLCPlayer
          ref={vlcRef}
          source={vlcSource}
          style={styles.hidden}
          paused
          autoplay={false}
          muted
          onPlaying={markReady}
          onLoad={info => {
            const duration = normalizeVlcSeconds(info.duration);
            durationRef.current = duration;
            onLoad?.({duration, currentTime: 0});
          }}
          onProgress={event => {
            const duration = normalizeVlcSeconds(event.duration);
            if (duration > 0 && durationRef.current <= 0) {
              durationRef.current = duration;
              onLoad?.({duration, currentTime: 0});
            }
          }}
          onError={() => {
            setLoading(false);
            onError?.('Could not read this video file.');
          }}
        />
      );
    }

    return (
      <Video
        source={{uri}}
        style={styles.hidden}
        paused
        onLoadStart={() => setLoading(true)}
        onReadyForDisplay={markReady}
        onLoad={data => {
          durationRef.current = data.duration;
          onLoad?.({
            duration: data.duration,
            currentTime: data.currentTime,
            naturalSize: {
              width: data.naturalSize.width,
              height: data.naturalSize.height,
            },
          });
        }}
        onError={() => {
          setLoading(false);
          onError?.('Could not read this video file.');
        }}
      />
    );
  }

  if (useVlc) {
    return (
      <VLCPlayer
        ref={vlcRef}
        source={vlcSource}
        style={style}
        paused={paused}
        autoplay={!paused}
        resizeMode={resizeMode === 'stretch' ? 'fill' : resizeMode}
        volume={100}
        onBuffering={handleVlcBuffering}
        onPlaying={markReady}
        onLoad={info => {
          const duration = normalizeVlcSeconds(info.duration);
          durationRef.current = duration;
          const width = info.videoSize?.width ?? 0;
          const height = info.videoSize?.height ?? 0;
          onLoad?.({
            duration,
            currentTime: 0,
            naturalSize:
              width > 0 && height > 0 ? {width, height} : undefined,
          });
        }}
        onProgress={event => {
          const duration = normalizeVlcSeconds(event.duration);
          const currentTime = normalizeVlcSeconds(event.currentTime);
          if (duration > 0) {
            durationRef.current = duration;
          }
          emitThrottledProgress(currentTime);
        }}
        onError={() => {
          setLoading(false);
          onError?.('This video could not be played.');
        }}
      />
    );
  }

  return (
    <Video
      ref={nativeRef}
      source={{uri}}
      style={style}
      resizeMode={resizeMode}
      paused={paused}
      volume={1}
      controls={false}
      progressUpdateInterval={250}
      onLoadStart={() => setLoading(true)}
      onReadyForDisplay={markReady}
      onBuffer={({isBuffering}) => {
        if (isBuffering) {
          setLoading(true);
        } else {
          markReady();
        }
      }}
      onLoad={data => {
        durationRef.current = data.duration;
        onLoad?.({
          duration: data.duration,
          currentTime: data.currentTime,
          naturalSize: {
            width: data.naturalSize.width,
            height: data.naturalSize.height,
          },
        });
      }}
      onProgress={data => {
        if (data.currentTime > 0.05) {
          markReady();
        }
        onProgress?.({currentTime: data.currentTime});
      }}
      onSeek={data => {
        lastSeekSecondsRef.current = null;
        markReady();
        onSeek?.({currentTime: data.currentTime});
      }}
      onError={error => {
        setLoading(false);
        const message =
          error.error?.errorString ||
          error.error?.localizedDescription ||
          'This video could not be played.';
        onError?.(message);
      }}
    />
  );
}

export const AppVideoSurface = forwardRef(AppVideoSurfaceInner);

const styles = StyleSheet.create({
  hidden: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
});
