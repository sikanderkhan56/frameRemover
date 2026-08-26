import {createApi} from '@reduxjs/toolkit/query/react';
import type {
  AiPreviewResponse,
  CreateEpisodeRequest,
  CreateMovieRequest,
  CreateSuccessResponse,
  EpisodeExistsResponse,
  EpisodeResponse,
  MovieExistsResponse,
  MoviePreviewParams,
  MovieResponse,
  MovieSuggestion,
  MovieSuggestionParams,
  PreviewResponse,
  SearchEpisodeParams,
  SearchMovieParams,
  UpdateEpisodeRequest,
  UpdateMovieRequest,
} from '../../types/content';
import {baseQueryWithInterceptors} from './baseQuery';

export const contentApi = createApi({
  reducerPath: 'contentApi',
  baseQuery: baseQueryWithInterceptors,
  tagTypes: ['Movie', 'Episode'],
  endpoints: builder => ({
    checkMovieExists: builder.query<MovieExistsResponse, SearchMovieParams>({
      query: ({title, release_year}) => ({
        url: '/api/movie/exists',
        params: {title, release_year},
      }),
    }),
    searchMovie: builder.query<MovieResponse, SearchMovieParams>({
      query: ({title, release_year}) => ({
        url: '/api/movie/search',
        params: {title, release_year},
      }),
      providesTags: result =>
        result ? [{type: 'Movie', id: result.movie_id}] : [],
    }),
    getMovieSuggestions: builder.query<
      MovieSuggestion[],
      MovieSuggestionParams
    >({
      query: ({query, limit = 10}) => ({
        url: '/api/movie/suggestions',
        params: {query, limit: Math.min(limit, 20)},
      }),
    }),
    getMovieById: builder.query<MovieResponse, string>({
      query: movieId => `/api/movie/${encodeURIComponent(movieId)}`,
      providesTags: (_result, _error, movieId) => [
        {type: 'Movie', id: movieId},
      ],
    }),
    /** Smart preview: DB first, then Gemini AI fallback. */
    getMoviePreviewScenes: builder.query<PreviewResponse, MoviePreviewParams>({
      query: ({movieId, title, release_year}) => ({
        url: `/api/movie/${encodeURIComponent(movieId)}/preview-scenes`,
        params: {title, release_year},
      }),
    }),
    /** Always query Gemini — does not check the database first. */
    forceMovieAiPreview: builder.mutation<
      AiPreviewResponse,
      MoviePreviewParams
    >({
      query: ({movieId, title, release_year}) => ({
        url: `/api/movie/${encodeURIComponent(movieId)}/preview-scenes`,
        method: 'POST',
        params: {title, release_year},
      }),
    }),
    createMovie: builder.mutation<CreateSuccessResponse, CreateMovieRequest>({
      query: body => ({
        url: '/api/movie',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, {movie_id}) => [
        {type: 'Movie', id: movie_id},
      ],
    }),
    updateMovie: builder.mutation<
      CreateSuccessResponse,
      {movieId: string; body: UpdateMovieRequest}
    >({
      query: ({movieId, body}) => ({
        url: `/api/movie/${encodeURIComponent(movieId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, {movieId}) => [
        {type: 'Movie', id: movieId},
      ],
    }),
    deleteMovie: builder.mutation<CreateSuccessResponse, string>({
      query: movieId => ({
        url: `/api/movie/${encodeURIComponent(movieId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, movieId) => [
        {type: 'Movie', id: movieId},
      ],
    }),
    checkEpisodeExists: builder.query<
      EpisodeExistsResponse,
      SearchEpisodeParams
    >({
      query: ({series_title, season_number, episode_number}) => ({
        url: '/api/episode/exists',
        params: {series_title, season_number, episode_number},
      }),
    }),
    searchEpisode: builder.query<EpisodeResponse, SearchEpisodeParams>({
      query: ({series_title, season_number, episode_number}) => ({
        url: '/api/episode/search',
        params: {series_title, season_number, episode_number},
      }),
      providesTags: result =>
        result ? [{type: 'Episode', id: result.episode_id}] : [],
    }),
    getEpisodeById: builder.query<EpisodeResponse, string>({
      query: episodeId => `/api/episode/${encodeURIComponent(episodeId)}`,
      providesTags: (_result, _error, episodeId) => [
        {type: 'Episode', id: episodeId},
      ],
    }),
    createEpisode: builder.mutation<
      CreateSuccessResponse,
      CreateEpisodeRequest
    >({
      query: body => ({
        url: '/api/episode',
        method: 'POST',
        body,
      }),
      invalidatesTags: result =>
        result ? [{type: 'Episode', id: result.id}] : [],
    }),
    updateEpisode: builder.mutation<
      CreateSuccessResponse,
      {episodeId: string; body: UpdateEpisodeRequest}
    >({
      query: ({episodeId, body}) => ({
        url: `/api/episode/${encodeURIComponent(episodeId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, {episodeId}) => [
        {type: 'Episode', id: episodeId},
      ],
    }),
    deleteEpisode: builder.mutation<CreateSuccessResponse, string>({
      query: episodeId => ({
        url: `/api/episode/${encodeURIComponent(episodeId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, episodeId) => [
        {type: 'Episode', id: episodeId},
      ],
    }),
    healthCheck: builder.query<{message: string}, void>({
      query: () => '/',
    }),
  }),
});

export const {
  useLazyCheckMovieExistsQuery,
  useLazyCheckEpisodeExistsQuery,
  useLazySearchMovieQuery,
  useLazySearchEpisodeQuery,
  useLazyGetMovieSuggestionsQuery,
  useLazyGetMovieByIdQuery,
  useLazyGetEpisodeByIdQuery,
  useLazyGetMoviePreviewScenesQuery,
  useForceMovieAiPreviewMutation,
  useCreateMovieMutation,
  useUpdateMovieMutation,
  useCreateEpisodeMutation,
  useUpdateEpisodeMutation,
  useHealthCheckQuery,
} = contentApi;
