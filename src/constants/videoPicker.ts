import {Platform} from 'react-native';
import {types} from '@react-native-documents/picker';

/**
 * Document-picker type filters for local video selection.
 *
 * `types.video` alone is not enough for MKV:
 * - Android often tags MKV as `video/x-matroska` or `application/x-matroska`
 * - iOS Files does not treat `.mkv` as `public.movie`, so it stays greyed out
 */
export const VIDEO_PICK_TYPES: string[] = Platform.select({
  ios: [
    types.video,
    // Needed so .mkv (and similar) are selectable in Files
    types.allFiles,
  ],
  android: [
    types.video,
    'video/x-matroska',
    'video/matroska',
    'application/x-matroska',
    'application/octet-stream',
  ],
  default: [types.video],
});

/** Extensions we accept in the picker. */
const PICKABLE_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'm4v',
  'mov',
  'mkv',
  'webm',
  'avi',
  '3gp',
  '3g2',
  'mpeg',
  'mpg',
  'ts',
]);

/**
 * Formats AVPlayer (react-native-video on iOS) can play natively.
 * Everything else should go through VLC.
 */
const NATIVE_IOS_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'mpeg', 'mpg']);

/**
 * Formats that should always use VLC (Matroska and friends).
 */
const VLC_REQUIRED_EXTENSIONS = new Set(['mkv', 'webm', 'avi', 'flv']);

export function getFileExtension(nameOrUri: string): string {
  const cleaned = nameOrUri.split('?')[0]?.split('#')[0] ?? '';
  const lastSegment = cleaned.split('/').pop() ?? cleaned;
  const decoded = decodeURIComponent(lastSegment);
  const dotIndex = decoded.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }

  return decoded.slice(dotIndex + 1).toLowerCase();
}

export function isSupportedVideoFile(nameOrUri: string): boolean {
  const extension = getFileExtension(nameOrUri);
  return extension.length > 0 && PICKABLE_VIDEO_EXTENSIONS.has(extension);
}

export function getPlaybackSupportError(nameOrUri: string): string | null {
  const extension = getFileExtension(nameOrUri);
  if (!extension) {
    return 'Could not determine the video file type.';
  }

  if (!PICKABLE_VIDEO_EXTENSIONS.has(extension)) {
    return 'Please choose a video file (.mp4, .mov, .mkv, .webm, etc.).';
  }

  return null;
}

/** Whether this file needs the VLC engine (e.g. MKV on iOS/Android). */
export function needsVlcPlayback(nameOrUri: string): boolean {
  const extension = getFileExtension(nameOrUri);
  if (!extension) {
    return false;
  }

  if (VLC_REQUIRED_EXTENSIONS.has(extension)) {
    return true;
  }

  if (Platform.OS === 'ios' && !NATIVE_IOS_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

/** VLC reports every time value in milliseconds; the app stores seconds. */
export function normalizeVlcSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value / 1000;
}
