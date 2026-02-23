/**
 * Catalog Transformer - IPTV Kategorilerini Netflix Layout'a Donusturur
 *
 * IPTV saglayicilari "TR - NETFLIX DIZILERI", "TR - SALI DIZILERI" gibi
 * duz kategoriler verir. Bu servis bunlari akilli satirlara donusturur:
 *
 * - Hero banner: En populer / onerilen icerik
 * - "Devam Et" satiri: Kaldigi yerden devam (watchProgress > 0)
 * - "Yeni Eklenenler" satiri: Son eklenen icerikler
 * - "Senin Icin" satiri: Izleme gecmisine gore oneri
 * - Platform satirlari: Netflix, TOD, Disney+, vb.
 * - Tur satirlari: Aksiyon, Dram, Komedi (TMDB genre'larindan)
 * - Gun satirlari: "Cuma Dizileri" -> "Bu Cuma" olarak sunulur
 * - En Yuksek Puanli satiri
 * - Favorilerim satiri
 *
 * Her satir yatay scrollable, Netflix tarzi poster kartlar.
 */

import { Movie, Series, MovieGroup, SeriesGroup } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface CatalogRow {
  id: string;
  title: string;
  subtitle?: string;
  type: RowType;
  items: CatalogItem[];
  /** Satir gorunum stili */
  style: 'poster' | 'backdrop' | 'hero';
  /** Siralama onceligi (kucuk = ust) */
  priority: number;
}

export type RowType =
  | 'hero'
  | 'continue_watching'
  | 'new_additions'
  | 'for_you'
  | 'trending'
  | 'top_rated'
  | 'favorites'
  | 'platform'
  | 'genre'
  | 'day'
  | 'year'
  | 'custom';

export interface CatalogItem {
  id: string;
  name: string;
  posterUrl?: string;
  backdropUrl?: string;
  type: 'movie' | 'series';
  year?: number;
  rating?: number;
  genre?: string;
  /** Izlenme ilerlemesi (0-1 arasi) */
  progress?: number;
  /** Hangi platformdan (Netflix, TOD, vb.) */
  platform?: string;
  /** Orjinal grup ismi */
  originalGroup?: string;
}

// ─── Bilinen Platform Pattern'leri ──────────────────────

interface PlatformMapping {
  pattern: RegExp;
  name: string;
  icon: string;
  color: string;
}

const PLATFORM_MAPPINGS: PlatformMapping[] = [
  { pattern: /netflix/i, name: 'Netflix', icon: 'N', color: '#E50914' },
  { pattern: /disney\+?|disney plus/i, name: 'Disney+', icon: 'D+', color: '#113CCF' },
  { pattern: /amazon|prime/i, name: 'Prime Video', icon: 'P', color: '#00A8E1' },
  { pattern: /hbo|max/i, name: 'HBO Max', icon: 'HBO', color: '#B537F2' },
  { pattern: /apple\s?tv/i, name: 'Apple TV+', icon: 'A+', color: '#000000' },
  { pattern: /tod\b/i, name: 'TOD', icon: 'TOD', color: '#FF6B00' },
  { pattern: /tabii/i, name: 'Tabii', icon: 'T', color: '#1A73E8' },
  { pattern: /blutv|blu\s?tv/i, name: 'BluTV', icon: 'B', color: '#0066FF' },
  { pattern: /gain/i, name: 'Gain', icon: 'G', color: '#FF4500' },
  { pattern: /exxen/i, name: 'Exxen', icon: 'E', color: '#6C3AE0' },
  { pattern: /mubi/i, name: 'MUBI', icon: 'M', color: '#0000FF' },
  { pattern: /paramount/i, name: 'Paramount+', icon: 'P+', color: '#0064FF' },
  { pattern: /peacock/i, name: 'Peacock', icon: 'PC', color: '#000000' },
  { pattern: /hulu/i, name: 'Hulu', icon: 'H', color: '#1CE783' },
];

