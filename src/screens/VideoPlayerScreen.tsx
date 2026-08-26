import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ScrollView,
  StatusBar,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppVideoSurface} from '../components/AppVideoSurface';
import {PLAYER_SKIP_SECONDS} from '../components/VideoControls';
import {SKIP_LEAD_TIME_SECONDS} from '../constants/playback';
import {
  getPlaybackSupportError,
  VIDEO_PICK_TYPES,
} from '../constants/videoPicker';
import {useFrameSkipper} from '../hooks/useFrameSkipper';
import {useSystemVolume} from '../hooks/useSystemVolume';
import {
  useCreateEpisodeMutation,
  useCreateMovieMutation,
  useForceMovieAiPreviewMutation,
  useLazyCheckEpisodeExistsQuery,
  useLazyCheckMovieExistsQuery,
  useLazyGetEpisodeByIdQuery,
  useLazyGetMovieByIdQuery,
  useLazyGetMovieSuggestionsQuery,
  useUpdateEpisodeMutation,
  useUpdateMovieMutation,
} from '../store/api/contentApi';
import {setupStyles as styles} from '../theme/setupStyles';
import type {
  ContentType,
  CutScene,
  EstimatedScene,
  MovieSuggestion,
} from '../types/content';
import {
  type CutSceneDraft,
  type SceneEditMode,
  type SetupStep,
} from '../types/flow';
import type {
  PlayerLoadData,
  PlayerProgressData,
  SeekablePlayerHandle,
} from '../types/player';
import {getApiErrorDetail, isFetchBaseQueryError} from '../utils/apiErrors';
import {estimatedSceneToDraft} from '../utils/aiPreview';
import {cutScenesToDrafts} from '../utils/cutSceneDrafts';
import {
  buildEpisodeIdPreview,
  buildMovieId,
  formatEpisodeLabel,
  parsePositiveInt,
  parseReleaseYear,
} from '../utils/contentId';
import {draftsToCutScenes} from '../utils/cutSceneValidation';
import {formatTimestamp} from '../utils/frameSkip';
import {cutScenesToSkipIntervals} from '../utils/movieMappers';
import {AlreadyExistsScreen} from './AlreadyExistsScreen';
import {CheckingScreen} from './CheckingScreen';
import {ContentTypeScreen} from './ContentTypeScreen';
import {EditCutScenesScreen} from './EditCutScenesScreen';
import {EpisodeDetailsScreen} from './EpisodeDetailsScreen';
import {MovieDetailsScreen} from './MovieDetailsScreen';
import {NotFoundScreen} from './NotFoundScreen';
import {PlayerScreen} from './PlayerScreen';
import {WelcomeScreen} from './WelcomeScreen';

