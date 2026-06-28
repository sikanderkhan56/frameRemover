import type {FetchBaseQueryError} from '@reduxjs/toolkit/query';

export function isFetchBaseQueryError(
  error: unknown,
): error is FetchBaseQueryError {
  return typeof error === 'object' && error != null && 'status' in error;
}

export function getApiErrorMessage(error: unknown): string {
  if (isFetchBaseQueryError(error)) {
    if (error.status === 404) {
      return 'Not found in the database.';
    }

    if (error.status === 409) {
      return 'This entry already exists.';
    }

    if (error.status === 'FETCH_ERROR') {
      return 'Cannot reach the API. Check that the backend is running.';
    }

    return 'Request failed. Please try again.';
  }

  return 'Request failed. Please try again.';
}

export function getApiErrorDetail(error: unknown): string | null {
  if (
    isFetchBaseQueryError(error) &&
    error.data &&
    typeof error.data === 'object' &&
    'detail' in error.data &&
    typeof (error.data as {detail: unknown}).detail === 'string'
  ) {
    return (error.data as {detail: string}).detail;
  }

  return null;
}