/** Gun pattern'leri */
const DAY_MAPPINGS: Record<string, string> = {
  pazartesi: 'Pazartesi',
  sali: 'Sali',
  carsamba: 'Carsamba',
  persembe: 'Persembe',
  cuma: 'Cuma',
  cumartesi: 'Cumartesi',
  pazar: 'Pazar',
};

/** Tur pattern'leri (Turkce + Ingilizce) */
const GENRE_MAPPINGS: Record<string, string> = {
  aksiyon: 'Aksiyon',
  action: 'Aksiyon',
  komedi: 'Komedi',
  comedy: 'Komedi',
  dram: 'Dram',
  drama: 'Dram',
  korku: 'Korku',
  horror: 'Korku',
  bilim: 'Bilim Kurgu',
  'sci-fi': 'Bilim Kurgu',
  romantik: 'Romantik',
  romance: 'Romantik',
  gerilim: 'Gerilim',
  thriller: 'Gerilim',
  belgesel: 'Belgesel',
  documentary: 'Belgesel',
  animasyon: 'Animasyon',
  animation: 'Animasyon',
  fantastik: 'Fantastik',
  fantasy: 'Fantastik',
  aile: 'Aile',
  family: 'Aile',
  suç: 'Suc',
  crime: 'Suc',
  savas: 'Savas',
  war: 'Savas',
  tarih: 'Tarihi',
  history: 'Tarihi',
  western: 'Western',
  muzik: 'Muzik',
  music: 'Muzik',
};

// ─── Kategori Analizi ───────────────────────────────────

interface CategoryAnalysis {
  originalName: string;
  cleanName: string;
  platform?: string;
  platformColor?: string;
  day?: string;
  genre?: string;
  country?: string;
  isNew?: boolean;
  isTop?: boolean;
  year?: number;
}

/**
 * IPTV kategori ismini analiz eder.
 * "TR - NETFLIX DIZILERI" -> { platform: "Netflix", country: "TR" }
 * "TR - CUMA DIZILERI" -> { day: "Cuma", country: "TR" }
 */
function analyzeCategory(categoryName: string): CategoryAnalysis {
  const original = categoryName;
  let clean = categoryName.trim();

  // Ulke kodu cikar (TR, EN, DE, vb.)
  let country: string | undefined;
  const countryMatch = clean.match(/^([A-Z]{2})\s*[-·•|]\s*/);
  if (countryMatch) {
    country = countryMatch[1];
    clean = clean.substring(countryMatch[0].length).trim();
  }

  // Platform bul
  let platform: string | undefined;
  let platformColor: string | undefined;
  for (const mapping of PLATFORM_MAPPINGS) {
    if (mapping.pattern.test(clean)) {
      platform = mapping.name;
      platformColor = mapping.color;
      break;
    }
  }

  // Gun bul
  let day: string | undefined;
  const cleanLower = clean.toLowerCase();
  for (const [pattern, dayName] of Object.entries(DAY_MAPPINGS)) {
    if (cleanLower.includes(pattern)) {
      day = dayName;
      break;
    }
  }

  // Tur bul
  let genre: string | undefined;
  for (const [pattern, genreName] of Object.entries(GENRE_MAPPINGS)) {
    if (cleanLower.includes(pattern)) {
      genre = genreName;
      break;
    }
  }

  // Yeni / Top
  const isNew = /yeni|new|son\s*eklenen/i.test(clean);
  const isTop = /top|en\s*iyi|populer|popular/i.test(clean);

  // Yil
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

  return {
    originalName: original,
    cleanName: clean,
    platform,
    platformColor,
    day,
    genre,
    country,
    isNew,
    isTop,
    year,
  };
}

// ─── Ana Donusturucu ────────────────────────────────────

/**
 * Film listesini Netflix tarzi satirlara donusturur.
 */
