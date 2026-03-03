"use server"

import "server-only"

const TMDB_API_KEYS = [
  process.env.TMDB_API_KEY,
  process.env.TMDB_API_KEY_2,
  process.env.TMDB_API_KEY_3,
  process.env.TMDB_API_KEY_4,
  process.env.TMDB_API_KEY_5,
  process.env.TMDB_API_KEY_6,
  process.env.TMDB_API_KEY_7,
].filter(Boolean) as string[]

if (TMDB_API_KEYS.length === 0) {
  throw new Error("At least one TMDB_API_KEY environment variable is required")
}

let requestCounter = 0

const getNextApiKey = (): string => {
  const key = TMDB_API_KEYS[requestCounter % TMDB_API_KEYS.length]
  requestCounter++
  return key
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

if (!TMDB_API_KEYS.length) {
  throw new Error("TMDB_API_KEYS environment variables are not set")
}

const cache = new Map()
const CACHE_DURATION = 48 * 60 * 60 * 1000

const getCacheKey = (url: string): string => {
  return `tmdb:${btoa(url)}`
}

const getFromCache = <T>(key: string): T | null => {
  const cached = cache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  return cached.data
}

const setToCache = <T>(key: string, data: T): void => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

const safeFetch = async (url: string, options: any = {}, retries = 3): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      next: { revalidate: 86400 }
    })

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise(r => setTimeout(r, 2000))
        return await safeFetch(url, options, retries - 1)
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000))
      return await safeFetch(url, options, retries - 1)
    }
    throw error
  }
}

const safeJsonParse = async (response: Response) => {
  try {
    const text = await response.text()
    if (!text || text.trim().length === 0) return null
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  adult: boolean
  original_language: string
}

export interface MovieDetails extends TMDBMovie {
  runtime: number
  genres: { id: number; name: string }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  tagline: string
  status: string
  budget: number
  revenue: number
}

export interface MovieImages {
  backdrops: { file_path: string; width: number; height: number }[]
  posters: { file_path: string; width: number; height: number }[]
  logos: { file_path: string; width: number; height: number; iso_639_1: string }[]
}

export interface MovieSubtitle {
  iso_639_1: string
  name: string
  english_name: string
  data: string
}

export interface MovieCollection {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  parts: TMDBMovie[]
}

export interface TMDBTVShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  origin_country: string[]
  original_language: string
}

export interface TVShowDetails extends TMDBTVShow {
  episode_run_time: number[]
  genres: { id: number; name: string }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  tagline: string
  status: string
  number_of_seasons: number
  number_of_episodes: number
  seasons: Season[]
  created_by: { id: number; name: string }[]
}

export interface Season {
  id: number
  name: string
  overview: string
  poster_path: string | null
  season_number: number
  episode_count: number
  air_date: string
}

