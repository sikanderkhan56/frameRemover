import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {
  type OnLoadData,
  type OnProgressData,
  type OnSeekData,
  type VideoRef,
} from 'react-native-video';
import {CutSceneEditor} from '../components/CutSceneEditor';
import {VideoPlayerPanel} from '../components/VideoPlayerPanel';
import {PLAYER_SKIP_SECONDS} from '../components/VideoControls';
import {SKIP_LEAD_TIME_SECONDS} from '../constants/playback';
import {useFrameSkipper} from '../hooks/useFrameSkipper';
import {useSystemVolume} from '../hooks/useSystemVolume';
import {
  useCreateEpisodeMutation,
  useCreateMovieMutation,
  useLazyCheckEpisodeExistsQuery,
  useLazyCheckMovieExistsQuery,
  useLazyGetEpisodeByIdQuery,
  useLazyGetMovieByIdQuery,
  useUpdateEpisodeMutation,
  useUpdateMovieMutation,
} from '../store/api/contentApi';
import type {ContentType, CutScene} from '../types/content';
import {
  createEmptyCutSceneDraft,
  type SceneEditMode,
  type SetupStep,
} from '../types/flow';
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
import {formatTimestamp} from '../utils/frameSkip';
import {cutScenesToSkipIntervals} from '../utils/movieMappers';

