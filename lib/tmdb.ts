import { getApiUrl } from "@/lib/query-client";

export const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" | "original" = "w342"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: "w780" | "w1280" | "original" = "w780"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function profileUrl(path: string | null | undefined, size: "w185" | "h632" | "original" = "w185"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export type TMDBMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  media_type?: "movie";
};

export type TMDBTVShow = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  media_type?: "tv";
};

export type TMDBPerson = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
};

export type Genre = { id: number; name: string };

export type PaginatedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

export type Season = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
  overview: string;
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  air_date: string;
  vote_average: number;
  runtime: number;
};

async function get<T>(path: string): Promise<T> {
  const baseUrl = getApiUrl();
  const url = new URL(path, baseUrl);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const tmdb = {
  getTrendingMovies: () => get<TMDBMovie[]>("/api/tmdb/trending/movies"),
  getTrendingTV: () => get<TMDBTVShow[]>("/api/tmdb/trending/tv"),
  getPopularMovies: (page = 1) => get<PaginatedResponse<TMDBMovie>>(`/api/tmdb/popular/movies?page=${page}`),
  getPopularTV: (page = 1) => get<PaginatedResponse<TMDBTVShow>>(`/api/tmdb/popular/tv?page=${page}`),
  getNowPlaying: (page = 1) => get<PaginatedResponse<TMDBMovie>>(`/api/tmdb/now-playing?page=${page}`),
  getUpcoming: (page = 1) => get<PaginatedResponse<TMDBMovie>>(`/api/tmdb/upcoming?page=${page}`),
  getTopRatedMovies: (page = 1) => get<PaginatedResponse<TMDBMovie>>(`/api/tmdb/top-rated/movies?page=${page}`),
  getTopRatedTV: (page = 1) => get<PaginatedResponse<TMDBTVShow>>(`/api/tmdb/top-rated/tv?page=${page}`),
  getMovieGenres: () => get<Genre[]>("/api/tmdb/genres/movies"),
  getTVGenres: () => get<Genre[]>("/api/tmdb/genres/tv"),
  getMoviesByGenre: (genreId: number, page = 1) => get<PaginatedResponse<TMDBMovie>>(`/api/tmdb/genre/movies/${genreId}?page=${page}`),
  getTVByGenre: (genreId: number, page = 1) => get<PaginatedResponse<TMDBTVShow>>(`/api/tmdb/genre/tv/${genreId}?page=${page}`),
  search: (query: string, page = 1) =>
    get<{ movies: PaginatedResponse<TMDBMovie>; tvShows: PaginatedResponse<TMDBTVShow>; people: PaginatedResponse<TMDBPerson> }>(
      `/api/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`
    ),
  getMovieDetails: (id: number) => get<Record<string, unknown>>(`/api/tmdb/movie/${id}`),
  getTVDetails: (id: number) => get<Record<string, unknown>>(`/api/tmdb/tv/${id}`),
  getSeasonDetails: (tvId: number, season: number) => get<Record<string, unknown>>(`/api/tmdb/tv/${tvId}/season/${season}`),
  getPersonDetails: (id: number) => get<Record<string, unknown>>(`/api/tmdb/person/${id}`),
};