export function transformMovieCatalog(
  movies: Movie[],
  groups: MovieGroup[],
): CatalogRow[] {
  const rows: CatalogRow[] = [];

  // 1. Hero Banner - En yuksek puanli filmler
  const heroItems = [...movies]
    .filter(m => m.backdropUrl || m.posterUrl)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  if (heroItems.length > 0) {
    rows.push({
      id: 'hero',
      title: '',
      type: 'hero',
      items: heroItems.map(movieToItem),
      style: 'hero',
      priority: 0,
    });
  }

  // 2. Devam Et (kaldigi yerden)
  const continueItems = movies
    .filter(m => m.watchProgress && m.watchProgress > 0 && m.duration && m.watchProgress < m.duration * 0.9)
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
    .slice(0, 15);

  if (continueItems.length > 0) {
    rows.push({
      id: 'continue',
      title: 'Kaldığın Yerden Devam Et',
      type: 'continue_watching',
      items: continueItems.map(m => ({
        ...movieToItem(m),
        progress: m.duration ? m.watchProgress! / m.duration : 0,
      })),
      style: 'backdrop',
      priority: 1,
    });
  }

  // 3. Favoriler
  const favorites = movies.filter(m => m.isFavorite).slice(0, 20);
  if (favorites.length > 0) {
    rows.push({
      id: 'favorites',
      title: 'Listem',
      type: 'favorites',
      items: favorites.map(movieToItem),
      style: 'poster',
      priority: 2,
    });
  }

  // 4. Kategorileri analiz et ve satirlara donustur
  const platformRows: Record<string, CatalogItem[]> = {};
  const genreRows: Record<string, CatalogItem[]> = {};
  const dayRows: Record<string, CatalogItem[]> = {};
  const newItems: CatalogItem[] = [];
  const topItems: CatalogItem[] = [];

  for (const group of groups) {
    const analysis = analyzeCategory(group.name);
    const items = group.movies.slice(0, 20).map(m => ({
      ...movieToItem(m),
      platform: analysis.platform,
      originalGroup: group.name,
    }));

    if (analysis.platform) {
      const key = analysis.platform;
      if (!platformRows[key]) platformRows[key] = [];
      platformRows[key].push(...items);
    }

    if (analysis.genre) {
      const key = analysis.genre;
      if (!genreRows[key]) genreRows[key] = [];
      genreRows[key].push(...items);
    }

    if (analysis.day) {
      const key = analysis.day;
      if (!dayRows[key]) dayRows[key] = [];
      dayRows[key].push(...items);
    }

    if (analysis.isNew) newItems.push(...items);
    if (analysis.isTop) topItems.push(...items);
  }

  // Yeni Eklenenler
  if (newItems.length > 0) {
    rows.push({
      id: 'new',
      title: 'Yeni Eklenenler',
      type: 'new_additions',
      items: dedup(newItems).slice(0, 20),
      style: 'poster',
      priority: 3,
    });
  }

  // En Populer
  if (topItems.length > 0) {
    rows.push({
      id: 'top',
      title: 'En Populer',
      type: 'top_rated',
      items: dedup(topItems).slice(0, 20),
      style: 'poster',
      priority: 4,
    });
  }

  // En Yuksek Puanli
  const topRated = [...movies]
    .filter(m => m.rating && m.rating > 7)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 20);

  if (topRated.length > 0) {
    rows.push({
      id: 'top_rated',
      title: 'En Yuksek Puanli',
      type: 'top_rated',
      items: topRated.map(movieToItem),
      style: 'poster',
      priority: 5,
    });
  }

  // Platform satirlari
  let platformPriority = 10;
  for (const [platform, items] of Object.entries(platformRows)) {
    rows.push({
      id: `platform_${platform}`,
      title: `${platform} Filmleri`,
      type: 'platform',
      items: dedup(items).slice(0, 20),
      style: 'poster',
      priority: platformPriority++,
    });
  }

  // Tur satirlari
  let genrePriority = 30;
  for (const [genre, items] of Object.entries(genreRows)) {
    rows.push({
      id: `genre_${genre}`,
      title: genre,
      type: 'genre',
      items: dedup(items).slice(0, 20),
      style: 'poster',
      priority: genrePriority++,
    });
  }

  // TMDB genre'a gore de satirlar ekle (eger IPTV kategorileri yeterli degilse)
  const genreGrouped = groupByGenre(movies);
  for (const [genre, genreMovies] of Object.entries(genreGrouped)) {
    const existingGenre = rows.find(r => r.title === genre);
    if (!existingGenre && genreMovies.length >= 5) {
      rows.push({
        id: `tmdb_genre_${genre}`,
        title: genre,
        type: 'genre',
        items: genreMovies.slice(0, 20).map(movieToItem),
        style: 'poster',
        priority: genrePriority++,
      });
    }
  }

  return rows.sort((a, b) => a.priority - b.priority);
}

