import type {ComponentProps, RefObject} from 'react';
import {VideoPlayerPanel} from '../components/VideoPlayerPanel';
import type {SeekablePlayerHandle} from '../types/player';

type VideoPlayerPanelProps = ComponentProps<typeof VideoPlayerPanel>;

type PlayerScreenProps = Omit<VideoPlayerPanelProps, 'playerRef'> & {
  playerRef: RefObject<SeekablePlayerHandle | null>;
};

export function PlayerScreen(props: PlayerScreenProps) {
  return <VideoPlayerPanel {...props} />;
}
