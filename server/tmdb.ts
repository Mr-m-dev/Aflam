const TMDB_API_KEYS = [
  process.env.TMDB_API_KEY,
  process.env.TMDB_API_KEY_2,
  process.env.TMDB_API_KEY_3,
].filter(Boolean) as string[];

if (TMDB_API_KEYS.length === 0) {
  console.warn("Warning: No TMDB_API_KEY environment variable set");
}

let requestCounter = 0;
const getNextApiKey = (): string => {
  if (TMDB_API_KEYS.length === 0) return "";
  const key = TMDB_API_KEYS[requestCounter % TMDB_API_KEYS.length];
  requestCounter++;
  return key;
};

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 48 * 60 * 60 * 1000;

const getCacheKey = (key: string): string => `tmdb:${key}`;

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return cached.data as T;
}

function setToCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function safeFetch(url: string, retries = 3): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return safeFetch(url, retries - 1);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return safeFetch(url, retries - 1);
    }
    throw error;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const EXCLUDED_TV_GENRES = [99, 10762, 10763, 10764, 10767, 10766];
const EXCLUDED_MOVIE_GENRES = [99, 10770, 10402];
const ARABIC_COUNTRIES = new Set([
  "SA","AE","QA","KW","BH","OM","YE","JO","LB","SY","IQ",
  "EG","LY","TN","DZ","MA","SD","SO","MR","DJ","KM","PS",
]);

function isArabicContent(item: Record<string, unknown>): boolean {
  if (item.original_language === "ar") return true;
  const origin = item.origin_country as string[] | undefined;
  if (origin?.some((c) => ARABIC_COUNTRIES.has(c))) return true;
  const countries = item.production_countries as { iso_3166_1: string }[] | undefined;
  if (countries?.some((c) => ARABIC_COUNTRIES.has(c.iso_3166_1))) return true;
  return false;
}

function filterValidMovies(movies: Record<string, unknown>[]): Record<string, unknown>[] {
  return movies.filter(
    (m) =>
      m.poster_path &&
      m.backdrop_path &&
      m.overview &&
      (m.overview as string).length > 0 &&
      (m.vote_average as number) >= 4 &&
      m.genre_ids &&
      (m.genre_ids as number[]).length > 0 &&
      !(m.genre_ids as number[]).some((id) => EXCLUDED_MOVIE_GENRES.includes(id)) &&
      !isArabicContent(m)
  );
}

function filterValidTVShows(shows: Record<string, unknown>[]): Record<string, unknown>[] {
  return shows.filter(
    (s) =>
      s.poster_path &&
      s.backdrop_path &&
      s.overview &&
      (s.overview as string).length > 0 &&
      (s.vote_average as number) >= 4 &&
      s.genre_ids &&
      (s.genre_ids as number[]).length > 0 &&
      !(s.genre_ids as number[]).some((id) => EXCLUDED_TV_GENRES.includes(id)) &&
      !isArabicContent(s)
  );
}

function filterValidPeople(people: Record<string, unknown>[]): Record<string, unknown>[] {
  return people.filter(
    (p) =>
      p.profile_path &&
      p.name &&
      (p.name as string).length > 0 &&
      p.known_for_department === "Acting"
  );
}

function paginated<T>(results: T[], page: number, total_pages: number, total_results: number) {
  return { page, results, total_pages: total_pages || 1, total_results: total_results || 0 };
}

export async function getTrendingMovies() {
  const ck = getCacheKey("trending_movies_week");
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${apiKey}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[] } | null;
  const movies = filterValidMovies(data?.results || []);
  setToCache(ck, movies);
  return movies;
}

export async function getTrendingTVShows() {
  const ck = getCacheKey("trending_tv_week");
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${apiKey}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[] } | null;
  const shows = filterValidTVShows(data?.results || []);
  setToCache(ck, shows);
  return shows;
}