export function VideoPlayerScreen() {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const videoRef = useRef<VideoRef>(null);

  const [step, setStep] = useState<SetupStep>('welcome');
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [sceneEditMode, setSceneEditMode] = useState<SceneEditMode>('create');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [movieTitle, setMovieTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');

  const [seriesTitle, setSeriesTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');

  const [contentId, setContentId] = useState('');
  const [contentLabel, setContentLabel] = useState('');
  const [existingSceneCount, setExistingSceneCount] = useState(0);

  const [videoDuration, setVideoDuration] = useState(0);
  const [cutScenes, setCutScenes] = useState<CutScene[]>([]);
  const [sceneDrafts, setSceneDrafts] = useState([createEmptyCutSceneDraft()]);

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
    setMovieTitle('');
    setReleaseYear('');
    setSeriesTitle('');
    setSeasonNumber('');
    setEpisodeNumber('');
    setContentId('');
    setContentLabel('');
    setExistingSceneCount(0);
    setVideoDuration(0);
    setCutScenes([]);
    setSceneDrafts([createEmptyCutSceneDraft()]);
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
        type: [types.video],
        allowMultiSelection: false,
      });

      setVideoUri(result.uri);
      setVideoDuration(0);
      setContentType(null);
      setSceneEditMode('create');
      setMovieTitle('');
      setReleaseYear('');
      setSeriesTitle('');
      setSeasonNumber('');
      setEpisodeNumber('');
      setContentId('');
      setContentLabel('');
      setExistingSceneCount(0);
      setCutScenes([]);
      setSceneDrafts([createEmptyCutSceneDraft()]);
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

  const handleProbeLoad = useCallback((data: OnLoadData) => {
    setVideoDuration(data.duration);
  }, []);

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
    setSceneDrafts([createEmptyCutSceneDraft()]);
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

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setCurrentTime(data.currentTime);
    setVideoDuration(data.duration);
  }, []);

  const handleVideoProgress = useCallback(
    (progress: OnProgressData) => {
      if (!isScrubbing) {
        setCurrentTime(progress.currentTime);
      }
      handleProgress(progress);
    },
    [handleProgress, isScrubbing],
  );

  const handleVideoSeek = useCallback(
    (seekEvent: OnSeekData) => {
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

  return (
    <View
      style={[
        styles.container,
        step === 'playing'
          ? styles.containerPlaying
          : {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      {videoUri && isSetupStep ? (
        <Video
          source={{uri: videoUri}}
          style={styles.hiddenVideo}
          paused
          onLoad={handleProbeLoad}
        />
      ) : null}

      {step === 'playing' && videoUri ? (
        <VideoPlayerPanel
          videoRef={videoRef}
          videoUri={videoUri}
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
        />
      ) : (
        <ScrollView
          style={styles.setupScrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape && styles.scrollContentLandscape,
          ]}
          keyboardShouldPersistTaps="handled">
          {step === 'welcome' ? (
            <>
              <Text style={styles.title}>Frame Remover</Text>
              <Text style={styles.subtitle}>
                Choose a video, tell us if it is a movie or web series episode,
                and we will load or create skip scenes from the backend.
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={isPicking}
                onPress={handleChooseFile}
                style={({pressed}) => [
                  styles.primaryButton,
                  (pressed || isPicking) && styles.primaryButtonPressed,
                ]}>
                {isPicking ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Choose video</Text>
                )}
              </Pressable>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </>
          ) : null}

          {step === 'choose_content_type' ? (
            <>
              <Text style={styles.title}>What are you watching?</Text>
              <Text style={styles.subtitle}>
                This helps us look up the right cut scenes in the database.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectContentType('movie')}
                style={({pressed}) => [
                  styles.typeCard,
                  pressed && styles.typeCardPressed,
                ]}>
                <Text style={styles.typeCardTitle}>Movie</Text>
                <Text style={styles.typeCardHint}>
                  Enter title and release year
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectContentType('episode')}
                style={({pressed}) => [
                  styles.typeCard,
                  pressed && styles.typeCardPressed,
                ]}>
                <Text style={styles.typeCardTitle}>Web series episode</Text>
                <Text style={styles.typeCardHint}>
                  Enter series name, season, and episode
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={resetSession}
                style={({pressed}) => [
                  styles.textButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.textButtonLabel}>Choose a different video</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'identify' && contentType === 'movie' ? (
            <>
              <Text style={styles.title}>Movie details</Text>
              <Text style={styles.subtitle}>
                Enter the movie title and release year so we can find the right
                version (remakes share names but differ by year).
              </Text>

              <Text style={styles.fieldLabel}>Movie title</Text>
              <TextInput
                accessibilityLabel="Movie title"
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={setMovieTitle}
                placeholder="e.g. Inception"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={movieTitle}
              />

              <Text style={styles.fieldLabel}>Release year</Text>
              <TextInput
                accessibilityLabel="Release year"
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={setReleaseYear}
                placeholder="e.g. 2010"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={releaseYear}
              />

              {movieTitle.trim() && parsedReleaseYear ? (
                <Text style={styles.previewId}>
                  Backend ID: {buildMovieId(movieTitle, parsedReleaseYear)}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleLookup}
                style={({pressed}) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>{continueLabel}</Text>
              </Pressable>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('choose_content_type')}
                style={({pressed}) => [
                  styles.textButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.textButtonLabel}>Back</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'identify' && contentType === 'episode' ? (
            <>
              <Text style={styles.title}>Episode details</Text>
              <Text style={styles.subtitle}>
                Enter the web series name plus season and episode number.
              </Text>

              <Text style={styles.fieldLabel}>Series name</Text>
              <TextInput
                accessibilityLabel="Series name"
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={setSeriesTitle}
                placeholder="e.g. Breaking Bad"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={seriesTitle}
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>Season</Text>
                  <TextInput
                    accessibilityLabel="Season number"
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={setSeasonNumber}
                    placeholder="1"
                    placeholderTextColor="#6b7280"
                    style={styles.input}
                    value={seasonNumber}
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>Episode</Text>
                  <TextInput
                    accessibilityLabel="Episode number"
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={setEpisodeNumber}
                    placeholder="3"
                    placeholderTextColor="#6b7280"
                    style={styles.input}
                    value={episodeNumber}
                  />
                </View>
              </View>

              {seriesTitle.trim() && parsedSeason && parsedEpisode ? (
                <Text style={styles.previewId}>
                  Backend ID:{' '}
                  {buildEpisodeIdPreview(
                    seriesTitle,
                    parsedSeason,
                    parsedEpisode,
                  )}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleLookup}
                style={({pressed}) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>{continueLabel}</Text>
              </Pressable>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('choose_content_type')}
                style={({pressed}) => [
                  styles.textButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.textButtonLabel}>Back</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'checking' ? (
            <View style={styles.centeredStep}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.loadingText}>{checkingLabel}</Text>
            </View>
          ) : null}

          {step === 'already_exists' ? (
            <>
              <Text style={styles.title}>Already in database</Text>
              <Text style={styles.subtitle}>
                {contentLabel} already exists with {existingSceneCount}{' '}
                {existingSceneCount === 1 ? 'scene' : 'scenes'}. Play with
                existing cuts or edit them.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={handlePlayExisting}
                style={({pressed}) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>Play</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleEditExisting}
                style={({pressed}) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}>
                <Text style={styles.secondaryButtonText}>Edit cut scenes</Text>
              </Pressable>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

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

          {step === 'edit_cut_scenes' || step === 'saving' ? (
            <>
              <Text style={styles.title}>{editTitle}</Text>
              <Text style={styles.subtitle}>{editSubtitle}</Text>

              {videoDuration > 0 ? (
                <Text style={styles.previewId}>
                  Video duration: {formatTimestamp(videoDuration)}
                </Text>
              ) : (
                <Text style={styles.previewId}>Reading video duration…</Text>
              )}

              <CutSceneEditor
                scenes={sceneDrafts}
                onChange={setSceneDrafts}
                errorMessage={cutSceneError}
              />

              <Pressable
                accessibilityRole="button"
                disabled={step === 'saving' || isSaving}
                onPress={handleSaveContent}
                style={({pressed}) => [
                  styles.primaryButton,
                  (pressed || step === 'saving' || isSaving) &&
                    styles.primaryButtonPressed,
                ]}>
                {step === 'saving' || isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{saveLabel}</Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={step === 'saving'}
                onPress={handleEditBack}
                style={({pressed}) => [
                  styles.textButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.textButtonLabel}>Back</Text>
              </Pressable>
            </>
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
  scrollContentLandscape: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
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
  typeCard: {
    backgroundColor: '#1a1f27',
    borderColor: '#3a3f4b',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 18,
  },
  typeCardPressed: {
    opacity: 0.85,
  },
  typeCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  typeCardHint: {
    color: '#9ca3af',
    fontSize: 14,
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
