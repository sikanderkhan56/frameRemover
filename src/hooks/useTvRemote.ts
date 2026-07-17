import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';

// Android hardware / TV remote key codes.
// https://developer.android.com/reference/android/view/KeyEvent
const KEYCODE = {
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  ENTER: 66,
  SPACE: 62,
  BUTTON_SELECT: 96,
  MEDIA_PLAY_PAUSE: 85,
  MEDIA_PLAY: 126,
  MEDIA_PAUSE: 127,
  MEDIA_REWIND: 89,
  MEDIA_FAST_FORWARD: 90,
  MEDIA_NEXT: 87,
  MEDIA_PREVIOUS: 88,
} as const;

type KeyEventPayload = {keyCode: number};

type KeyEventApi = {
  onKeyDownListener: (cb: (event: KeyEventPayload) => void) => void;
  removeKeyDownListener: () => void;
};

export type TvRemoteHandlers = {
  onSkipForward?: () => void;
  onSkipBack?: () => void;
  onPlayPause?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onSelect?: () => void;
  // Fires for every handled key, e.g. to reveal the controls overlay.
  onAnyKey?: () => void;
};

function getKeyEventApi(): KeyEventApi | null {
  try {
    // Lazy require so a missing/broken native module cannot crash app startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-keyevent') as {
      default?: KeyEventApi;
    } & KeyEventApi;
    return mod.default ?? mod ?? null;
  } catch {
    return null;
  }
}

/**
 * Wires Android TV remote / hardware keyboard keys to player actions.
 *
 * Only one consumer should be mounted at a time because the underlying
 * native module exposes a single global key-down listener.
 */
export function useTvRemote(handlers: TvRemoteHandlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    const KeyEvent = getKeyEventApi();
    if (!KeyEvent) {
      return;
    }

    const handleKeyDown = (event: KeyEventPayload) => {
      const current = handlersRef.current;
      let handled = true;

      switch (event.keyCode) {
        case KEYCODE.DPAD_RIGHT:
        case KEYCODE.MEDIA_FAST_FORWARD:
        case KEYCODE.MEDIA_NEXT:
          current.onSkipForward?.();
          break;
        case KEYCODE.DPAD_LEFT:
        case KEYCODE.MEDIA_REWIND:
        case KEYCODE.MEDIA_PREVIOUS:
          current.onSkipBack?.();
          break;
        case KEYCODE.DPAD_CENTER:
        case KEYCODE.ENTER:
        case KEYCODE.SPACE:
        case KEYCODE.BUTTON_SELECT:
        case KEYCODE.MEDIA_PLAY_PAUSE:
        case KEYCODE.MEDIA_PLAY:
        case KEYCODE.MEDIA_PAUSE:
          (current.onSelect ?? current.onPlayPause)?.();
          break;
        case KEYCODE.DPAD_UP:
          current.onUp?.();
          break;
        case KEYCODE.DPAD_DOWN:
          current.onDown?.();
          break;
        default:
          handled = false;
          break;
      }

      if (handled) {
        current.onAnyKey?.();
      }
    };

    try {
      KeyEvent.onKeyDownListener(handleKeyDown);
    } catch {
      return;
    }

    return () => {
      try {
        KeyEvent.removeKeyDownListener();
      } catch {
        // Ignore cleanup failures.
      }
    };
  }, [enabled]);
}