export function VideoPlayerScreen() {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const videoRef = useRef<SeekablePlayerHandle>(null);

  const [step, setStep] = useState<SetupStep>('welcome');
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [sceneEditMode, setSceneEditMode] = useState<SceneEditMode>('create');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');

  const [movieTitle, setMovieTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [movieSuggestions, setMovieSuggestions] = useState<MovieSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [selectedMovieSuggestionId, setSelectedMovieSuggestionId] = useState<
    string | null
  >(null);
  const suggestionRequestIdRef = useRef(0);

  const [seriesTitle, setSeriesTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');

  const [contentId, setContentId] = useState('');
  const [contentLabel, setContentLabel] = useState('');
  const [existingSceneCount, setExistingSceneCount] = useState(0);

  const [videoDuration, setVideoDuration] = useState(0);
  const [cutScenes, setCutScenes] = useState<CutScene[]>([]);
  const [sceneDrafts, setSceneDrafts] = useState<CutSceneDraft[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<EstimatedScene[]>([]);
  const [aiPreviewMessage, setAiPreviewMessage] = useState<string | null>(null);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);

  const [isPicking, setIsPicking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cutSceneError, setCutSceneError] = useState<string | null>(null);

  const [paused, setPaused] = useState(false);
  const {volume, setVolume} = useSystemVolume();
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [skipNotice, setSkipNotice] = useState<string | null>(null);
  const skipNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [checkMovieExists] = useLazyCheckMovieExistsQuery();
  const [checkEpisodeExists] = useLazyCheckEpisodeExistsQuery();
  const [getMovieById] = useLazyGetMovieByIdQuery();
  const [getEpisodeById] = useLazyGetEpisodeByIdQuery();
  const [getMovieSuggestions] = useLazyGetMovieSuggestionsQuery();
  const [createMovie, {isLoading: isCreatingMovie}] = useCreateMovieMutation();
  const [updateMovie, {isLoading: isUpdatingMovie}] = useUpdateMovieMutation();
  const [createEpisode, {isLoading: isCreatingEpisode}] =
    useCreateEpisodeMutation();
  const [updateEpisode, {isLoading: isUpdatingEpisode}] =
    useUpdateEpisodeMutation();
  const [forceMovieAiPreview] = useForceMovieAiPreviewMutation();

  const isSaving =
    isCreatingMovie || isUpdatingMovie || isCreatingEpisode || isUpdatingEpisode;

  const skipIntervals = useMemo(
    () => cutScenesToSkipIntervals(cutScenes),
    [cutScenes],
  );

  useEffect(() => {
    const query = movieTitle.trim();
    const requestId = ++suggestionRequestIdRef.current;

    if (
      step !== 'identify' ||
      contentType !== 'movie' ||
      query.length < 2 ||
      selectedMovieSuggestionId
    ) {
      setMovieSuggestions([]);
      setIsLoadingSuggestions(false);
      setHasLoadedSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    setHasLoadedSuggestions(false);

    const timer = setTimeout(async () => {
      try {
        const results = await getMovieSuggestions({
          query,
          limit: 10,
        }).unwrap();

        if (suggestionRequestIdRef.current === requestId) {
          setMovieSuggestions(results);
          setHasLoadedSuggestions(true);
        }
      } catch {
        if (suggestionRequestIdRef.current === requestId) {
          setMovieSuggestions([]);
          setHasLoadedSuggestions(false);
        }
      } finally {
        if (suggestionRequestIdRef.current === requestId) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    contentType,
    getMovieSuggestions,
    movieTitle,
    selectedMovieSuggestionId,
    step,
  ]);

  const showSkipNotice = useCallback(
    (interval: {label?: string; start: number; end: number}) => {
      if (skipNoticeTimerRef.current) {
        clearTimeout(skipNoticeTimerRef.current);
      }

      const label = interval.label ?? 'Scene';
      setSkipNotice(
        `Skipped ${label} (${formatTimestamp(interval.start)} – ${formatTimestamp(interval.end)})`,
      );

      skipNoticeTimerRef.current = setTimeout(() => {
        setSkipNotice(null);
        skipNoticeTimerRef.current = null;
      }, 2500);
    },
    [],
  );

  const {handleProgress, handleSeek, reset} = useFrameSkipper(videoRef, {
    intervals: skipIntervals,
    leadTimeSeconds: SKIP_LEAD_TIME_SECONDS,
    onSkipped: showSkipNotice,
  });

  useEffect(() => {
    reset();
  }, [skipIntervals, reset]);

  const resetSession = useCallback(() => {
    reset();
    setStep('welcome');
    setContentType(null);
    setSceneEditMode('create');
    setVideoUri(null);
    setVideoFileName('');
    setMovieTitle('');
    setReleaseYear('');
    setMovieSuggestions([]);
    setIsLoadingSuggestions(false);
    setHasLoadedSuggestions(false);
    setSelectedMovieSuggestionId(null);
    setSeriesTitle('');
    setSeasonNumber('');
    setEpisodeNumber('');
    setContentId('');
    setContentLabel('');
    setExistingSceneCount(0);
    setVideoDuration(0);
    setCutScenes([]);
    setSceneDrafts([]);
    setAiSuggestions([]);
    setAiPreviewMessage(null);
    setIsLoadingAiSuggestions(false);
    setErrorMessage(null);
    setCutSceneError(null);
    setPaused(false);
    setDuration(0);
    setCurrentTime(0);
    setSkipNotice(null);
  }, [reset]);

  const seekTo = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, duration || time));
      videoRef.current?.seek(clampedTime);
      setCurrentTime(clampedTime);
    },
    [duration],
  );

  const handleChooseFile = useCallback(async () => {
    setErrorMessage(null);
    setIsPicking(true);

    try {
      const [result] = await pick({
        type: VIDEO_PICK_TYPES,
        allowMultiSelection: false,
      });

      const selectedName = result.name ?? result.uri;
      const supportError = getPlaybackSupportError(selectedName);
      if (supportError) {
        setErrorMessage(supportError);
        return;
      }

      const fileName =
        result.name?.trim() ||
        `video-${Date.now()}.${selectedName.split('.').pop() ?? 'mp4'}`;

      // iOS security-scoped picker URIs are temporary; copy into app storage
      // so react-native-video can open the file reliably.
      const [copyResult] = await keepLocalCopy({
        files: [
          {
            uri: result.uri,
            fileName,
          },
        ],
        destination: 'cachesDirectory',
      });

      if (copyResult.status !== 'success') {
        setErrorMessage(
          copyResult.copyError ||
            'Could not copy the selected video into the app. Please try again.',
        );
        return;
      }

      setVideoUri(copyResult.localUri);
      setVideoFileName(fileName);
      setVideoDuration(0);
      setContentType(null);
      setSceneEditMode('create');
      setMovieTitle('');
      setReleaseYear('');
      setMovieSuggestions([]);
      setIsLoadingSuggestions(false);
      setHasLoadedSuggestions(false);
      setSelectedMovieSuggestionId(null);
      setSeriesTitle('');
      setSeasonNumber('');
      setEpisodeNumber('');
      setContentId('');
      setContentLabel('');
      setExistingSceneCount(0);
      setCutScenes([]);
      setSceneDrafts([]);
      setAiSuggestions([]);
      setAiPreviewMessage(null);
      setIsLoadingAiSuggestions(false);
      setStep('choose_content_type');
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      setErrorMessage('Could not open the selected video. Please try again.');
      console.error(error);
    } finally {
      setIsPicking(false);
    }
  }, []);

  const handleSelectContentType = useCallback((type: ContentType) => {
    setContentType(type);
    setErrorMessage(null);
    setStep('identify');
  }, []);

  const handleProbeLoad = useCallback((data: PlayerLoadData) => {
    setVideoDuration(data.duration);
  }, []);

  const handleMovieTitleChange = useCallback((title: string) => {
    setMovieTitle(title);
    setSelectedMovieSuggestionId(null);
    setContentId('');
    setMovieSuggestions([]);
    setHasLoadedSuggestions(false);
    setErrorMessage(null);
  }, []);

  const handleReleaseYearChange = useCallback((year: string) => {
    setReleaseYear(year);
    setSelectedMovieSuggestionId(null);
    setContentId('');
    setErrorMessage(null);
  }, []);

  const handleSelectMovieSuggestion = useCallback(
    async (suggestion: MovieSuggestion) => {
      setErrorMessage(null);
      setSelectedMovieSuggestionId(suggestion.movie_id);
      setMovieTitle(suggestion.title);
      setReleaseYear(String(suggestion.release_year));
      setMovieSuggestions([]);
      setHasLoadedSuggestions(false);
      setContentId(suggestion.movie_id);
      setContentLabel(`${suggestion.title} (${suggestion.release_year})`);
      setExistingSceneCount(suggestion.scene_count);
      setStep('checking');

      try {
        const movie = await getMovieById(suggestion.movie_id).unwrap();
        setContentId(movie.movie_id);
        setContentLabel(`${movie.title} (${movie.release_year})`);
        setCutScenes(movie.cut_scenes);
        setExistingSceneCount(suggestion.scene_count);
        setStep('already_exists');
      } catch (error) {
        setSelectedMovieSuggestionId(null);
        setContentId('');
        setStep('identify');

        if (isFetchBaseQueryError(error) && error.status === 'FETCH_ERROR') {
          setErrorMessage(
            'Cannot reach the API. Check that the backend is running.',
          );
        } else {
          setErrorMessage(
            getApiErrorDetail(error) ??
              'Could not load this movie. Please try again.',
          );
        }
      }
    },
    [getMovieById],
  );

  const loadFullContent = useCallback(async () => {
    if (!contentType || !contentId) {
      throw new Error('Missing content metadata');
    }

    if (contentType === 'movie') {
      const result = await getMovieById(contentId).unwrap();
      setContentLabel(`${result.title} (${result.release_year})`);
      setCutScenes(result.cut_scenes);
      return result.cut_scenes;
    }

    const result = await getEpisodeById(contentId).unwrap();
    setContentLabel(
      formatEpisodeLabel(
        result.series_title,
        result.season_number,
        result.episode_number,
      ),
    );
    setCutScenes(result.cut_scenes);
    return result.cut_scenes;
  }, [contentId, contentType, getEpisodeById, getMovieById]);

  const handleLookup = useCallback(async () => {
    if (!contentType) {
      return;
    }

    setErrorMessage(null);
    setStep('checking');

    try {
      if (contentType === 'movie') {
        const trimmedTitle = movieTitle.trim();
        if (!trimmedTitle) {
          setErrorMessage('Enter the movie title.');
          setStep('identify');
          return;
        }

        const yearResult = parseReleaseYear(releaseYear);
        if (yearResult.error || yearResult.value === null) {
          setErrorMessage(yearResult.error ?? 'Invalid release year.');
          setStep('identify');
          return;
        }

        const existsResult = await checkMovieExists({
          title: trimmedTitle,
          release_year: yearResult.value,
        }).unwrap();

        if (!existsResult.exists) {
          setSceneEditMode('create');
          setStep('not_found');
          return;
        }

        setContentId(existsResult.movie_id);
        setContentLabel(`${existsResult.title} (${existsResult.release_year})`);
        setExistingSceneCount(existsResult.scene_count);
        setStep('already_exists');
        return;
      }

      const trimmedSeries = seriesTitle.trim();
      if (!trimmedSeries) {
        setErrorMessage('Enter the series name.');
        setStep('identify');
        return;
      }

      const seasonResult = parsePositiveInt(seasonNumber, 'Season number');
      if (seasonResult.error || seasonResult.value === null) {
        setErrorMessage(seasonResult.error ?? 'Invalid season number.');
        setStep('identify');
        return;
      }

      const episodeResult = parsePositiveInt(episodeNumber, 'Episode number');
      if (episodeResult.error || episodeResult.value === null) {
        setErrorMessage(episodeResult.error ?? 'Invalid episode number.');
        setStep('identify');
        return;
      }

      const existsResult = await checkEpisodeExists({
        series_title: trimmedSeries,
        season_number: seasonResult.value,
        episode_number: episodeResult.value,
      }).unwrap();

      if (!existsResult.exists) {
        setSceneEditMode('create');
        setStep('not_found');
        return;
      }

      setContentId(existsResult.episode_id);
      setContentLabel(
        formatEpisodeLabel(
          existsResult.series_title,
          existsResult.season_number,
          existsResult.episode_number,
        ),
      );
      setExistingSceneCount(existsResult.scene_count);
      setStep('already_exists');
    } catch (error) {
      if (isFetchBaseQueryError(error) && error.status === 'FETCH_ERROR') {
        setErrorMessage('Cannot reach the API. Check that the backend is running.');
      } else {
        setErrorMessage(
          getApiErrorDetail(error) ?? 'Could not check this title. Please try again.',
        );
      }
      setStep('identify');
    }
  }, [
    checkEpisodeExists,
    checkMovieExists,
    contentType,
    episodeNumber,
    movieTitle,
    releaseYear,
    seasonNumber,
    seriesTitle,
  ]);

  const handlePlayExisting = useCallback(async () => {
    setErrorMessage(null);
    setStep('checking');

    try {
      await loadFullContent();
      setStep('playing');
    } catch (error) {
      if (isFetchBaseQueryError(error) && error.status === 'FETCH_ERROR') {
        setErrorMessage('Cannot reach the API. Check that the backend is running.');
      } else {
        setErrorMessage('Could not load cut scenes. Please try again.');
      }
      setStep('already_exists');
    }
  }, [loadFullContent]);

  const handleEditExisting = useCallback(async () => {
    setCutSceneError(null);
    setAiSuggestions([]);
    setAiPreviewMessage(null);
    setIsLoadingAiSuggestions(false);
    setStep('checking');

    try {
      const scenes = await loadFullContent();
      setSceneDrafts(cutScenesToDrafts(scenes));
      setSceneEditMode('update');
      setStep('edit_cut_scenes');
    } catch (error) {
      if (isFetchBaseQueryError(error) && error.status === 'FETCH_ERROR') {
        setErrorMessage('Cannot reach the API. Check that the backend is running.');
      } else {
        setErrorMessage('Could not load cut scenes for editing.');
      }
      setStep('already_exists');
    }
  }, [loadFullContent]);

  const handlePlayWithoutSkips = useCallback(() => {
    if (contentType === 'movie') {
      const yearResult = parseReleaseYear(releaseYear);
      if (movieTitle.trim() && yearResult.value) {
        setContentId(buildMovieId(movieTitle.trim(), yearResult.value));
        setContentLabel(`${movieTitle.trim()} (${yearResult.value})`);
      }
    } else if (contentType === 'episode') {
      const seasonResult = parsePositiveInt(seasonNumber, 'Season number');
      const episodeResult = parsePositiveInt(episodeNumber, 'Episode number');
      if (
        seriesTitle.trim() &&
        seasonResult.value &&
        episodeResult.value
      ) {
        setContentId(
          buildEpisodeIdPreview(
            seriesTitle.trim(),
            seasonResult.value,
            episodeResult.value,
          ),
        );
        setContentLabel(
          formatEpisodeLabel(
            seriesTitle.trim(),
            seasonResult.value,
            episodeResult.value,
          ),
        );
      }
    }

    setCutScenes([]);
    setStep('playing');
  }, [
    contentType,
    episodeNumber,
    movieTitle,
    releaseYear,
    seasonNumber,
    seriesTitle,
  ]);

  const fetchMovieAiSuggestions = useCallback(
    async (movieId: string, title: string, year: number) => {
      setIsLoadingAiSuggestions(true);
      setAiSuggestions([]);
      setAiPreviewMessage(null);

      try {
        const preview = await forceMovieAiPreview({
          movieId,
          title,
          release_year: year,
        }).unwrap();

        setAiSuggestions(preview.estimated_scenes ?? []);
        setAiPreviewMessage(preview.message ?? null);
      } catch (error) {
        setAiSuggestions([]);
        setAiPreviewMessage(
          getApiErrorDetail(error) ??
            'Could not load AI scene suggestions. You can still add scenes manually.',
        );
      } finally {
        setIsLoadingAiSuggestions(false);
      }
    },
    [forceMovieAiPreview],
  );

  const handleStartCutSceneEntry = useCallback(() => {
    setCutSceneError(null);
    setSceneDrafts([]);
    setSceneEditMode('create');
    setAiSuggestions([]);
    setAiPreviewMessage(null);

    if (contentType === 'movie') {
      const trimmedTitle = movieTitle.trim();
      const yearResult = parseReleaseYear(releaseYear);

      if (trimmedTitle && yearResult.value !== null) {
        const movieId = buildMovieId(trimmedTitle, yearResult.value);
        setContentId(movieId);
        setContentLabel(`${trimmedTitle} (${yearResult.value})`);
        setStep('edit_cut_scenes');
        void fetchMovieAiSuggestions(
          movieId,
          trimmedTitle,
          yearResult.value,
        );
        return;
      }
    }

    setStep('edit_cut_scenes');
  }, [
    contentType,
    fetchMovieAiSuggestions,
    movieTitle,
    releaseYear,
  ]);

  const handleRefreshAiSuggestions = useCallback(() => {
    if (contentType !== 'movie') {
      return;
    }

    const trimmedTitle = movieTitle.trim();
    const yearResult = parseReleaseYear(releaseYear);
    if (!trimmedTitle || yearResult.value === null) {
      return;
    }

    const movieId =
      contentId || buildMovieId(trimmedTitle, yearResult.value);
    void fetchMovieAiSuggestions(movieId, trimmedTitle, yearResult.value);
  }, [
    contentId,
    contentType,
    fetchMovieAiSuggestions,
    movieTitle,
    releaseYear,
  ]);

  const handleUseAiSuggestion = useCallback(
    (scene: EstimatedScene) => {
      const draft = estimatedSceneToDraft(scene);
      if (!draft) {
        setCutSceneError(
          `Could not parse AI time "${scene.estimated_time}". Add this scene manually.`,
        );
        return;
      }

      setCutSceneError(null);
      setSceneDrafts(current => [...current, draft]);
    },
    [],
  );

  const handleSaveContent = useCallback(async () => {
    if (!contentType) {
      return;
    }

    setCutSceneError(null);

    const {cutScenes: parsedScenes, error: validationError} =
      draftsToCutScenes(sceneDrafts);

    if (validationError || parsedScenes === null) {
      setCutSceneError(validationError ?? 'Invalid cut scene data.');
      return;
    }

    if (videoDuration <= 0) {
      setCutSceneError('Still reading video duration. Wait a moment and try again.');
      return;
    }

    setStep('saving');

    try {
      if (contentType === 'movie') {
        const trimmedTitle = movieTitle.trim();
        const yearResult = parseReleaseYear(releaseYear);
        if (!trimmedTitle || yearResult.error || yearResult.value === null) {
          setCutSceneError(yearResult.error ?? 'Invalid movie details.');
          setStep('edit_cut_scenes');
          return;
        }

        if (sceneEditMode === 'update') {
          const response = await updateMovie({
            movieId: contentId,
            body: {
              title: trimmedTitle,
              release_year: yearResult.value,
              duration: videoDuration,
              cut_scenes: parsedScenes,
            },
          }).unwrap();

          setContentId(response.id);
          setCutScenes(parsedScenes);
          setStep('playing');
          return;
        }

        const response = await createMovie({
          movie_id: buildMovieId(trimmedTitle, yearResult.value),
          title: trimmedTitle,
          release_year: yearResult.value,
          duration: videoDuration,
          cut_scenes: parsedScenes,
        }).unwrap();

        setContentId(response.id);
        setContentLabel(`${trimmedTitle} (${yearResult.value})`);
        setCutScenes(parsedScenes);
        setStep('playing');
        return;
      }

      const trimmedSeries = seriesTitle.trim();
      const seasonResult = parsePositiveInt(seasonNumber, 'Season number');
      const episodeResult = parsePositiveInt(episodeNumber, 'Episode number');

      if (
        !trimmedSeries ||
        seasonResult.error ||
        seasonResult.value === null ||
        episodeResult.error ||
        episodeResult.value === null
      ) {
        setCutSceneError('Invalid episode details.');
        setStep('edit_cut_scenes');
        return;
      }

      if (sceneEditMode === 'update') {
        const response = await updateEpisode({
          episodeId: contentId,
          body: {
            series_title: trimmedSeries,
            season_number: seasonResult.value,
            episode_number: episodeResult.value,
            duration: videoDuration,
            cut_scenes: parsedScenes,
          },
        }).unwrap();

        setContentId(response.id);
        setCutScenes(parsedScenes);
        setStep('playing');
        return;
      }

      const response = await createEpisode({
        series_title: trimmedSeries,
        season_number: seasonResult.value,
        episode_number: episodeResult.value,
        duration: videoDuration,
        cut_scenes: parsedScenes,
      }).unwrap();

      setContentId(response.id);
      setContentLabel(
        formatEpisodeLabel(
          trimmedSeries,
          seasonResult.value,
          episodeResult.value,
        ),
      );
      setCutScenes(parsedScenes);
      setStep('playing');
    } catch (error) {
      if (isFetchBaseQueryError(error)) {
        if (error.status === 409) {
          setCutSceneError(
            getApiErrorDetail(error) ??
              'This movie or episode already exists. Use Edit instead.',
          );
        } else if (error.status === 422) {
          setCutSceneError('Invalid data. Check all fields and try again.');
        } else {
          setCutSceneError('Could not save. Check the API is running.');
        }
      } else {
        setCutSceneError('Could not save. Check the API is running.');
      }
      setStep('edit_cut_scenes');
    }
  }, [
    contentId,
    contentType,
    createEpisode,
    createMovie,
    episodeNumber,
    movieTitle,
    releaseYear,
    sceneDrafts,
    sceneEditMode,
    seasonNumber,
    seriesTitle,
    updateEpisode,
    updateMovie,
    videoDuration,
  ]);

  const handleVideoLoad = useCallback((data: PlayerLoadData) => {
    setDuration(data.duration);
    setCurrentTime(data.currentTime);
    setVideoDuration(data.duration);
  }, []);

  const handleVideoProgress = useCallback(
    (progress: PlayerProgressData) => {
      if (!isScrubbing) {
        setCurrentTime(progress.currentTime);
      }
      handleProgress(progress);
    },
    [handleProgress, isScrubbing],
  );

  const handleVideoSeek = useCallback(
    (seekEvent: {currentTime: number}) => {
      setCurrentTime(seekEvent.currentTime);
      handleSeek(seekEvent);
    },
    [handleSeek],
  );

  const isSetupStep = step !== 'welcome' && step !== 'playing';
  const continueLabel = 'Continue';

  const notFoundTitle =
    contentType === 'episode' ? 'Episode not found' : 'Movie not found';

  const notFoundSubtitle =
    contentType === 'episode'
      ? `"${seriesTitle.trim()}" S${seasonNumber || '?'}E${episodeNumber || '?'} is not in our database yet. Add cut scenes to create it.`
      : `"${movieTitle.trim()}" (${releaseYear || '?'}) is not in our database yet. Add cut scenes to create it.`;

  const checkingLabel =
    contentId && step === 'checking'
      ? 'Loading cut scenes…'
      : contentType === 'episode'
        ? `Checking "${seriesTitle.trim()}" S${seasonNumber}E${episodeNumber}…`
        : `Checking "${movieTitle.trim()}" (${releaseYear})…`;

  const saveLabel =
    sceneEditMode === 'update'
      ? 'Save changes and start playing'
      : contentType === 'episode'
        ? 'Create episode and start playing'
        : 'Create movie and start playing';

  const editTitle =
    sceneEditMode === 'update' ? 'Edit cut scenes' : 'Add cut scenes';

  const editSubtitle =
    sceneEditMode === 'update'
      ? `Update cut scenes for ${contentLabel}. Removing a scene from the list deletes it on save.`
      : contentType === 'episode'
        ? `Create ${seriesTitle.trim() || 'this episode'} with the scenes you want skipped.`
        : `Create ${movieTitle.trim() || 'this movie'} with the scenes you want skipped.`;

  const handleEditBack = useCallback(() => {
    setCutSceneError(null);
    setStep(sceneEditMode === 'update' ? 'already_exists' : 'not_found');
  }, [sceneEditMode]);


  const isWelcome = step === 'welcome';
  const isContentTypeStep = step === 'choose_content_type';
  const isMovieIdentify = step === 'identify' && contentType === 'movie';
  const isEpisodeIdentify = step === 'identify' && contentType === 'episode';
  const isIdentifyStep = isMovieIdentify || isEpisodeIdentify;
  const isAlreadyExists = step === 'already_exists';
  const isNotFound = step === 'not_found';
  const isChecking = step === 'checking';
  const isEditCutScenes = step === 'edit_cut_scenes' || step === 'saving';
  const isLightSetup =
    isWelcome ||
    isContentTypeStep ||
    isIdentifyStep ||
    isAlreadyExists ||
    isNotFound ||
    isChecking ||
    isEditCutScenes;

  const statusBarBackground = isWelcome || isIdentifyStep || isAlreadyExists || isNotFound || isChecking
    ? '#ffffff'
    : isContentTypeStep || isEditCutScenes
      ? '#F8F9FB'
      : '#0f1115';

  return (
    <View
      style={[
        styles.container,
        isWelcome && styles.containerWelcome,
        isContentTypeStep && styles.containerContentType,
        (isIdentifyStep || isAlreadyExists || isNotFound || isChecking) &&
          styles.containerMovieDetails,
        isEditCutScenes && styles.containerEditScenes,
        step === 'playing' && {backgroundColor: '#000000'},
        step !== 'playing' && {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      <StatusBar
        barStyle={isLightSetup ? 'dark-content' : 'light-content'}
        backgroundColor={statusBarBackground}
      />

      {videoUri && isSetupStep ? (
        <AppVideoSurface
          uri={videoUri}
          fileName={videoFileName}
          paused
          hidden
          onLoad={handleProbeLoad}
        />
      ) : null}

      {step === 'playing' && videoUri ? (
        <PlayerScreen
          playerRef={videoRef}
          videoUri={videoUri}
          videoFileName={videoFileName}
          paused={paused}
          volume={volume}
          duration={duration}
          currentTime={currentTime}
          isScrubbing={isScrubbing}
          scrubTime={scrubTime}
          skipNotice={skipNotice}
          contentType={contentType}
          contentLabel={contentLabel}
          contentId={contentId}
          skipIntervals={skipIntervals}
          onVideoLoad={handleVideoLoad}
          onVideoProgress={handleVideoProgress}
          onVideoSeek={handleVideoSeek}
          onPlayPause={() => setPaused(value => !value)}
          onSkipBack={() => seekTo(currentTime - PLAYER_SKIP_SECONDS)}
          onSkipForward={() => seekTo(currentTime + PLAYER_SKIP_SECONDS)}
          onScrubStart={() => {
            setIsScrubbing(true);
            setScrubTime(currentTime);
          }}
          onScrubChange={setScrubTime}
          onScrubComplete={time => {
            setIsScrubbing(false);
            seekTo(time);
          }}
          onVolumeChange={setVolume}
          onResetSession={resetSession}
          onBackFromPlayer={resetSession}
          onPlaybackError={message => {
            setPaused(true);
            setErrorMessage(message);
            setStep('welcome');
            setVideoUri(null);
            setVideoFileName('');
          }}
        />
      ) : (
        <ScrollView
          style={styles.setupScrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isWelcome && styles.scrollContentWelcome,
            isContentTypeStep && styles.scrollContentContentType,
            isIdentifyStep && styles.scrollContentMovieDetails,
            (isAlreadyExists || isNotFound || isChecking) &&
              styles.scrollContentResult,
            isEditCutScenes && styles.scrollContentEditScenes,
            isLandscape && styles.scrollContentLandscape,
          ]}
          keyboardShouldPersistTaps="handled">
          {isWelcome ? (
            <WelcomeScreen
              errorMessage={errorMessage}
              isPicking={isPicking}
              onChooseFile={handleChooseFile}
            />
          ) : null}

          {isContentTypeStep ? (
            <ContentTypeScreen
              onChooseDifferentVideo={resetSession}
              onSelectType={handleSelectContentType}
            />
          ) : null}

          {isMovieIdentify ? (
            <MovieDetailsScreen
              continueLabel={continueLabel}
              errorMessage={errorMessage}
              hasLoadedSuggestions={hasLoadedSuggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              movieSuggestions={movieSuggestions}
              movieTitle={movieTitle}
              onBack={() => setStep('choose_content_type')}
              onChangeTitle={handleMovieTitleChange}
              onChangeYear={handleReleaseYearChange}
              onContinue={handleLookup}
              onSelectSuggestion={suggestion => {
                void handleSelectMovieSuggestion(suggestion);
              }}
              releaseYear={releaseYear}
              selectedMovieSuggestionId={selectedMovieSuggestionId}
            />
          ) : null}

          {isEpisodeIdentify ? (
            <EpisodeDetailsScreen
              continueLabel={continueLabel}
              episodeNumber={episodeNumber}
              errorMessage={errorMessage}
              onBack={() => setStep('choose_content_type')}
              onChangeEpisode={setEpisodeNumber}
              onChangeSeason={setSeasonNumber}
              onChangeSeriesTitle={setSeriesTitle}
              onContinue={handleLookup}
              seasonNumber={seasonNumber}
              seriesTitle={seriesTitle}
            />
          ) : null}

          {isChecking ? <CheckingScreen label={checkingLabel} /> : null}

          {isAlreadyExists ? (
            <AlreadyExistsScreen
              contentLabel={contentLabel}
              errorMessage={errorMessage}
              existingSceneCount={existingSceneCount}
              onEditCutScenes={() => {
                void handleEditExisting();
              }}
              onEditDetails={() => {
                setErrorMessage(null);
                setStep('identify');
              }}
              onPlay={() => {
                void handlePlayExisting();
              }}
            />
          ) : null}

          {isNotFound ? (
            <NotFoundScreen
              onAddCutScenes={handleStartCutSceneEntry}
              onEditDetails={() => {
                setErrorMessage(null);
                setStep('identify');
              }}
              onPlayWithoutSkips={handlePlayWithoutSkips}
              subtitle={notFoundSubtitle}
              title={notFoundTitle}
            />
          ) : null}

          {isEditCutScenes ? (
            <EditCutScenesScreen
              aiMessage={
                sceneEditMode === 'create' && contentType === 'movie'
                  ? aiPreviewMessage
                  : null
              }
              aiSuggestions={
                sceneEditMode === 'create' && contentType === 'movie'
                  ? aiSuggestions
                  : []
              }
              cutSceneError={cutSceneError}
              isLoadingAiSuggestions={
                sceneEditMode === 'create' &&
                contentType === 'movie' &&
                isLoadingAiSuggestions
              }
              isSaving={step === 'saving' || isSaving}
              onBack={handleEditBack}
              onChangeDrafts={setSceneDrafts}
              onRefreshAiSuggestions={
                sceneEditMode === 'create' && contentType === 'movie'
                  ? handleRefreshAiSuggestions
                  : undefined
              }
              onSave={() => {
                void handleSaveContent();
              }}
              onUseAiSuggestion={
                sceneEditMode === 'create' && contentType === 'movie'
                  ? handleUseAiSuggestion
                  : undefined
              }
              saveLabel={saveLabel}
              sceneDrafts={sceneDrafts}
              subtitle={editSubtitle}
              title={editTitle}
              videoDuration={videoDuration}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