export interface Episode {
  id: number
  name: string
  overview: string
  still_path: string | null
  episode_number: number
  season_number: number
  air_date: string
  vote_average: number
  runtime: number
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string; 
  popularity: number;
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface Credits {
  cast: CastMember[]
  crew: CrewMember[]
}

export interface Person {
  id: number
  name: string
  profile_path: string | null
  known_for_department: string
  known_for: (TMDBMovie | TMDBTVShow)[]
}

export interface TMDBPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

const createPaginatedResponse = <T>(
  results: T[],
  page: number = 1,
  total_pages: number = 1,
  total_results: number = 0
): TMDBPaginatedResponse<T> => {
  return {
    page,
    results,
    total_pages: total_pages || 1, 
    total_results: total_results || 0
  }
}

export interface SearchResults {
  movies: TMDBPaginatedResponse<TMDBMovie>; 
  tvShows: TMDBPaginatedResponse<TMDBTVShow>; 
  people: TMDBPaginatedResponse<TMDBPerson>;
}

const filterCastWithPhotos = (cast: CastMember[]): CastMember[] => {
  return cast.filter((actor) => actor.profile_path !== null && actor.profile_path !== "")
}

const filterCrewWithPhotos = (crew: CrewMember[]): CrewMember[] => {
  return crew.filter((member) => member.profile_path !== null && member.profile_path !== "")
}

const EXCLUDED_TV_GENRES = [99, 10762, 10763, 10764, 10767, 10766]
const EXCLUDED_MOVIE_GENRES = [99, 10770, 10402]
const ARABIC_COUNTRIES = new Set([
  'SA',
  'AE', 
  'QA',
  'KW', 
  'BH', 
  'OM', 
  'YE', 
  'JO', 
  'LB', 
  'SY', 
  'IQ', 
  'EG', 
  'LY', 
  'TN', 
  'DZ', 
  'MA', 
  'SD', 
  'SO', 
  'MR', 
  'DJ', 
  'KM', 
  'PS', 
])

const isArabicContent = (item: TMDBMovie | TMDBTVShow | any): boolean => {
  if (item.original_language && item.original_language === 'ar') {
    return true
  }

  if (item.production_countries && Array.isArray(item.production_countries)) {
    const hasArabicCountry = item.production_countries.some((country: any) => 
      country.iso_3166_1 && ARABIC_COUNTRIES.has(country.iso_3166_1)
    )
    if (hasArabicCountry) return true
  }

  if (item.origin_country && Array.isArray(item.origin_country)) {
    const hasArabicCountry = item.origin_country.some((countryCode: string) => 
      ARABIC_COUNTRIES.has(countryCode)
    )
    if (hasArabicCountry) return true
  }
  if (item.production_companies && Array.isArray(item.production_companies)) {
    const arabicCompanyNames = /(سعودي|إماراتي|قطري|كويتي|بحريني|عُماني|يمني|أردني|لبناني|سوري|عراقي|مصري|ليبي|تونسي|جزائري|مغربي|سوداني|صومالي|موريتاني|فلسطيني|عربي)/i
    const hasArabicCompany = item.production_companies.some((company: any) => 
      company.name && arabicCompanyNames.test(company.name)
    )
    if (hasArabicCompany) return true
  }
  
  return false
}

const hasArabicOverview = (item: any): boolean => {
  const text = item.overview?.trim() || ""
  return text.length > 10 && /[\u0600-\u06FF]/.test(text)
}

const filterValidTVShows = (shows: TMDBTVShow[]): TMDBTVShow[] => {
  return shows.filter(
    (show) =>
      show.poster_path &&
      show.backdrop_path &&
      show.overview &&
      show.overview.length > 0 &&
   //   hasArabicOverview(show) &&      
      show.vote_average &&
      show.vote_average >= 4 &&
      show.genre_ids &&
      show.genre_ids.length > 0 && 
      !show.genre_ids.some((id) => EXCLUDED_TV_GENRES.includes(id)) &&
      !isArabicContent(show)
  )
}

const filterValidMovies = (movies: TMDBMovie[]): TMDBMovie[] => {
  return movies.filter(
    (movie) =>
      movie.poster_path &&
      movie.backdrop_path &&
      movie.overview &&
      movie.overview.length > 0 &&
  //    hasArabicOverview(movie) &&
      movie.vote_average &&
      movie.vote_average >= 4 &&
      movie.genre_ids &&
      movie.genre_ids.length > 0 && 
      !movie.genre_ids.some((id) => EXCLUDED_MOVIE_GENRES.includes(id)) &&
      !isArabicContent(movie)
  )
}

const filterValidPeople = (people: TMDBPerson[]): TMDBPerson[] => {
  return people.filter(
    (person) =>
      person.profile_path && 
      person.name && 
      person.name.length > 0 &&
      person.known_for_department === "Acting" 
  )
}

export async function searchAll(query: string, page = 1): Promise<SearchResults> {
  if (!query.trim()) {
    return {
      movies: createPaginatedResponse([]),
      tvShows: createPaginatedResponse([]),
      people: createPaginatedResponse([]) 
    }
  }
  try {
    const movieApiKey = getNextApiKey()
    const tvApiKey = getNextApiKey()
    const peopleApiKey = getNextApiKey() 

    const movieUrl = `${TMDB_BASE_URL}/search/movie?api_key=${movieApiKey}&query=${encodeURIComponent(query)}&page=${page}`
    const tvUrl = `${TMDB_BASE_URL}/search/tv?api_key=${tvApiKey}&query=${encodeURIComponent(query)}&page=${page}`
    const peopleUrl = `${TMDB_BASE_URL}/search/person?api_key=${peopleApiKey}&query=${encodeURIComponent(query)}&page=${page}`

    const [movieResponse, tvResponse, peopleResponse] = await Promise.all([
      safeFetch(movieUrl),
      safeFetch(tvUrl),
      safeFetch(peopleUrl) 
    ])

    const [movieData, tvData, peopleData] = await Promise.all([
      safeJsonParse(movieResponse),
      safeJsonParse(tvResponse),
      safeJsonParse(peopleResponse)
    ])

    const movies = movieData ? filterValidMovies(movieData.results || []) : []
    const tvShows = tvData ? filterValidTVShows(tvData.results || []) : []
    const people = peopleData ? filterValidPeople(peopleData.results || []) : [] 

    return {
      movies: createPaginatedResponse(
        movies,
        movieData?.page,
        movieData?.total_pages,
        movieData?.total_results
      ),
      tvShows: createPaginatedResponse(
        tvShows,
        tvData?.page,
        tvData?.total_pages,
        tvData?.total_results
      ),
      people: createPaginatedResponse( 
        people,
        peopleData?.page,
        peopleData?.total_pages,
        peopleData?.total_results
      )
    }
  } catch (error) {
    console.error("Search all error:", error)
    return {
      movies: createPaginatedResponse([]),
      tvShows: createPaginatedResponse([]),
      people: createPaginatedResponse([])
    }
  }
}

export async function getMovieImages(movieId: number): Promise<MovieImages | null> {
  try {
    const cacheKey = getCacheKey(`movie_images_${movieId}`)
    const cached = getFromCache<MovieImages>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const url = `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${apiKey}`
    const response = await safeFetch(url)
    if (!response.ok) return null
    
    const result = await safeJsonParse(response)
    setToCache(cacheKey, result)
    return result
  } catch (error) {
    return null
  }
}

export async function getMovieLogo(movieId: number): Promise<string | null> {
  try {
    const cacheKey = getCacheKey(`movie_logo_${movieId}`)
    const cached = getFromCache<string>(cacheKey)
    if (cached) return cached

    const images = await getMovieImages(movieId)
    if (!images || !images.logos || images.logos.length === 0) return null

    const englishLogo = images.logos.find((logo) => logo.iso_639_1 === "en")
    const logoToUse = englishLogo || images.logos[0]

    if (logoToUse?.file_path) {
      const result = `${TMDB_IMAGE_BASE_URL}/original${logoToUse.file_path}`
      setToCache(cacheKey, result)
      return result
    }

    return null
  } catch (error) {
    return null
  }
}

export async function getPopularMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`popular_movies_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getTrendingMovies(timeWindow: "day" | "week" = "week"): Promise<(TMDBMovie & { logo_url: string | null })[]> {
  try {
    const cacheKey = getCacheKey(`trending_movies_${timeWindow}`)
    const cached = getFromCache<(TMDBMovie & { logo_url: string | null })[]>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${apiKey}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    const movies = filterValidMovies(data?.results || [])

    const moviesWithLogos = await Promise.all(
      movies.map(async (movie) => {
        const logo_url = await getMovieLogo(movie.id)
        return {
          ...movie,
          logo_url,
        }
      }),
    )

    setToCache(cacheKey, moviesWithLogos)
    return moviesWithLogos
  } catch (error) {
    return []
  }
}

export async function getTopRatedMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`top_rated_movies_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getNowPlayingMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`now_playing_movies_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getUpcomingMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`upcoming_movies_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/movie/upcoming?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getMovieCollection(collectionId: number): Promise<MovieCollection | null> {
  try {
    const cacheKey = getCacheKey(`movie_collection_${collectionId}`)
    const cached = getFromCache<MovieCollection>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const [arRes, enRes] = await Promise.all([
      safeFetch(`${TMDB_BASE_URL}/collection/${collectionId}?api_key=${apiKey}&language=ar`),
      safeFetch(`${TMDB_BASE_URL}/collection/${collectionId}?api_key=${apiKey}&language=en`),
    ])

    const arData = arRes.ok ? await safeJsonParse(arRes) : {}
    const enData = enRes.ok ? await safeJsonParse(enRes) : {}

    const finalName = arData?.name || enData?.name || ""
    const finalOverview = arData?.overview || enData?.overview || ""

    const validParts = filterValidMovies(enData?.parts || arData?.parts || [])

    const result = {
      id: enData?.id || arData?.id,
      name: finalName,
      overview: finalOverview,
      poster_path: enData?.poster_path || arData?.poster_path,
      backdrop_path: enData?.backdrop_path || arData?.backdrop_path,
      parts: validParts,
    }

    setToCache(cacheKey, result)
    return result
  } catch (error) {
    return null
  }
}

export async function searchMovies(query: string, page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    return createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getMoviesByGenre(genreId: number, page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`movies_by_genre_${genreId}_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getNewMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  try {
    const cacheKey = getCacheKey(`new_movies_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBMovie>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidMovies(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getTvImages(tvId: number): Promise<MovieImages | null> {
  try {
    const cacheKey = getCacheKey(`tv_images_${tvId}`)
    const cached = getFromCache<MovieImages>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const url = `${TMDB_BASE_URL}/tv/${tvId}/images?api_key=${apiKey}`
    const response = await safeFetch(url)
    if (!response.ok) return null
    
    const result = await safeJsonParse(response)
    setToCache(cacheKey, result)
    return result
  } catch (error) {
    return null
  }
}

export async function getTvLogo(tvId: number): Promise<string | null> {
  try {
    const cacheKey = getCacheKey(`tv_logo_${tvId}`)
    const cached = getFromCache<string>(cacheKey)
    if (cached) return cached

    const images = await getTvImages(tvId)
    if (!images || !images.logos || images.logos.length === 0) return null

    const englishLogo = images.logos.find((logo) => logo.iso_639_1 === "en")
    const logoToUse = englishLogo || images.logos[0]

    if (logoToUse?.file_path) {
      const result = `${TMDB_IMAGE_BASE_URL}/original${logoToUse.file_path}`
      setToCache(cacheKey, result)
      return result
    }

    return null
  } catch (error) {
    return null
  }
}

export async function getPopularTVShows(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  try {
    const cacheKey = getCacheKey(`popular_tv_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBTVShow>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidTVShows(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getNewTVShows(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  try {
    const cacheKey = getCacheKey(`new_tv_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBTVShow>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/tv/on_the_air?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidTVShows(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getTrendingTVShows(timeWindow: "day" | "week" = "week"): Promise<(TMDBTVShow & { logo_url: string | null })[]> {
  try {
    const cacheKey = getCacheKey(`trending_tv_${timeWindow}`)
    const cached = getFromCache<(TMDBTVShow & { logo_url: string | null })[]>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const url = `${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${apiKey}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    const shows = filterValidTVShows(data?.results || [])

    const showsWithLogos = await Promise.all(
      shows.map(async (show) => {
        const logo_url = await getTvLogo(show.id)
        return {
          ...show,
          logo_url,
        }
      }),
    )

    setToCache(cacheKey, showsWithLogos)
    return showsWithLogos
  } catch (error) {
    return []
  }
}

export async function getTopRatedTVShows(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  try {
    const cacheKey = getCacheKey(`top_rated_tv_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBTVShow>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/tv/top_rated?api_key=${apiKey}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidTVShows(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getTVShowsByGenre(genreId: number, page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  try {
    const cacheKey = getCacheKey(`tv_by_genre_${genreId}_${page}`)
    const cached = getFromCache<TMDBPaginatedResponse<TMDBTVShow>>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidTVShows(data.results || [])
    const responseData = createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
    
    setToCache(cacheKey, responseData)
    return responseData
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function searchTVShows(query: string, page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  try {
    const apiKey = getNextApiKey()
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`
    const response = await safeFetch(url)
    const data = await safeJsonParse(response)
    
    if (!data) {
      return createPaginatedResponse([])
    }
    
    const result = filterValidTVShows(data.results || [])
    return createPaginatedResponse(
      result,
      data.page,
      data.total_pages,
      data.total_results
    )
  } catch (error) {
    return createPaginatedResponse([])
  }
}

export async function getSeasonDetails(tvId: number, seasonNumber: number): Promise<any | null> {
  try {
    const cacheKey = getCacheKey(`season_details_${tvId}_${seasonNumber}`)
    const cached = getFromCache<any>(cacheKey)
    if (cached) return cached
    const apiKey = getNextApiKey()

    const [arRes, enRes] = await Promise.all([
      safeFetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=ar`),
      safeFetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=en`),
    ])

    const arData = arRes.ok ? await safeJsonParse(arRes) : {}
    const enData = enRes.ok ? await safeJsonParse(enRes) : {}

    const merged = {
      ...arData,
      name: arData?.name || enData?.name || enData?.original_name,
      overview: arData?.overview?.trim() || enData?.overview?.trim() || "",
      episodes: (arData?.episodes?.length ? arData.episodes : enData?.episodes) || [],
    }

    setToCache(cacheKey, merged)
    return merged
  } catch (error) {
    return null
  }
}

export async function getMovieDetails(movieId: number): Promise<any | null> {
  try {
    const cacheKey = getCacheKey(`movie_details_comprehensive_${movieId}`)
    const cached = getFromCache<any>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const requests = [
      safeFetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=ar`),
      safeFetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en`),
      safeFetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}` +
        `&append_to_response=release_dates,videos,images,keywords,credits,external_ids,recommendations,similar,watch/providers` +
        `&language=en-US&include_image_language=en,ar,null`
      )
    ]

    const [arRes, enRes, combinedRes] = await Promise.all(requests)

    const arData = arRes.ok ? await safeJsonParse(arRes) : {}
    const enData = enRes.ok ? await safeJsonParse(enRes) : {}
    const combinedData = combinedRes.ok ? await safeJsonParse(combinedRes) : {}
    const baseData = combinedData || enData || arData
    
    const originalLanguage = baseData.original_language || "en"

    let finalTitle
    if (originalLanguage === "ar") {
      finalTitle = arData?.title || baseData.original_title || baseData.title
    } else if (originalLanguage === "en") {
      finalTitle = baseData.title || baseData.original_title || arData?.title
    } else {
      finalTitle = baseData.title || baseData.original_title || arData?.title
    }
    
    const releaseDatesData = combinedData?.release_dates
    const videosData = combinedData?.videos
    const imagesData = combinedData?.images
    const keywordsData = combinedData?.keywords
    const creditsData = combinedData?.credits
    const externalIdsData = combinedData?.external_ids
    const recommendationsData = combinedData?.recommendations
    const similarData = combinedData?.similar
    const watchProvidersData = combinedData?.['watch/providers']
    
    let ageRating = ""
    if (releaseDatesData?.results) {
      const usRelease = releaseDatesData.results.find((r: any) => r.iso_3166_1 === "US")
      const gbRelease = releaseDatesData.results.find((r: any) => r.iso_3166_1 === "GB")
      const anyRelease = releaseDatesData.results?.[0]

      ageRating = usRelease?.release_dates?.[0]?.certification ||
                  gbRelease?.release_dates?.[0]?.certification ||
                  anyRelease?.release_dates?.[0]?.certification ||
                  ""
    }
    
    const keywords = keywordsData?.keywords || []
    const allVideos = videosData?.results || []
    const trailers = allVideos.filter((v: any) => 
      v.type === "Trailer" && v.site === "YouTube"
    )
    const teasers = allVideos.filter((v: any) => 
      v.type === "Teaser" && v.site === "YouTube"
    )
    const logo = imagesData?.logos?.find((l: any) => 
      l.iso_639_1 === "en" || l.iso_639_1 === null
    ) || imagesData?.logos?.[0]
    const logoUrl = logo?.file_path ? 
      `${TMDB_IMAGE_BASE_URL}/original${logo.file_path}` : null
    
    let collectionData = null
    if (baseData.belongs_to_collection && baseData.belongs_to_collection.id) {
      collectionData = await getMovieCollection(baseData.belongs_to_collection.id)
    }
  
    const filteredRecommendations = recommendationsData?.results ? 
      filterValidMovies(recommendationsData.results) : []
    
    const filteredSimilar = similarData?.results ? 
      filterValidMovies(similarData.results) : []
    
    let similarMovies: any[] = []
    if (filteredRecommendations.length) {
      similarMovies = filteredRecommendations
    } else if (filteredSimilar.length) {
      similarMovies = filteredSimilar
    }
    
    const merged = {
      ...enData, 
      id: movieId,
      imdb_id: externalIdsData?.imdb_id || baseData.imdb_id || enData?.imdb_id || "",
      title: finalTitle,
      original_title: enData?.original_title || arData?.original_title || "",
      original_language: originalLanguage,
      overview: arData?.overview?.trim() || enData?.overview?.trim() || "",
      translations: {
        arabic: {
          title: arData?.title,
          overview: arData?.overview,
          tagline: arData?.tagline
        },
        english: {
          title: enData?.title,
          overview: enData?.overview,
          tagline: enData?.tagline
        }
      },
      age_rating: ageRating,
      certification: ageRating,
      keywords: {
        all: keywords,
        top_keywords: keywords.slice(0, 25),
        keyword_names: keywords.map((k: any) => k.name),
        total_count: keywords.length
      },
      media: {
        logo_url: logoUrl,
        logos: imagesData?.logos?.slice(0, 25) || [],
        backdrops: imagesData?.backdrops?.slice(0, 25) || [],
        posters: imagesData?.posters?.slice(0, 25) || [],
        videos: {
          trailers: trailers.slice(0, 3),
          teasers: teasers.slice(0, 2),
          all: allVideos
        }
      },
      credits: creditsData || {},
      collection: collectionData,
      similar_movies: similarMovies,
      similar_data: {
        recommendations: filteredRecommendations,
        similar: filteredSimilar
      },
      watch_providers: watchProvidersData?.results || {}, 
      genres: (arData?.genres?.length ? arData.genres : enData?.genres) || [],
      production_companies: enData?.production_companies || [],
      production_countries: enData?.production_countries || [],
      spoken_languages: enData?.spoken_languages || []
    }

    setToCache(cacheKey, merged)
    return merged
  } catch (error) {
    console.error(`Error fetching comprehensive movie details for ${movieId}:`, error)
    return null
  }
}

export async function getTVShowDetails(tvId: number): Promise<any | null> {
  try {
    const cacheKey = getCacheKey(`tv_details_comprehensive_${tvId}`)
    const cached = getFromCache<TVShowDetails>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const requests = [
      safeFetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=ar`),
      safeFetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=en`),
      safeFetch(
        `${TMDB_BASE_URL}/tv/${tvId}?api_key=${apiKey}` +
        `&append_to_response=content_ratings,videos,images,keywords,credits,external_ids,recommendations,similar,watch/providers` +
        `&language=en-US&include_image_language=en,ar,null`
      )
    ]

    const [arRes, enRes, combinedRes] = await Promise.all(requests)

    const arData = arRes.ok ? await safeJsonParse(arRes) : {}
    const enData = enRes.ok ? await safeJsonParse(enRes) : {}
    const combinedData = combinedRes.ok ? await safeJsonParse(combinedRes) : {}
    const baseData = combinedData || enData || arData
    
    const originalLanguage = baseData.original_language || "en"

    let finalName
    if (originalLanguage === "ar") {
      finalName = arData?.name || baseData.original_name || baseData.name
    } else if (originalLanguage === "en") {
      finalName = baseData.name || baseData.original_name || arData?.name
    } else {
      finalName = baseData.name || baseData.original_name || arData?.name
    }
    
    const contentRatingsData = combinedData?.content_ratings
    const videosData = combinedData?.videos
    const imagesData = combinedData?.images
    const keywordsData = combinedData?.keywords
    const creditsData = combinedData?.credits
    const externalIdsData = combinedData?.external_ids
    const recommendationsData = combinedData?.recommendations
    const similarData = combinedData?.similar
    const watchProvidersData = combinedData?.['watch/providers']
    
    let ageRating = ""
    if (contentRatingsData?.results) {
      const usCertification = contentRatingsData.results.find((cert: any) => cert.iso_3166_1 === "US")
      const gbCertification = contentRatingsData.results.find((cert: any) => cert.iso_3166_1 === "GB")
      const anyCertification = contentRatingsData.results?.[0]

      ageRating = usCertification?.rating || 
                  gbCertification?.rating || 
                  anyCertification?.rating || 
                  ""
    }
    
    const keywords = keywordsData?.results || []
    const allVideos = videosData?.results || []
    const trailers = allVideos.filter((video: any) => 
      video.type === "Trailer" && video.site === "YouTube"
    )
    const teasers = allVideos.filter((video: any) => 
      video.type === "Teaser" && video.site === "YouTube"
    )
    const openingCredits = allVideos.filter((video: any) => 
      video.type === "Opening Credits" && video.site === "YouTube"
    )
    
    const logo = imagesData?.logos?.find((logo: any) => 
      logo.iso_639_1 === "en" || logo.iso_639_1 === null
    ) || imagesData?.logos?.[0]
    const logoUrl = logo?.file_path ? 
      `${TMDB_IMAGE_BASE_URL}/original${logo.file_path}` : null
    
    const seasonsInfo = (baseData.seasons || [])
      .filter((season: any) => season.season_number > 0)
      .map((season: any) => {
        const arSeason = arData?.seasons?.find((s: any) => s.season_number === season.season_number)
        const enSeason = enData?.seasons?.find((s: any) => s.season_number === season.season_number)
        
        return {
          id: season.id,
          name: arSeason?.name?.trim() || enSeason?.name || season.name,
          season_number: season.season_number,
          episode_count: season.episode_count,
          air_date: season.air_date,
          poster_path: season.poster_path,
          overview: arSeason?.overview?.trim() || enSeason?.overview?.trim() || season.overview || "",
          vote_average: season.vote_average || 0,
        }
      })

    let seasonOneDetails = null
    if (baseData.number_of_seasons >= 1) {
      try {
        seasonOneDetails = await getSeasonDetails(tvId, 1)
      } catch (error) {
        console.warn(`Failed to fetch season 1 details for TV show ${tvId}:`, error)
      }
    }
  
    let formattedSeasonOne = null
    if (seasonOneDetails) {
      const arSeason = arData?.seasons?.find((s: any) => s.season_number === 1)
      const enSeason = enData?.seasons?.find((s: any) => s.season_number === 1)
      
      formattedSeasonOne = {
        id: seasonOneDetails.id,
        name: arSeason?.name?.trim() || enSeason?.name || seasonOneDetails.name,
        season_number: 1,
        air_date: seasonOneDetails.air_date,
        overview: arSeason?.overview?.trim() || enSeason?.overview?.trim() || seasonOneDetails.overview || "",
        vote_average: seasonOneDetails.vote_average || 0,
        poster_path: seasonOneDetails.poster_path,
        episode_count: seasonOneDetails.episodes?.length || 0,
        episodes: (seasonOneDetails.episodes || []).map((episode: any) => ({
          id: episode.id,
          name: episode.name,
          episode_number: episode.episode_number,
          overview: episode.overview,
          air_date: episode.air_date,
          runtime: episode.runtime,
          still_path: episode.still_path,
          vote_average: episode.vote_average,
          vote_count: episode.vote_count,
          crew: episode.crew || [],
          guest_stars: episode.guest_stars || []
        }))
      }
    }
    
    const filteredRecommendations = recommendationsData?.results ? 
      filterValidTVShows(recommendationsData.results) : []
    
    const filteredSimilar = similarData?.results ? 
      filterValidTVShows(similarData.results) : []
    
    let similarTVShows: any[] = []
    if (filteredRecommendations.length) {
      similarTVShows = filteredRecommendations
    } else if (filteredSimilar.length) {
      similarTVShows = filteredSimilar
    }
    
    const merged = {
      ...baseData,
      id: tvId,
      imdb_id: externalIdsData?.imdb_id || baseData.imdb_id || enData?.imdb_id || "",
      name: finalName,
      original_name: enData?.original_name || arData?.original_name || baseData.original_name,
      original_language: originalLanguage,
      overview: arData?.overview?.trim() || enData?.overview?.trim() || baseData.overview?.trim() || "",
      
      translations: {
        arabic: {
          name: arData?.name,
          overview: arData?.overview,
          tagline: arData?.tagline
        },
        english: {
          name: enData?.name,
          overview: enData?.overview,
          tagline: enData?.tagline
        }
      },
      
      age_rating: ageRating,
      certification: ageRating,
     
      keywords: {
        all: keywords,
        top_keywords: keywords.slice(0, 25),
        keyword_names: keywords.map((k: any) => k.name),
        total_count: keywords.length
      },
      
      media: {
        logo_url: logoUrl,
        logos: imagesData?.logos?.slice(0, 25) || [],
        backdrops: imagesData?.backdrops?.slice(0, 25) || [],
        posters: imagesData?.posters?.slice(0, 25) || [],
        videos: {
          trailers: trailers.slice(0, 3),
          teasers: teasers.slice(0, 2),
          opening_credits: openingCredits.slice(0, 2),
          all: allVideos
        }
      },
      
      seasons: seasonsInfo,
      season_one: formattedSeasonOne,
      
      genres: (arData?.genres?.length ? arData.genres : enData?.genres) || baseData.genres || [],
      production_companies: baseData.production_companies || enData?.production_companies || [],
      production_countries: baseData.production_countries || enData?.production_countries || [],
      spoken_languages: baseData.spoken_languages || enData?.spoken_languages || [],
      
      statistics: {
        number_of_seasons: baseData.number_of_seasons || enData?.number_of_seasons || 0,
        number_of_episodes: baseData.number_of_episodes || enData?.number_of_episodes || 0,
        status: baseData.status || enData?.status,
        type: baseData.type || enData?.type,
        in_production: baseData.in_production || enData?.in_production || false,
        last_air_date: baseData.last_air_date || enData?.last_air_date,
        next_episode_to_air: baseData.next_episode_to_air || enData?.next_episode_to_air
      },
      
      tagline: arData?.tagline?.trim() || enData?.tagline?.trim() || baseData.tagline?.trim() || "",
      status: baseData.status || enData?.status || "",
      number_of_seasons: baseData.number_of_seasons || enData?.number_of_seasons || 0,
      number_of_episodes: baseData.number_of_episodes || enData?.number_of_episodes || 0,
      episode_run_time: baseData.episode_run_time || enData?.episode_run_time || [],
      created_by: baseData.created_by || enData?.created_by || [],
      
      credits: {
        cast: creditsData?.cast || [],
        crew: creditsData?.crew || []
      },
      
      similar_data: {
        recommendations: filteredRecommendations, 
        similar: filteredSimilar  
      },
      
      similar_tvshows: similarTVShows,
      watch_providers: watchProvidersData?.results || {}, 
      networks: baseData.networks || [],
      homepage: baseData.homepage || "",
      popularity: baseData.popularity || 0,
      vote_average: baseData.vote_average || 0,
      vote_count: baseData.vote_count || 0,
      backdrop_path: baseData.backdrop_path || "",
      poster_path: baseData.poster_path || "",
      first_air_date: baseData.first_air_date || "",
      last_air_date: baseData.last_air_date || "",
      in_production: baseData.in_production || false,
      languages: baseData.languages || [],
      origin_country: baseData.origin_country || [],
      next_episode_to_air: baseData.next_episode_to_air || null
    }

    setToCache(cacheKey, merged)
    return merged
  } catch (error) {
    console.error(`Error fetching comprehensive TV show details for ${tvId}:`, error)
    return null
  }
}

export async function getPersonDetails(personId: number): Promise<any | null> {
  
  function cleanBiography(text: string): string {
    if (!text) return ""
    return text
      .replace(/\r?\n\s*\r?\n+/g, " ")
      .replace(/\r?\n/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim()
  }

  try {
    const cacheKey = getCacheKey(`person_details_comprehensive_${personId}`)
    const cached = getFromCache<any>(cacheKey)
    if (cached) return cached
    
    const apiKey = getNextApiKey()
    const requests = [
      safeFetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&language=ar`),
      safeFetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&language=en`),
      safeFetch(
        `${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}` +
        `&append_to_response=movie_credits,tv_credits,images,external_ids` +
        `&language=en-US`
      )
    ]

    const [arRes, enRes, combinedRes] = await Promise.all(requests)
    const arData = arRes.ok ? await safeJsonParse(arRes) : {}
    const enData = enRes.ok ? await safeJsonParse(enRes) : {}
    const combinedData = combinedRes.ok ? await safeJsonParse(combinedRes) : {}
    const baseData = combinedData || enData || arData
    
    const movieCredits = combinedData?.movie_credits || {}
    const tvCredits = combinedData?.tv_credits || {}
    const imagesData = combinedData?.images || {}
    const externalIdsData = combinedData?.external_ids || {}
    
    const rawMovieCast = (movieCredits.cast || [])
      .filter((credit: any) => credit && credit.id && credit.title)
      .map((credit: any) => ({
        ...credit,
        credit_type: 'cast',
        media_type: 'movie',
        character: credit.character || ''
      }))
    
    const rawTVCast = (tvCredits.cast || [])
      .filter((credit: any) => credit && credit.id && credit.name)
      .map((credit: any) => ({
        ...credit,
        credit_type: 'cast',
        media_type: 'tv',
        character: credit.character || ''
      }))
    
    const validMovies = filterValidMovies(rawMovieCast)
    const validTVShows = filterValidTVShows(rawTVCast)
    const uniqueMoviesMap = new Map()
    const uniqueTVShowsMap = new Map()
    
    validMovies.forEach(movie => {
      if (!uniqueMoviesMap.has(movie.id)) {
        uniqueMoviesMap.set(movie.id, movie)
      }
    })
    
    validTVShows.forEach(show => {
      if (!uniqueTVShowsMap.has(show.id)) {
        uniqueTVShowsMap.set(show.id, show)
      }
    })
    
    const uniqueMovies = Array.from(uniqueMoviesMap.values())
    const uniqueTVShows = Array.from(uniqueTVShowsMap.values())
    const uniqueWorksMap = new Map()
    
    uniqueMovies.forEach(movie => {
      uniqueWorksMap.set(`movie-${movie.id}`, movie)
    })
    
    uniqueTVShows.forEach(show => {
      uniqueWorksMap.set(`tv-${show.id}`, show)
    })

    const allWorks = Array.from(uniqueWorksMap.values()).sort((a, b) => {
      const dateA = a.release_date || a.first_air_date
      const dateB = b.release_date || b.first_air_date
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    const knownFor = allWorks
      .filter((work: any) => work.poster_path && (work.vote_average || 0) > 0)
      .slice(0, 20)

    const profiles = (imagesData.profiles || [])
      .map((img: any) => ({
        file_path: img.file_path,
        aspect_ratio: img.aspect_ratio,
        height: img.height,
        width: img.width,
        vote_average: img.vote_average,
        vote_count: img.vote_count
      }))
      .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0))
    
    const socialMedia = {
      facebook: externalIdsData.facebook_id ? 
        `https://www.facebook.com/${externalIdsData.facebook_id}` : null,
      instagram: externalIdsData.instagram_id ? 
        `https://www.instagram.com/${externalIdsData.instagram_id}` : null,
      twitter: externalIdsData.twitter_id ? 
        `https://twitter.com/${externalIdsData.twitter_id}` : null,
      youtube: externalIdsData.youtube_id ? 
        `https://www.youtube.com/${externalIdsData.youtube_id}` : null,
      tiktok: externalIdsData.tiktok_id ? 
        `https://www.tiktok.com/@${externalIdsData.tiktok_id}` : null,
      imdb: externalIdsData.imdb_id ? 
        `https://www.imdb.com/name/${externalIdsData.imdb_id}` : null,
      wikidata: externalIdsData.wikidata_id ? 
        `https://www.wikidata.org/wiki/${externalIdsData.wikidata_id}` : null
    }

    const merged = {
      id: personId,
      name: enData?.name?.trim() || baseData.name?.trim() || "",
      original_name: baseData.original_name || "",
      arabic_name: arData?.name?.trim() || "",
      biography: cleanBiography(arData?.biography || enData?.biography || baseData.biography || ""),
      arabic_biography: cleanBiography(arData?.biography || ""),
      english_biography: cleanBiography(enData?.biography || baseData.biography || ""),
      birthday: baseData.birthday || "",
      deathday: baseData.deathday || null,
      place_of_birth: arData?.place_of_birth?.trim() || enData?.place_of_birth?.trim() || baseData.place_of_birth || "",
      arabic_place_of_birth: arData?.place_of_birth?.trim() || "",
      english_place_of_birth: enData?.place_of_birth?.trim() || baseData.place_of_birth || "",
      also_known_as: baseData.also_known_as || [],
      gender: baseData.gender || 0,
      known_for_department: baseData.known_for_department || "",
      popularity: baseData.popularity || 0,
      profile_path: baseData.profile_path || "",
      media: {
        profiles: profiles,
        profile_url: baseData.profile_path ? `${TMDB_IMAGE_BASE_URL}/original${baseData.profile_path}` : null
      },
      external_ids: externalIdsData || {},
      social_media: socialMedia,
      credits: {
        movie: {
          cast: uniqueMovies 
        },
        tv: {
          cast: uniqueTVShows
        },
        all: allWorks,
        known_for: knownFor
      },
      statistics: {
        total_movies: uniqueMovies.length,
        total_tv_shows: uniqueTVShows.length,
        total_credits: allWorks.length
      }
    }

    setToCache(cacheKey, merged)
    return merged
  } catch (error) {
    console.error(`Error fetching person details for ${personId}:`, error)
    return null
  }
}
