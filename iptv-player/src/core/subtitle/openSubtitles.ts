/**
 * OpenSubtitles API Entegrasyonu
 *
 * Ucretsiz altyazi arama ve indirme servisi.
 * API: https://opensubtitles.stoplight.io/docs/opensubtitles-api
 *
 * Ozellikler:
 * - Film/Dizi adina gore altyazi arama
 * - IMDB ID ile kesin eslestirme
 * - Dil filtreleme (Turkce, Ingilizce, vb.)
 * - Altyazi indirme
 */

const OPENSUBTITLES_BASE = 'https://api.opensubtitles.com/api/v1';

let API_KEY = '';
let AUTH_TOKEN = '';

export function setOpenSubtitlesApiKey(key: string): void {
  API_KEY = key;
}

export function setOpenSubtitlesToken(token: string): void {
  AUTH_TOKEN = token;
}

// ─── Types ────────────────────────────────────────────────────

export interface SubtitleSearchResult {
  id: string;
  type: string;
  attributes: {
    subtitle_id: string;
    language: string;
    download_count: number;
    hearing_impaired: boolean;
    hd: boolean;
    fps: number;
    votes: number;
    ratings: number;
    from_trusted: boolean;
    foreign_parts_only: boolean;
    upload_date: string;
    ai_translated: boolean;
    machine_translated: boolean;
    release: string;
    comments: string;
    files: Array<{
      file_id: number;
      cd_number: number;
      file_name: string;
    }>;
    feature_details: {
      feature_id: number;
      feature_type: string;
      year: number;
      title: string;
      movie_name: string;
      imdb_id: number;
      tmdb_id: number;
      season_number?: number;
      episode_number?: number;
      parent_title?: string;
    };
  };
}

export interface SubtitleDownloadResult {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  message: string;
}

/** Desteklenen dil kodlari */
export const SUBTITLE_LANGUAGES = {
  tr: 'Turkce',
  en: 'English',
  de: 'Deutsch',
  fr: 'Francais',
  es: 'Espanol',
  it: 'Italiano',
  pt: 'Portugues',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Nederlands',
  pl: 'Polski',
  el: 'Greek',
  ro: 'Romanian',
  hu: 'Hungarian',
  cs: 'Czech',
  bg: 'Bulgarian',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
} as const;

// ─── API Fonksiyonlari ───────────────────────────────────────

async function openSubFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${OPENSUBTITLES_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    'Api-Key': API_KEY,
    'Content-Type': 'application/json',
  };
  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`OpenSubtitles API hatasi: ${response.status}`);
  }
  return response.json();
}

/**
 * Film/Dizi icin altyazi arar.
 *
 * @param query - Film/Dizi adi
 * @param languages - Dil kodlari (orn: "tr,en")
 * @param options - Ek filtreler
 */
export async function searchSubtitles(
  query: string,
  languages = 'tr,en',
  options?: {
    imdbId?: number;
    tmdbId?: number;
    year?: number;
    seasonNumber?: number;
    episodeNumber?: number;
    type?: 'movie' | 'episode';
  }
): Promise<SubtitleSearchResult[]> {
  const params: Record<string, string> = {
    query,
    languages,
    order_by: 'download_count',
    order_direction: 'desc',
  };

  if (options?.imdbId) params.imdb_id = String(options.imdbId);
  if (options?.tmdbId) params.tmdb_id = String(options.tmdbId);
  if (options?.year) params.year = String(options.year);
  if (options?.seasonNumber) params.season_number = String(options.seasonNumber);
  if (options?.episodeNumber) params.episode_number = String(options.episodeNumber);
  if (options?.type) params.type = options.type;

  const data = await openSubFetch<{ data: SubtitleSearchResult[] }>('/subtitles', params);
  return data.data;
}

/**
 * Altyazi dosyasini indirir.
 * Not: Ucretsiz plan gunluk indirme limiti vardir.
 */
export async function downloadSubtitle(fileId: number): Promise<SubtitleDownloadResult> {
  const url = `${OPENSUBTITLES_BASE}/download`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!response.ok) {
    throw new Error(`Altyazi indirme hatasi: ${response.status}`);
  }

  return response.json();
}

/**
 * Film/Dizi icin mevcut altyazi dillerini listeler.
 * Kullaniciya hangi dillerde altyazi mevcut gostermek icin.
 */
export async function getAvailableLanguages(
  query: string,
  options?: { imdbId?: number; tmdbId?: number }
): Promise<Array<{ code: string; label: string; count: number }>> {
  const results = await searchSubtitles(query, '', options);

  const langCounts = new Map<string, number>();
  for (const result of results) {
    const lang = result.attributes.language;
    langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
  }

  return Array.from(langCounts.entries())
    .map(([code, count]) => ({
      code,
      label: SUBTITLE_LANGUAGES[code as keyof typeof SUBTITLE_LANGUAGES] || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
