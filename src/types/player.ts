export type SeekablePlayerHandle = {
  seek: (timeSeconds: number) => void;
};

export type PlayerLoadData = {
  duration: number;
  currentTime: number;
  naturalSize?: {
    width: number;
    height: number;
  };
};

export type PlayerProgressData = {
  currentTime: number;
};
