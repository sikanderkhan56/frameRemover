export type VideoLayoutMode = 'contain' | 'cover';

export type VideoFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function computeVideoFrame(
  containerWidth: number,
  containerHeight: number,
  videoAspectRatio: number,
  mode: VideoLayoutMode,
): VideoFrame {
  if (containerWidth <= 0 || containerHeight <= 0 || videoAspectRatio <= 0) {
    return {left: 0, top: 0, width: containerWidth, height: containerHeight};
  }

  const containerAspect = containerWidth / containerHeight;

  if (mode === 'contain') {
    if (videoAspectRatio > containerAspect) {
      const width = containerWidth;
      const height = containerWidth / videoAspectRatio;
      return {
        left: 0,
        top: (containerHeight - height) / 2,
        width,
        height,
      };
    }

    const height = containerHeight;
    const width = containerHeight * videoAspectRatio;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height,
    };
  }

  if (videoAspectRatio > containerAspect) {
    const height = containerHeight;
    const width = containerHeight * videoAspectRatio;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height,
    };
  }

  const width = containerWidth;
  const height = containerWidth / videoAspectRatio;
  return {
    left: 0,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}
