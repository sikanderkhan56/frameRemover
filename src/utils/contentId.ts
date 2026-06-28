/** Turn a title into a backend-friendly slug. */
export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Backend movie_id format: {title_slug}_{release_year} */
export function buildMovieId(title: string, releaseYear: number): string {
  return `${slugifyTitle(title)}_${releaseYear}`;
}

/** Preview of auto-generated episode_id: {series_slug}_s{season}_e{episode} */
export function buildEpisodeIdPreview(
  seriesTitle: string,
  seasonNumber: number,
  episodeNumber: number,
): string {
  return `${slugifyTitle(seriesTitle)}_s${seasonNumber}_e${episodeNumber}`;
}

export function formatEpisodeLabel(
  seriesTitle: string,
  seasonNumber: number,
  episodeNumber: number,
): string {
  return `${seriesTitle} · S${seasonNumber}E${episodeNumber}`;
}

export function parsePositiveInt(
  value: string,
  fieldLabel: string,
): {value: number | null; error: string | null} {
  const trimmed = value.trim();
  if (!trimmed) {
    return {value: null, error: `${fieldLabel} is required.`};
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return {value: null, error: `${fieldLabel} must be a whole number ≥ 1.`};
  }

  return {value: parsed, error: null};
}

export function parseReleaseYear(
  value: string,
): {value: number | null; error: string | null} {
  const trimmed = value.trim();
  if (!trimmed) {
    return {value: null, error: 'Release year is required.'};
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1888 || parsed > 2100) {
    return {
      value: null,
      error: 'Release year must be a whole number between 1888 and 2100.',
    };
  }

  return {value: parsed, error: null};
}
