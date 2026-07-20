import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';
import LinearGradient from 'react-native-linear-gradient';
import {Ionicons} from '@react-native-vector-icons/ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CutSceneEditor} from '../components/CutSceneEditor';
import {AppVideoSurface} from '../components/AppVideoSurface';
import {VideoPlayerPanel} from '../components/VideoPlayerPanel';
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
  useLazyCheckEpisodeExistsQuery,
  useLazyCheckMovieExistsQuery,
  useLazyGetEpisodeByIdQuery,
  useLazyGetMovieByIdQuery,
  useLazyGetMovieSuggestionsQuery,
  useUpdateEpisodeMutation,
  useUpdateMovieMutation,
} from '../store/api/contentApi';
import type {
  ContentType,
  CutScene,
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
import {cutScenesToDrafts} from '../utils/cutSceneDrafts';
import {
  buildEpisodeIdPreview,
  buildMovieId,
  formatEpisodeLabel,
  parsePositiveInt,
  parseReleaseYear,
} from '../utils/contentId';
import {draftsToCutScenes} from '../utils/cutSceneValidation';
import {formatClockTimestamp, formatTimestamp} from '../utils/frameSkip';
import {cutScenesToSkipIntervals} from '../utils/movieMappers';

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

  const isSaving =
    isCreatingMovie || isUpdatingMovie || isCreatingEpisode || isUpdatingEpisode;

  const skipIntervals = useMemo(
    () => cutScenesToSkipIntervals(cutScenes),
    [cutScenes],
  );

  const parsedReleaseYear = useMemo(() => {
    const year = Number(releaseYear.trim());
    return Number.isInteger(year) ? year : null;
  }, [releaseYear]);

  const parsedSeason = useMemo(() => {
    const season = Number(seasonNumber.trim());
    return Number.isInteger(season) ? season : null;
  }, [seasonNumber]);

  const parsedEpisode = useMemo(() => {
    const episode = Number(episodeNumber.trim());
    return Number.isInteger(episode) ? episode : null;
  }, [episodeNumber]);

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

  const handleStartCutSceneEntry = useCallback(() => {
    setCutSceneError(null);
    setSceneDrafts([]);
    setSceneEditMode('create');
    setStep('edit_cut_scenes');
  }, []);

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
  const isEditCutScenes =
    step === 'edit_cut_scenes' || step === 'saving';
  const isLightSetup =
    isWelcome ||
    isContentTypeStep ||
    isIdentifyStep ||
    isAlreadyExists ||
    isEditCutScenes;

  return (
    <View
      style={[
        styles.container,
        isWelcome && styles.containerWelcome,
        isContentTypeStep && styles.containerContentType,
        (isIdentifyStep || isAlreadyExists) && styles.containerMovieDetails,
        isEditCutScenes && styles.containerEditScenes,
        step === 'playing'
          ? styles.containerPlaying
          : {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      <StatusBar
        barStyle={isLightSetup ? 'dark-content' : 'light-content'}
        backgroundColor={
          isWelcome || isIdentifyStep || isAlreadyExists
            ? '#ffffff'
            : isContentTypeStep || isEditCutScenes
              ? '#F8F9FB'
              : '#0f1115'
        }
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
        <VideoPlayerPanel
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
            isMovieIdentify && styles.scrollContentMovieDetails,
            isEpisodeIdentify && styles.scrollContentMovieDetails,
            isAlreadyExists && styles.scrollContentResult,
            isEditCutScenes && styles.scrollContentEditScenes,
            isLandscape && styles.scrollContentLandscape,
          ]}
          keyboardShouldPersistTaps="handled">
          {isWelcome ? (
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Frame Remover</Text>
              <Text style={styles.welcomeSubtitle}>
                Choose a video, tell us if it is a movie or web series episode,
                and we will load or create skip scenes from the backend.
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={isPicking}
                onPress={handleChooseFile}
                style={({pressed}) => [
                  styles.welcomeButtonShadow,
                  (pressed || isPicking) && styles.welcomeButtonPressed,
                ]}>
                <LinearGradient
                  colors={['#FF8A00', '#FF6B00']}
                  end={{x: 0.5, y: 1}}
                  start={{x: 0.5, y: 0}}
                  style={styles.welcomeButton}>
                  <View style={styles.welcomeButtonInner}>
                    {isPicking ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.welcomeButtonText}>Choose Video</Text>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>

              {errorMessage ? (
                <Text style={styles.welcomeErrorText}>{errorMessage}</Text>
              ) : null}
            </View>
          ) : null}

          {isContentTypeStep ? (
            <View style={styles.contentTypeScreen}>
              <View style={styles.contentTypeMain}>
                <Text style={styles.contentTypeTitle}>
                  What are you watching?
                </Text>
                <Text style={styles.contentTypeSubtitle}>
                  This helps us look up the right cut scenes in the database.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSelectContentType('movie')}
                  style={({pressed}) => [
                    styles.contentTypeCard,
                    pressed && styles.contentTypeCardPressed,
                  ]}>
                  <View
                    style={[
                      styles.contentTypeIconWrap,
                      styles.contentTypeIconMovie,
                    ]}>
                    <Ionicons color="#FF6B00" name="film-outline" size={24} />
                  </View>
                  <View style={styles.contentTypeCardText}>
                    <Text style={styles.contentTypeCardTitle}>Movie</Text>
                    <Text style={styles.contentTypeCardHint}>
                      Enter title and release year
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSelectContentType('episode')}
                  style={({pressed}) => [
                    styles.contentTypeCard,
                    pressed && styles.contentTypeCardPressed,
                  ]}>
                  <View
                    style={[
                      styles.contentTypeIconWrap,
                      styles.contentTypeIconSeries,
                    ]}>
                    <Ionicons color="#7C3AED" name="tv-outline" size={24} />
                  </View>
                  <View style={styles.contentTypeCardText}>
                    <Text style={styles.contentTypeCardTitle}>
                      Web series episode
                    </Text>
                    <Text style={styles.contentTypeCardHint}>
                      Enter series name, season, and episode
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={resetSession}
                style={({pressed}) => [
                  styles.contentTypeFooterButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.contentTypeFooterLabel}>
                  Choose a different video
                </Text>
              </Pressable>
            </View>
          ) : null}

          {isMovieIdentify ? (
            <View style={styles.movieDetailsScreen}>
              <View style={styles.movieDetailsMain}>
                <View style={styles.movieDetailsHeader}>
                  <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => setStep('choose_content_type')}
                    style={({pressed}) => [
                      styles.movieDetailsBackIcon,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Ionicons color="#111827" name="chevron-back" size={28} />
                  </Pressable>
                  <Text style={styles.movieDetailsTitle}>Movie details</Text>
                </View>

                <Text style={styles.movieDetailsSubtitle}>
                  Enter the movie title and release year so we can find the
                  right version (remakes share names but differ by year).
                </Text>

                <Text style={styles.movieDetailsFieldLabel}>Movie title</Text>
                <View style={styles.movieSearchField}>
                  <TextInput
                    accessibilityLabel="Movie title"
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={handleMovieTitleChange}
                    placeholder="e.g. Inception"
                    placeholderTextColor="#9CA3AF"
                    style={styles.movieDetailsInput}
                    value={movieTitle}
                  />

                  {!selectedMovieSuggestionId &&
                  movieTitle.trim().length >= 2 &&
                  (isLoadingSuggestions ||
                    hasLoadedSuggestions ||
                    movieSuggestions.length > 0) ? (
                    <View style={styles.movieSuggestionList}>
                      {isLoadingSuggestions ? (
                        <View style={styles.movieSuggestionStatus}>
                          <ActivityIndicator color="#FF6B00" size="small" />
                          <Text style={styles.movieSuggestionStatusText}>
                            Searching…
                          </Text>
                        </View>
                      ) : movieSuggestions.length > 0 ? (
                        movieSuggestions.map((suggestion, index) => (
                          <Pressable
                            accessibilityLabel={`${suggestion.title}, ${suggestion.release_year}`}
                            accessibilityRole="button"
                            key={suggestion.movie_id}
                            onPress={() =>
                              void handleSelectMovieSuggestion(suggestion)
                            }
                            style={({pressed}) => [
                              styles.movieSuggestionRow,
                              index > 0 && styles.movieSuggestionRowBorder,
                              pressed && styles.movieSuggestionRowPressed,
                            ]}>
                            <View style={styles.suggestionText}>
                              <Text
                                numberOfLines={1}
                                style={styles.movieSuggestionTitle}>
                                {suggestion.title}
                              </Text>
                              <Text style={styles.movieSuggestionYear}>
                                {suggestion.release_year}
                              </Text>
                            </View>
                            <Text style={styles.movieSuggestionSceneCount}>
                              {suggestion.scene_count}{' '}
                              {suggestion.scene_count === 1
                                ? 'scene'
                                : 'scenes'}
                            </Text>
                          </Pressable>
                        ))
                      ) : (
                        <View style={styles.movieSuggestionStatus}>
                          <Text style={styles.movieSuggestionStatusText}>
                            No matching movies
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>

                <Text style={styles.movieDetailsFieldLabel}>Release year</Text>
                <TextInput
                  accessibilityLabel="Release year"
                  keyboardType="number-pad"
                  maxLength={4}
                  onChangeText={handleReleaseYearChange}
                  placeholder="e.g. 2010"
                  placeholderTextColor="#9CA3AF"
                  style={styles.movieDetailsInput}
                  value={releaseYear}
                />

                {errorMessage ? (
                  <Text style={styles.movieDetailsErrorText}>{errorMessage}</Text>
                ) : null}
              </View>

              <View style={styles.movieDetailsFooter}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLookup}
                  style={({pressed}) => [
                    styles.welcomeButtonShadow,
                    pressed && styles.welcomeButtonPressed,
                  ]}>
                  <LinearGradient
                    colors={['#FF8A00', '#FF6B00']}
                    end={{x: 0.5, y: 1}}
                    start={{x: 0.5, y: 0}}
                    style={styles.welcomeButton}>
                    <View style={styles.welcomeButtonInner}>
                      <Text style={styles.welcomeButtonText}>
                        {continueLabel}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStep('choose_content_type')}
                  style={({pressed}) => [
                    styles.movieDetailsFooterBack,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.movieDetailsFooterBackLabel}>Back</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isEpisodeIdentify ? (
            <View style={styles.movieDetailsScreen}>
              <View style={styles.movieDetailsMain}>
                <View style={styles.movieDetailsHeader}>
                  <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => setStep('choose_content_type')}
                    style={({pressed}) => [
                      styles.movieDetailsBackIcon,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Ionicons color="#111827" name="chevron-back" size={28} />
                  </Pressable>
                  <Text style={styles.movieDetailsTitle}>Episode details</Text>
                </View>

                <Text style={styles.movieDetailsSubtitle}>
                  Enter the web series name plus season and episode number.
                </Text>

                <Text style={styles.movieDetailsFieldLabel}>Series name</Text>
                <TextInput
                  accessibilityLabel="Series name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onChangeText={setSeriesTitle}
                  placeholder="e.g. Breaking Bad"
                  placeholderTextColor="#9CA3AF"
                  style={styles.movieDetailsInput}
                  value={seriesTitle}
                />

                <View style={styles.episodeRowInputs}>
                  <View style={styles.episodeHalfInput}>
                    <Text style={styles.movieDetailsFieldLabel}>Season</Text>
                    <TextInput
                      accessibilityLabel="Season number"
                      keyboardType="number-pad"
                      maxLength={3}
                      onChangeText={setSeasonNumber}
                      placeholder="1"
                      placeholderTextColor="#9CA3AF"
                      style={styles.movieDetailsInput}
                      value={seasonNumber}
                    />
                  </View>

                  <View style={styles.episodeHalfInput}>
                    <Text style={styles.movieDetailsFieldLabel}>Episode</Text>
                    <TextInput
                      accessibilityLabel="Episode number"
                      keyboardType="number-pad"
                      maxLength={3}
                      onChangeText={setEpisodeNumber}
                      placeholder="3"
                      placeholderTextColor="#9CA3AF"
                      style={styles.movieDetailsInput}
                      value={episodeNumber}
                    />
                  </View>
                </View>

                {errorMessage ? (
                  <Text style={styles.movieDetailsErrorText}>{errorMessage}</Text>
                ) : null}
              </View>

              <View style={styles.movieDetailsFooter}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLookup}
                  style={({pressed}) => [
                    styles.welcomeButtonShadow,
                    pressed && styles.welcomeButtonPressed,
                  ]}>
                  <LinearGradient
                    colors={['#FF8A00', '#FF6B00']}
                    end={{x: 0.5, y: 1}}
                    start={{x: 0.5, y: 0}}
                    style={styles.welcomeButton}>
                    <View style={styles.welcomeButtonInner}>
                      <Text style={styles.welcomeButtonText}>
                        {continueLabel}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStep('choose_content_type')}
                  style={({pressed}) => [
                    styles.movieDetailsFooterBack,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.movieDetailsFooterBackLabel}>Back</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 'checking' ? (
            <View style={styles.centeredStep}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.loadingText}>{checkingLabel}</Text>
            </View>
          ) : null}

          {isAlreadyExists ? (
            <View style={styles.resultScreen}>
              <Text style={styles.resultTitle}>Already in database</Text>
              <Text style={styles.resultSubtitle}>
                {contentLabel} already exists with {existingSceneCount}{' '}
                {existingSceneCount === 1 ? 'scene' : 'scenes'}. Play with
                existing cuts or edit them.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={handlePlayExisting}
                style={({pressed}) => [
                  styles.welcomeButtonShadow,
                  styles.resultPrimaryButton,
                  pressed && styles.welcomeButtonPressed,
                ]}>
                <LinearGradient
                  colors={['#FF8A00', '#FF6B00']}
                  end={{x: 0.5, y: 1}}
                  start={{x: 0.5, y: 0}}
                  style={styles.welcomeButton}>
                  <View style={styles.welcomeButtonInner}>
                    <Text style={styles.welcomeButtonText}>Play</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleEditExisting}
                style={({pressed}) => [
                  styles.resultSecondaryButton,
                  pressed && styles.resultSecondaryButtonPressed,
                ]}>
                <Text style={styles.resultSecondaryButtonText}>
                  Edit cut scenes
                </Text>
              </Pressable>

              {errorMessage ? (
                <Text style={styles.movieDetailsErrorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setErrorMessage(null);
                  setStep('identify');
                }}
                style={({pressed}) => [
                  styles.resultTextButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.resultTextButtonLabel}>
                  Edit details and try again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'not_found' ? (
            <>
              <Text style={styles.title}>{notFoundTitle}</Text>
              <Text style={styles.subtitle}>{notFoundSubtitle}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={handleStartCutSceneEntry}
                style={({pressed}) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>Add cut scenes</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handlePlayWithoutSkips}
                style={({pressed}) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}>
                <Text style={styles.secondaryButtonText}>
                  Play without skipping
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setErrorMessage(null);
                  setStep('identify');
                }}
                style={({pressed}) => [
                  styles.textButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.textButtonLabel}>Edit details and try again</Text>
              </Pressable>
            </>
          ) : null}

          {isEditCutScenes ? (
            <View style={styles.editScenesScreen}>
              <View style={styles.editScenesMain}>
                <Text style={styles.editScenesTitle}>{editTitle}</Text>
                <Text style={styles.editScenesSubtitle}>{editSubtitle}</Text>

                {videoDuration > 0 ? (
                  <Text style={styles.editScenesDuration}>
                    Video duration: {formatClockTimestamp(videoDuration)}
                  </Text>
                ) : (
                  <Text style={styles.editScenesDuration}>
                    Reading video duration…
                  </Text>
                )}

                <CutSceneEditor
                  scenes={sceneDrafts}
                  onChange={setSceneDrafts}
                  errorMessage={cutSceneError}
                />
              </View>

              <View style={styles.editScenesFooter}>
                <Pressable
                  accessibilityRole="button"
                  disabled={step === 'saving' || isSaving}
                  onPress={handleSaveContent}
                  style={({pressed}) => [
                    styles.welcomeButtonShadow,
                    (pressed || step === 'saving' || isSaving) &&
                      styles.welcomeButtonPressed,
                  ]}>
                  <LinearGradient
                    colors={['#FF8A00', '#FF6B00']}
                    end={{x: 0.5, y: 1}}
                    start={{x: 0.5, y: 0}}
                    style={styles.welcomeButton}>
                    <View style={styles.welcomeButtonInner}>
                      {step === 'saving' || isSaving ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.welcomeButtonText}>
                          {saveLabel}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={step === 'saving'}
                  onPress={handleEditBack}
                  style={({pressed}) => [
                    styles.movieDetailsFooterBack,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.movieDetailsFooterBackLabel}>Back</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1115',
    flex: 1,
  },
  containerWelcome: {
    backgroundColor: '#ffffff',
  },
  containerContentType: {
    backgroundColor: '#F8F9FB',
  },
  containerMovieDetails: {
    backgroundColor: '#ffffff',
  },
  containerEditScenes: {
    backgroundColor: '#F8F9FB',
  },
  containerPlaying: {
    backgroundColor: '#000000',
  },
  hiddenVideo: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
  setupScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
  },
  scrollContentWelcome: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scrollContentContentType: {
    justifyContent: 'flex-start',
    paddingBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  scrollContentMovieDetails: {
    justifyContent: 'flex-start',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  scrollContentResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  scrollContentEditScenes: {
    justifyContent: 'flex-start',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scrollContentLandscape: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  welcomeContent: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 420,
    width: '100%',
  },
  welcomeTitle: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeButtonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
    alignSelf: 'stretch',
    borderRadius: 28,
  },
  welcomeButton: {
    borderRadius: 28,
    height: 56,
    overflow: 'hidden',
    width: '100%',
  },
  welcomeButtonInner: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 28,
    width: '100%',
  },
  welcomeButtonPressed: {
    opacity: 0.88,
  },
  welcomeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  welcomeErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  contentTypeScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  contentTypeMain: {
    gap: 12,
    width: '100%',
  },
  contentTypeTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  contentTypeSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  contentTypeCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#EEF0F3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  contentTypeCardPressed: {
    opacity: 0.9,
  },
  contentTypeIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  contentTypeIconMovie: {
    backgroundColor: '#FFE8D6',
  },
  contentTypeIconSeries: {
    backgroundColor: '#EDE4FF',
  },
  contentTypeCardText: {
    flex: 1,
    gap: 4,
  },
  contentTypeCardTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  contentTypeCardHint: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  contentTypeFooterButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  contentTypeFooterLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  movieDetailsScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  movieDetailsMain: {
    gap: 10,
    width: '100%',
  },
  movieDetailsHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  movieDetailsBackIcon: {
    left: -8,
    padding: 4,
    position: 'absolute',
    zIndex: 1,
  },
  movieDetailsTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  movieDetailsSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  movieDetailsFieldLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    marginTop: 6,
  },
  movieDetailsInput: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  movieSuggestionList: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  movieSuggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  movieSuggestionRowBorder: {
    borderTopColor: '#EEF0F3',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  movieSuggestionRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  movieSuggestionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  movieSuggestionYear: {
    color: '#6B7280',
    fontSize: 13,
  },
  movieSuggestionSceneCount: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '600',
  },
  movieSuggestionStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  movieSuggestionStatusText: {
    color: '#6B7280',
    fontSize: 14,
  },
  movieDetailsErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  movieDetailsFooter: {
    gap: 4,
    marginTop: 28,
    width: '100%',
  },
  movieDetailsFooterBack: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  movieDetailsFooterBackLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  episodeRowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  episodeHalfInput: {
    flex: 1,
  },
  resultScreen: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 420,
    width: '100%',
  },
  resultTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  resultSubtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  resultPrimaryButton: {
    marginTop: 4,
  },
  resultSecondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  resultSecondaryButtonPressed: {
    backgroundColor: '#F9FAFB',
  },
  resultSecondaryButtonText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  resultTextButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 10,
  },
  resultTextButtonLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  editScenesScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  editScenesMain: {
    gap: 12,
    width: '100%',
  },
  editScenesTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  editScenesSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  editScenesDuration: {
    color: '#9CA3AF',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
    textAlign: 'center',
  },
  editScenesFooter: {
    gap: 4,
    marginTop: 24,
    width: '100%',
  },
  centeredStep: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#b8bec8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  fieldLabel: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1a1f27',
    borderColor: '#3a3f4b',
    borderRadius: 10,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  movieSearchField: {
    zIndex: 2,
  },
  suggestionList: {
    backgroundColor: '#1a1f27',
    borderColor: '#3a3f4b',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionRowBorder: {
    borderTopColor: '#303642',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionRowPressed: {
    backgroundColor: '#252c37',
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionYear: {
    color: '#9ca3af',
    fontSize: 13,
  },
  suggestionSceneCount: {
    color: '#93c5fd',
    fontSize: 12,
  },
  suggestionStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  suggestionStatusText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    gap: 6,
  },
  previewId: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    minWidth: 220,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#3b82f6',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: '#93c5fd',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    color: '#b8bec8',
    fontSize: 15,
    textAlign: 'center',
  },
});
