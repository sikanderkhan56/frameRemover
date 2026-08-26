import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import {API_BASE_URL} from '../../config/api';
import {getApiErrorDetail, getApiErrorMessage} from '../../utils/apiErrors';

type RequestMeta = {
  method: string;
  url: string;
};

function resolveRequestMeta(args: string | FetchArgs): RequestMeta {
  if (typeof args === 'string') {
    return {method: 'GET', url: args};
  }

  return {
    method: (args.method ?? 'GET').toUpperCase(),
    url: args.url,
  };
}

function buildFullUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = API_BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: headers => {
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

/**
 * Shared base query with request/response interceptors.
 * - Request: attaches default headers (via prepareHeaders) and logs the call.
 * - Response: logs failures with status, endpoint, and error detail.
 */
export const baseQueryWithInterceptors: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const {method, url} = resolveRequestMeta(args);
  const fullUrl = buildFullUrl(url);
  const startedAt = Date.now();

  if (__DEV__) {
    console.log(`[API] → ${method} ${fullUrl}`);
  }

  const result = await rawBaseQuery(args, api, extraOptions);
  const durationMs = Date.now() - startedAt;

  if (result.error) {
    const status = result.error.status;
    const detail =
      getApiErrorDetail(result.error) ?? getApiErrorMessage(result.error);

    console.error('[API] ✕ request failed', {
      method,
      url: fullUrl,
      endpoint: api.endpoint,
      status,
      durationMs,
      detail,
      error: result.error,
    });
  } else if (__DEV__) {
    console.log(`[API] ← ${method} ${fullUrl} (${durationMs}ms)`);
  }

  return result;
};
