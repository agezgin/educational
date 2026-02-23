/**
 * TMDB (The Movie Database) API Servisi
 *
 * Ucretsiz API ile:
 * - Film/Dizi detay bilgileri (poster, backdrop, ozet, yil, sure)
 * - Puan ve oy sayisi (TMDB + IMDB)
 * - Oyuncu kadrosu (cast) ve yonetmen
 * - Turler (genre)
 * - Fragmanlar (YouTube trailer linkleri)
 * - Benzer filmler/diziler (recommendations + similar)
 * - Koleksiyon/Seri bilgisi (devami, onceki film)
 * - Kullanici yorumlari (reviews)
 *
 * API Dokumantasyonu: https://developer.themoviedb.org/docs
 * Ucretsiz API key: https://www.themoviedb.org/settings/api
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// API key - .env dosyasindan alinmali, burada placeholder
let API_KEY = '';

export function setTMDBApiKey(key: string): void {
  API_KEY = key;
}

// ─── Gorsel URL Yardimcilari ──────────────────────────────────

export const imageUrl = {
  poster: (path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
  backdrop: (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
  profile: (path: string | null, size: 'w185' | 'h632' | 'original' = 'w185') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
};

// ─── API Fetch Yardimcisi ─────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'tr-TR'); // Turkce oncelikli
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API hatasi: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ─── Response Type'lari ───────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  imdb_id: string | null;
  original_language: string;
  spoken_languages: Array<{ iso_639_1: string; english_name: string; name: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: string;
  networks: Array<{ id: number; name: string; logo_path: string | null }>;
  created_by: Array<{ id: number; name: string; profile_path: string | null }>;
  spoken_languages: Array<{ iso_639_1: string; english_name: string; name: string }>;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBVideo {
  id: string;
  key: string; // YouTube video ID
  name: string;
  site: string; // "YouTube"
  type: string; // "Trailer", "Teaser", "Clip"
  official: boolean;
  published_at: string;
  iso_639_1: string;
}

export interface TMDBReview {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  url: string;
}

export interface TMDBListItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

export interface TMDBCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBListItem[];
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

// ─── FILM API FONKSIYONLARI ──────────────────────────────────

/**
 * Film detay bilgisini getirir.
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  return tmdbFetch(`/movie/${movieId}`);
}

/**
 * Film oyuncu kadrosu ve ekip.
 */
export async function getMovieCredits(movieId: number): Promise<{
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}> {
  return tmdbFetch(`/movie/${movieId}/credits`);
}

/**
 * Film fragmanlari (YouTube linkleri).
 * Oncelik: TR fragman -> EN fragman -> Herhangi
 */
export async function getMovieVideos(movieId: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/movie/${movieId}/videos`);
  let videos = data.results;

  // Turkce fragman yoksa Ingilizce'yi de cek
  if (!videos.some(v => v.iso_639_1 === 'tr')) {
    const enData = await tmdbFetch<{ results: TMDBVideo[] }>(
      `/movie/${movieId}/videos`,
      { language: 'en-US' }
    );
    videos = [...videos, ...enData.results];
  }

  // Trailer'lari one al, sonra Teaser, sonra digerleri
  return videos.sort((a, b) => {
    const priority: Record<string, number> = { Trailer: 0, Teaser: 1, Clip: 2 };
    return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
  });
}

/**
 * Benzer filmler (icerik bazli oneri).
 */
export async function getSimilarMovies(movieId: number): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/movie/${movieId}/similar`);
  return data.results;
}

/**
 * Onerilen filmler (kullanici bazli oneri - daha iyi sonuclar).
 */
export async function getMovieRecommendations(movieId: number): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/movie/${movieId}/recommendations`);
  return data.results;
}

/**
 * Film yorumlari.
 */
export async function getMovieReviews(movieId: number): Promise<TMDBReview[]> {
  const data = await tmdbFetch<{ results: TMDBReview[] }>(`/movie/${movieId}/reviews`);
  // Turkce yoksa Ingilizce
  if (data.results.length === 0) {
    const enData = await tmdbFetch<{ results: TMDBReview[] }>(
      `/movie/${movieId}/reviews`,
      { language: 'en-US' }
    );
    return enData.results;
  }
  return data.results;
}

/**
 * Film koleksiyonu (seri/devam filmleri - orn: Avengers serisi).
 */
export async function getMovieCollection(collectionId: number): Promise<TMDBCollection> {
  return tmdbFetch(`/collection/${collectionId}`);
}

/**
 * Film arama (isim ile TMDB eslestirme).
 */
export async function searchMovie(query: string, year?: number): Promise<TMDBListItem[]> {
  const params: Record<string, string> = {};
  if (year) params.year = String(year);
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/search/movie`, {
    query,
    ...params,
  });
  return data.results;
}

