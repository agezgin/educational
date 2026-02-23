/**
 * VOD (Film) ve Series (Dizi) type tanimlari.
 * M3U ve Xtream Codes API'den gelen film/dizi icerikleri icin.
 */

export type ContentType = 'live' | 'movie' | 'series';

export interface Movie {
  id: string;
  name: string;
  url: string;
  posterUrl?: string;
  backdropUrl?: string;
  groupTitle: string;
  /** Film suresi (dakika) */
  duration?: number;
  /** IMDB/TMDB rating */
  rating?: number;
  /** Film yili */
  year?: number;
  /** Film aciklamasi */
  description?: string;
  /** Tur (Aksiyon, Dram, vb.) */
  genre?: string;
  /** Xtream stream ID */
  streamId?: number;
  /** Favori mi? */
  isFavorite: boolean;
  /** Son izlenme zamani */
  lastWatched?: number;
  /** Izlenme durumu (saniye) - kaldigi yerden devam icin */
  watchProgress?: number;
}

export interface Series {
  id: string;
  name: string;
  posterUrl?: string;
  backdropUrl?: string;
  groupTitle: string;
  rating?: number;
  year?: number;
  description?: string;
  genre?: string;
  seasons: Season[];
  isFavorite: boolean;
  lastWatched?: number;
}

export interface Season {
  id: string;
  seriesId: string;
  seasonNumber: number;
  name: string;
  posterUrl?: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  url: string;
  posterUrl?: string;
  duration?: number;
  description?: string;
  /** Izlenme durumu (saniye) - kaldigi yerden devam icin */
  watchProgress?: number;
}

export interface MovieGroup {
  id: string;
  name: string;
  icon?: string;
  movieCount: number;
  movies: Movie[];
}

export interface SeriesGroup {
  id: string;
  name: string;
  icon?: string;
  seriesCount: number;
  series: Series[];
}