/**
 * Dizi listesini Netflix tarzi satirlara donusturur.
 */
export function transformSeriesCatalog(
  series: Series[],
  groups: SeriesGroup[],
): CatalogRow[] {
  const rows: CatalogRow[] = [];

  // 1. Hero
  const heroItems = [...series]
    .filter(s => s.backdropUrl || s.posterUrl)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  if (heroItems.length > 0) {
    rows.push({
      id: 'hero',
      title: '',
      type: 'hero',
      items: heroItems.map(seriesToItem),
      style: 'hero',
      priority: 0,
    });
  }

  // 2. Devam Et
  const continueItems = series
    .filter(s => s.lastWatched && s.lastWatched > 0)
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
    .slice(0, 15);

  if (continueItems.length > 0) {
    rows.push({
      id: 'continue',
      title: 'Kaldığın Yerden Devam Et',
      type: 'continue_watching',
      items: continueItems.map(seriesToItem),
      style: 'backdrop',
      priority: 1,
    });
  }

  // 3. Favoriler
  const favorites = series.filter(s => s.isFavorite).slice(0, 20);
  if (favorites.length > 0) {
    rows.push({
      id: 'favorites',
      title: 'Listem',
      type: 'favorites',
      items: favorites.map(seriesToItem),
      style: 'poster',
      priority: 2,
    });
  }

  // 4. Kategori satirlari
  const platformRows: Record<string, CatalogItem[]> = {};
  const dayRows: Record<string, CatalogItem[]> = {};

  for (const group of groups) {
    const analysis = analyzeCategory(group.name);
    const items = group.series.slice(0, 20).map(s => ({
      ...seriesToItem(s),
      platform: analysis.platform,
      originalGroup: group.name,
    }));

    if (analysis.platform) {
      const key = analysis.platform;
      if (!platformRows[key]) platformRows[key] = [];
      platformRows[key].push(...items);
    }

    if (analysis.day) {
      const key = analysis.day;
      if (!dayRows[key]) dayRows[key] = [];
      dayRows[key].push(...items);
    }
  }

  // Gun satirlari (Cuma Dizileri -> "Cuma Aksami")
  const dayLabels: Record<string, string> = {
    Pazartesi: 'Pazartesi Aksami',
    Sali: 'Sali Aksami',
    Carsamba: 'Carsamba Aksami',
    Persembe: 'Persembe Aksami',
    Cuma: 'Cuma Aksami',
    Cumartesi: 'Cumartesi Aksami',
    Pazar: 'Pazar Aksami',
  };

  let dayPriority = 6;
  for (const [day, items] of Object.entries(dayRows)) {
    rows.push({
      id: `day_${day}`,
      title: dayLabels[day] || `${day} Dizileri`,
      subtitle: 'Bu hafta yayinlananlar',
      type: 'day',
      items: dedup(items).slice(0, 20),
      style: 'poster',
      priority: dayPriority++,
    });
  }

  // Platform satirlari
  let platformPriority = 15;
  for (const [platform, items] of Object.entries(platformRows)) {
    rows.push({
      id: `platform_${platform}`,
      title: `${platform} Dizileri`,
      type: 'platform',
      items: dedup(items).slice(0, 20),
      style: 'poster',
      priority: platformPriority++,
    });
  }

  // En Yuksek Puanli
  const topRated = [...series]
    .filter(s => s.rating && s.rating > 7)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 20);

  if (topRated.length > 0) {
    rows.push({
      id: 'top_rated',
      title: 'En Yuksek Puanli Diziler',
      type: 'top_rated',
      items: topRated.map(seriesToItem),
      style: 'poster',
      priority: 40,
    });
  }

  // Genre satirlari (TMDB'den)
  const genreGrouped = groupSeriesByGenre(series);
  let genrePriority = 50;
  for (const [genre, genreSeries] of Object.entries(genreGrouped)) {
    if (genreSeries.length >= 5) {
      rows.push({
        id: `genre_${genre}`,
        title: genre,
        type: 'genre',
        items: genreSeries.slice(0, 20).map(seriesToItem),
        style: 'poster',
        priority: genrePriority++,
      });
    }
  }

  return rows.sort((a, b) => a.priority - b.priority);
}

