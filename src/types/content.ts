import type {SkipReason} from '../constants/skipReasons';

export type CutScene = {
  start: number;
  end: number;
  reason: SkipReason;
};

export type ContentType = 'movie' | 'episode';

export type CreateSuccessResponse = {
  status: 'success';
  content_type: ContentType;
  id: string;
};

// --- Movie ---

export type CreateMovieRequest = {
  movie_id: string;
  title: string;
  release_year: number;
  duration: number;
  cut_scenes: CutScene[];
};

export type UpdateMovieRequest = {
  title: string;
  release_year: number;
  duration: number;
  cut_scenes: CutScene[];
};

export type MovieResponse = {
  movie_id: string;
  title: string;
  release_year: number;
  duration: number;
  cut_scenes: CutScene[];
};

export type SearchMovieParams = {
  title: string;
  release_year: number;
};

export type MovieSuggestionParams = {
  query: string;
  limit?: number;
};

export type MovieSuggestion = {
  movie_id: string;
  title: string;
  release_year: number;
  scene_count: number;
};

export type MovieExistsResponse =
  | {
      exists: true;
      movie_id: string;
      title: string;
      release_year: number;
      scene_count: number;
    }
  | {
      exists: false;
      scene_count: number;
    };

// --- Episode ---

export type CreateEpisodeRequest = {
  series_title: string;
  season_number: number;
  episode_number: number;
  duration: number;
  cut_scenes: CutScene[];
  episode_id?: string;
};

export type UpdateEpisodeRequest = {
  series_title: string;
  season_number: number;
  episode_number: number;
  duration: number;
  cut_scenes: CutScene[];
};

export type EpisodeResponse = {
  episode_id: string;
  series_title: string;
  season_number: number;
  episode_number: number;
  duration: number;
  cut_scenes: CutScene[];
};

export type SearchEpisodeParams = {
  series_title: string;
  season_number: number;
  episode_number: number;
};

export type EpisodeExistsResponse =
  | {
      exists: true;
      episode_id: string;
      series_title: string;
      season_number: number;
      episode_number: number;
      scene_count: number;
    }
  | {
      exists: false;
      scene_count: number;
    };

export type ApiErrorDetail = {
  detail?: string | Array<{loc: string[]; msg: string; type: string}>;
};