// ─── DIZI API FONKSIYONLARI ──────────────────────────────────

/**
 * Dizi detay bilgisi.
 */
export async function getTVShowDetails(tvId: number): Promise<TMDBTVShow> {
  return tmdbFetch(`/tv/${tvId}`);
}

/**
 * Dizi oyuncu kadrosu.
 */
export async function getTVShowCredits(tvId: number): Promise<{
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}> {
  return tmdbFetch(`/tv/${tvId}/credits`);
}

/**
 * Dizi fragmanlari.
 */
export async function getTVShowVideos(tvId: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/tv/${tvId}/videos`);
  let videos = data.results;

  if (!videos.some(v => v.iso_639_1 === 'tr')) {
    const enData = await tmdbFetch<{ results: TMDBVideo[] }>(
      `/tv/${tvId}/videos`,
      { language: 'en-US' }
    );
    videos = [...videos, ...enData.results];
  }

  return videos.sort((a, b) => {
    const priority: Record<string, number> = { Trailer: 0, Teaser: 1, Clip: 2 };
    return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
  });
}

/**
 * Benzer diziler.
 */
export async function getSimilarTVShows(tvId: number): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/tv/${tvId}/similar`);
  return data.results;
}

/**
 * Onerilen diziler.
 */
export async function getTVShowRecommendations(tvId: number): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/tv/${tvId}/recommendations`);
  return data.results;
}

/**
 * Dizi yorumlari.
 */
export async function getTVShowReviews(tvId: number): Promise<TMDBReview[]> {
  const data = await tmdbFetch<{ results: TMDBReview[] }>(`/tv/${tvId}/reviews`);
  if (data.results.length === 0) {
    const enData = await tmdbFetch<{ results: TMDBReview[] }>(
      `/tv/${tvId}/reviews`,
      { language: 'en-US' }
    );
    return enData.results;
  }
  return data.results;
}

/**
 * Sezon detay (bolum listesi ile birlikte).
 */
export async function getTVSeasonDetails(tvId: number, seasonNumber: number): Promise<TMDBSeason> {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

/**
 * Dizi arama.
 */
export async function searchTVShow(query: string, year?: number): Promise<TMDBListItem[]> {
  const params: Record<string, string> = {};
  if (year) params.first_air_date_year = String(year);
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/search/tv`, {
    query,
    ...params,
  });
  return data.results;
}

// ─── COKLU ARAMA (Film + Dizi birlikte) ──────────────────────

export async function searchMulti(query: string): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(`/search/multi`, { query });
  return data.results.filter(item =>
    item.media_type === 'movie' || item.media_type === 'tv'
  );
}

// ─── KISI (PERSON) API FONKSIYONLARI ────────────────────────

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  also_known_as: string[];
  gender: number;
  popularity: number;
}

export interface TMDBPersonCredit {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
}

/**
 * Kisi detay bilgisi (yonetmen, oyuncu, vb.)
 */
export async function getPersonDetails(personId: number): Promise<TMDBPerson> {
  return tmdbFetch(`/person/${personId}`);
}

/**
 * Kisinin tum yapimlarini (film + dizi) getirir.
 * Hem oyuncu olarak hem de ekip olarak calismalarini dondurur.
 */
export async function getPersonCredits(personId: number): Promise<{
  cast: TMDBPersonCredit[];
  crew: TMDBPersonCredit[];
}> {
  return tmdbFetch(`/person/${personId}/combined_credits`);
}

/**
 * Kisi arama (isim ile).
 */
export async function searchPerson(query: string): Promise<Array<{
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: TMDBListItem[];
}>> {
  const data = await tmdbFetch<{ results: Array<{
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    known_for: TMDBListItem[];
  }> }>('/search/person', { query });
  return data.results;
}

/**
 * Kisi detay sayfasi icin gereken tum verileri tek seferde ceker.
 */
