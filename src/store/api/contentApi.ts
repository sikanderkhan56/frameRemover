import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import {API_BASE_URL} from '../../config/api';
import type {
  CreateEpisodeRequest,
  CreateMovieRequest,
  CreateSuccessResponse,
  EpisodeExistsResponse,
  EpisodeResponse,
  MovieExistsResponse,
  MovieResponse,
  SearchEpisodeParams,
  SearchMovieParams,
  UpdateEpisodeRequest,
  UpdateMovieRequest,
} from '../../types/content';

export const contentApi = createApi({
  reducerPath: 'contentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
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
    getMovieById: builder.query<MovieResponse, string>({
      query: movieId => `/api/movie/${encodeURIComponent(movieId)}`,
      providesTags: (_result, _error, movieId) => [
        {type: 'Movie', id: movieId},
      ],
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
  useLazyGetMovieByIdQuery,
  useLazyGetEpisodeByIdQuery,
  useCreateMovieMutation,
  useUpdateMovieMutation,
  useCreateEpisodeMutation,
  useUpdateEpisodeMutation,
  useHealthCheckQuery,
} = contentApi;