export async function getPopularMovies(page = 1) {
  const ck = getCacheKey(`popular_movies_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidMovies(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getPopularTVShows(page = 1) {
  const ck = getCacheKey(`popular_tv_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidTVShows(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getNowPlayingMovies(page = 1) {
  const ck = getCacheKey(`now_playing_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidMovies(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getUpcomingMovies(page = 1) {
  const ck = getCacheKey(`upcoming_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/movie/upcoming?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidMovies(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getTopRatedMovies(page = 1) {
  const ck = getCacheKey(`top_rated_movies_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidMovies(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getTopRatedTVShows(page = 1) {
  const ck = getCacheKey(`top_rated_tv_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${apiKey}&page=${page}`);
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidTVShows(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getMovieGenres() {
  const ck = getCacheKey("movie_genres");
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${apiKey}`);
  const data = (await safeJson(res)) as { genres?: unknown[] } | null;
  const genres = (data?.genres || []).filter((g: unknown) => {
    const genre = g as { id: number };
    return !EXCLUDED_MOVIE_GENRES.includes(genre.id);
  });
  setToCache(ck, genres);
  return genres;
}

export async function getTVGenres() {
  const ck = getCacheKey("tv_genres");
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${apiKey}`);
  const data = (await safeJson(res)) as { genres?: unknown[] } | null;
  const genres = (data?.genres || []).filter((g: unknown) => {
    const genre = g as { id: number };
    return !EXCLUDED_TV_GENRES.includes(genre.id);
  });
  setToCache(ck, genres);
  return genres;
}

export async function getMoviesByGenre(genreId: number, page = 1) {
  const ck = getCacheKey(`movies_genre_${genreId}_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
  );
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidMovies(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function getTVShowsByGenre(genreId: number, page = 1) {
  const ck = getCacheKey(`tv_genre_${genreId}_${page}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(
    `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
  );
  const data = (await safeJson(res)) as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const result = paginated(filterValidTVShows(data?.results || []), data?.page || 1, data?.total_pages || 1, data?.total_results || 0);
  setToCache(ck, result);
  return result;
}

export async function searchAll(query: string, page = 1) {
  if (!query.trim()) return { movies: paginated([], 1, 1, 0), tvShows: paginated([], 1, 1, 0), people: paginated([], 1, 1, 0) };
  const [k1, k2, k3] = [getNextApiKey(), getNextApiKey(), getNextApiKey()];
  const [mr, tr, pr] = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/search/movie?api_key=${k1}&query=${encodeURIComponent(query)}&page=${page}`),
    safeFetch(`${TMDB_BASE_URL}/search/tv?api_key=${k2}&query=${encodeURIComponent(query)}&page=${page}`),
    safeFetch(`${TMDB_BASE_URL}/search/person?api_key=${k3}&query=${encodeURIComponent(query)}&page=${page}`),
  ]);
  const [md, td, pd] = await Promise.all([safeJson(mr), safeJson(tr), safeJson(pr)]);
  const mdata = md as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const tdata = td as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  const pdata = pd as { results?: Record<string, unknown>[]; page: number; total_pages: number; total_results: number } | null;
  return {
    movies: paginated(filterValidMovies(mdata?.results || []), mdata?.page || 1, mdata?.total_pages || 1, mdata?.total_results || 0),
    tvShows: paginated(filterValidTVShows(tdata?.results || []), tdata?.page || 1, tdata?.total_pages || 1, tdata?.total_results || 0),
    people: paginated(filterValidPeople(pdata?.results || []), pdata?.page || 1, pdata?.total_pages || 1, pdata?.total_results || 0),
  };
}

export async function getMovieDetails(movieId: number) {
  const ck = getCacheKey(`movie_details_${movieId}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const [arRes, enRes, combinedRes] = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=ar`),
    safeFetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en`),
    safeFetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=videos,images,credits,recommendations,similar&language=en-US&include_image_language=en,null`
    ),
  ]);
  const arData = (arRes.ok ? await safeJson(arRes) : {}) as Record<string, unknown>;
  const enData = (enRes.ok ? await safeJson(enRes) : {}) as Record<string, unknown>;
  const combinedData = (combinedRes.ok ? await safeJson(combinedRes) : {}) as Record<string, unknown>;
  const base = combinedData || enData;
  const videos = (combinedData?.videos as { results?: unknown[] } | undefined)?.results || [];
  const trailers = (videos as { type: string; site: string; key: string }[]).filter((v) => v.type === "Trailer" && v.site === "YouTube");
  const images = combinedData?.images as { logos?: { file_path: string; iso_639_1: string }[]; backdrops?: unknown[] } | undefined;
  const logo = images?.logos?.find((l) => l.iso_639_1 === "en") || images?.logos?.[0];
  const logoUrl = logo?.file_path ? `${TMDB_IMAGE_BASE_URL}/original${logo.file_path}` : null;
  const credits = (combinedData?.credits || {}) as { cast?: Record<string, unknown>[]; crew?: Record<string, unknown>[] };
  const cast = (credits.cast || []).filter((c) => c.profile_path).slice(0, 20);
  const crew = (credits.crew || []).filter((c) => c.profile_path).slice(0, 10);
  const recResults = ((combinedData?.recommendations as { results?: Record<string, unknown>[] } | undefined)?.results) || [];
  const simResults = ((combinedData?.similar as { results?: Record<string, unknown>[] } | undefined)?.results) || [];
  const similar = filterValidMovies(recResults.length ? recResults : simResults).slice(0, 20);
  const merged = {
    ...enData,
    id: movieId,
    title: (base as Record<string, unknown>).title || enData.title,
    overview: (arData?.overview as string)?.trim() || (enData?.overview as string)?.trim() || "",
    genres: arData?.genres || enData?.genres || [],
    media: { logo_url: logoUrl, trailers: trailers.slice(0, 3) },
    credits: { cast, crew },
    similar_movies: similar,
  };
  setToCache(ck, merged);
  return merged;
}

export async function getTVShowDetails(tvId: number) {
  const ck = getCacheKey(`tv_details_${tvId}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const [arRes, enRes, combinedRes] = await Promise.all([
    safeFetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=ar`),
    safeFetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=en`),
    safeFetch(
      `${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&append_to_response=videos,images,credits,recommendations,similar&language=en-US&include_image_language=en,null`
    ),
  ]);
  const arData = (arRes.ok ? await safeJson(arRes) : {}) as Record<string, unknown>;
  const enData = (enRes.ok ? await safeJson(enRes) : {}) as Record<string, unknown>;
  const combinedData = (combinedRes.ok ? await safeJson(combinedRes) : {}) as Record<string, unknown>;
  const base = combinedData || enData;
  const videos = (combinedData?.videos as { results?: unknown[] } | undefined)?.results || [];
  const trailers = (videos as { type: string; site: string; key: string }[]).filter((v) => v.type === "Trailer" && v.site === "YouTube");
  const images = combinedData?.images as { logos?: { file_path: string; iso_639_1: string }[] } | undefined;
  const logo = images?.logos?.find((l) => l.iso_639_1 === "en") || images?.logos?.[0];
  const logoUrl = logo?.file_path ? `${TMDB_IMAGE_BASE_URL}/original${logo.file_path}` : null;
  const credits = (combinedData?.credits || {}) as { cast?: Record<string, unknown>[]; crew?: Record<string, unknown>[] };
  const cast = (credits.cast || []).filter((c) => c.profile_path).slice(0, 20);
  const crew = (credits.crew || []).filter((c) => c.profile_path).slice(0, 10);
  const recResults = ((combinedData?.recommendations as { results?: Record<string, unknown>[] } | undefined)?.results) || [];
  const simResults = ((combinedData?.similar as { results?: Record<string, unknown>[] } | undefined)?.results) || [];
  const similar = filterValidTVShows(recResults.length ? recResults : simResults).slice(0, 20);
  const seasonsRaw = ((base as Record<string, unknown>).seasons as Record<string, unknown>[] | undefined) || [];
  const seasons = seasonsRaw.filter((s) => (s.season_number as number) > 0);
  const merged = {
    ...enData,
    id: tvId,
    name: (base as Record<string, unknown>).name || enData.name,
    overview: (arData?.overview as string)?.trim() || (enData?.overview as string)?.trim() || "",
    genres: arData?.genres || enData?.genres || [],
    seasons,
    media: { logo_url: logoUrl, trailers: trailers.slice(0, 3) },
    credits: { cast, crew },
    similar_tvshows: similar,
    number_of_seasons: (base as Record<string, unknown>).number_of_seasons || 0,
    number_of_episodes: (base as Record<string, unknown>).number_of_episodes || 0,
    episode_run_time: (base as Record<string, unknown>).episode_run_time || [],
  };
  setToCache(ck, merged);
  return merged;
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  const ck = getCacheKey(`season_${tvId}_${seasonNumber}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=en`);
  const data = await safeJson(res);
  setToCache(ck, data);
  return data;
}

export async function getPersonDetails(personId: number) {
  const ck = getCacheKey(`person_${personId}`);
  const cached = getFromCache(ck);
  if (cached) return cached;
  const apiKey = getNextApiKey();
  const res = await safeFetch(
    `${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=movie_credits,tv_credits,images&language=en-US`
  );
  const data = (await safeJson(res)) as Record<string, unknown> | null;
  if (!data) return null;
  const movieCredits = data.movie_credits as { cast?: Record<string, unknown>[] } | undefined;
  const tvCredits = data.tv_credits as { cast?: Record<string, unknown>[] } | undefined;
  const knownForMovies = filterValidMovies(movieCredits?.cast || []).slice(0, 10);
  const knownForTV = filterValidTVShows(tvCredits?.cast || []).slice(0, 10);
  const merged = {
    ...data,
    credits: {
      movie: { cast: knownForMovies },
      tv: { cast: knownForTV },
    },
  };
  setToCache(ck, merged);
  return merged;
}