export async function getFullPersonData(personId: number) {
  const [details, credits] = await Promise.all([
    getPersonDetails(personId),
    getPersonCredits(personId),
  ]);

  // Oyunculuk - puana gore sirala, en iyi yapimlar basta
  const actingCredits = credits.cast
    .filter(c => c.vote_average > 0)
    .sort((a, b) => b.vote_average - a.vote_average);

  // Yonetmenlik
  const directingCredits = credits.crew
    .filter(c => c.job === 'Director' || c.department === 'Directing')
    .sort((a, b) => b.vote_average - a.vote_average);

  // Yapimcilik
  const producingCredits = credits.crew
    .filter(c => c.department === 'Production')
    .sort((a, b) => b.vote_average - a.vote_average);

  // Film vs Dizi ayirimi
  const movies = actingCredits.filter(c => c.media_type === 'movie');
  const tvShows = actingCredits.filter(c => c.media_type === 'tv');

  return {
    details,
    actingCredits: actingCredits.slice(0, 30),
    directingCredits: directingCredits.slice(0, 20),
    producingCredits: producingCredits.slice(0, 10),
    movies: movies.slice(0, 20),
    tvShows: tvShows.slice(0, 20),
    totalCredits: credits.cast.length + credits.crew.length,
  };
}

// ─── TRENDING / DISCOVER ────────────────────────────────────

/**
 * Trend icerikler (gunluk/haftalik).
 */
export async function getTrending(
  mediaType: 'movie' | 'tv' | 'all' = 'all',
  timeWindow: 'day' | 'week' = 'week',
): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(
    `/trending/${mediaType}/${timeWindow}`,
  );
  return data.results;
}

/**
 * Genre'a gore icerik kesfet.
 */
export async function discoverByGenre(
  mediaType: 'movie' | 'tv',
  genreId: number,
  page = 1,
): Promise<TMDBListItem[]> {
  const data = await tmdbFetch<{ results: TMDBListItem[] }>(
    `/discover/${mediaType}`,
    { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' },
  );
  return data.results;
}

/**
 * Film turleri listesi.
 */
export async function getMovieGenres(): Promise<Array<{ id: number; name: string }>> {
  const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>('/genre/movie/list');
  return data.genres;
}

/**
 * Dizi turleri listesi.
 */
export async function getTVGenres(): Promise<Array<{ id: number; name: string }>> {
  const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>('/genre/tv/list');
  return data.genres;
}

// ─── TOPLU VERİ CEKME (Detay sayfasi icin tek seferde) ───────

/**
 * Film detay sayfasi icin gereken tum verileri tek seferde ceker.
 * Paralel API cagrilari ile hiz optimizasyonu.
 */
export async function getFullMovieData(movieId: number) {
  const [details, credits, videos, similar, recommendations, reviews] = await Promise.all([
    getMovieDetails(movieId),
    getMovieCredits(movieId),
    getMovieVideos(movieId),
    getSimilarMovies(movieId),
    getMovieRecommendations(movieId),
    getMovieReviews(movieId),
  ]);

  // Koleksiyon varsa (seri/devam filmleri) onu da cek
  let collection: TMDBCollection | null = null;
  if (details.belongs_to_collection) {
    collection = await getMovieCollection(details.belongs_to_collection.id);
  }

  // Yonetmeni bul
  const director = credits.crew.find(c => c.job === 'Director');

  // Trailer'i bul (YouTube)
  const trailer = videos.find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  return {
    details,
    cast: credits.cast.slice(0, 15), // Ilk 15 oyuncu
    director,
    trailer,
    allVideos: videos,
    similar: similar.slice(0, 10),
    recommendations: recommendations.slice(0, 10),
    reviews: reviews.slice(0, 5),
    collection,
  };
}

/**
 * Dizi detay sayfasi icin gereken tum verileri tek seferde ceker.
 */
export async function getFullTVShowData(tvId: number) {
  const [details, credits, videos, similar, recommendations, reviews] = await Promise.all([
    getTVShowDetails(tvId),
    getTVShowCredits(tvId),
    getTVShowVideos(tvId),
    getSimilarTVShows(tvId),
    getTVShowRecommendations(tvId),
    getTVShowReviews(tvId),
  ]);

  const trailer = videos.find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  return {
    details,
    cast: credits.cast.slice(0, 15),
    creators: details.created_by,
    trailer,
    allVideos: videos,
    similar: similar.slice(0, 10),
    recommendations: recommendations.slice(0, 10),
    reviews: reviews.slice(0, 5),
  };
}