// ─── Platform Bilgisi ───────────────────────────────────

export interface PlatformInfo {
  name: string;
  icon: string;
  color: string;
  contentCount: number;
}

/**
 * Mevcut platformlarin listesini cikarir.
 */
export function extractPlatforms(groups: Array<{ name: string; movies?: Movie[]; series?: Series[] }>): PlatformInfo[] {
  const platforms = new Map<string, PlatformInfo>();

  for (const group of groups) {
    for (const mapping of PLATFORM_MAPPINGS) {
      if (mapping.pattern.test(group.name)) {
        const existing = platforms.get(mapping.name);
        const count = (group.movies?.length || 0) + (group.series?.length || 0);
        if (existing) {
          existing.contentCount += count;
        } else {
          platforms.set(mapping.name, {
            name: mapping.name,
            icon: mapping.icon,
            color: mapping.color,
            contentCount: count,
          });
        }
        break;
      }
    }
  }

  return [...platforms.values()].sort((a, b) => b.contentCount - a.contentCount);
}

// ─── Helpers ────────────────────────────────────────────

function movieToItem(movie: Movie): CatalogItem {
  return {
    id: movie.id,
    name: movie.name,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    type: 'movie',
    year: movie.year,
    rating: movie.rating,
    genre: movie.genre,
  };
}

function seriesToItem(series: Series): CatalogItem {
  return {
    id: series.id,
    name: series.name,
    posterUrl: series.posterUrl,
    backdropUrl: series.backdropUrl,
    type: 'series',
    year: series.year,
    rating: series.rating,
    genre: series.genre,
  };
}

function dedup(items: CatalogItem[]): CatalogItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function groupByGenre(movies: Movie[]): Record<string, Movie[]> {
  const groups: Record<string, Movie[]> = {};
  for (const movie of movies) {
    if (movie.genre) {
      const genres = movie.genre.split(/[,&/]/).map(g => g.trim());
      for (const genre of genres) {
        if (genre) {
          if (!groups[genre]) groups[genre] = [];
          groups[genre].push(movie);
        }
      }
    }
  }
  return groups;
}

function groupSeriesByGenre(series: Series[]): Record<string, Series[]> {
  const groups: Record<string, Series[]> = {};
  for (const s of series) {
    if (s.genre) {
      const genres = s.genre.split(/[,&/]/).map(g => g.trim());
      for (const genre of genres) {
        if (genre) {
          if (!groups[genre]) groups[genre] = [];
          groups[genre].push(s);
        }
      }
    }
  }
  return groups;
}
