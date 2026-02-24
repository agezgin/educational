/**
 * Series Tracking Store (Dizi Takip Sistemi)
 *
 * Netflix/Trakt.tv tarzinda dizi takip:
 *
 * - "Takip Et" butonu ile dizi ekleme
 * - Hangi sezon/bolumdesin otomatik takip
 * - Bolum izleyince otomatik "izlendi" isaretle
 * - Yeni bolum gelince bildirim/badge
 * - Izleme istatistikleri
 * - Takvim gorunumu (bu hafta hangi diziler)
 * - "Devam Et" kisa yolu
 *
 * Zustand + persist middleware ile kalici depolama.
 * Tum veriler lokal cihazda.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORE_NAMES } from './persistStorage';

// ─── Types ──────────────────────────────────────────────

export type SeriesStatus =
  | 'watching'     // Aktif izleniyor
  | 'completed'    // Tamamlandi
  | 'on_hold'      // Beklemede (ara verildi)
  | 'dropped'      // Birakildi
  | 'plan_to_watch'; // Izlenecekler listesinde

export interface TrackedSeries {
  /** Dizi ID (Xtream/M3U) */
  seriesId: string;
  /** Dizi adi */
  name: string;
  /** Poster URL */
  posterUrl?: string;
  /** Backdrop URL */
  backdropUrl?: string;
  /** TMDB ID (eslestiyse) */
  tmdbId?: number;
  /** Takip durumu */
  status: SeriesStatus;
  /** Mevcut sezon */
  currentSeason: number;
  /** Mevcut bolum */
  currentEpisode: number;
  /** Toplam sezon sayisi */
  totalSeasons: number;
  /** Mevcut sezondaki toplam bolum */
  totalEpisodesInSeason: number;
  /** Rating (kullanicinin verdigi puan, 1-10) */
  userRating: number | null;
  /** Notlar */
  notes: string;
  /** Takibe alinma tarihi */
  addedAt: number;
  /** Son izlenme tarihi */
  lastWatchedAt: number;
  /** Toplam izlenen bolum sayisi */
  totalWatchedEpisodes: number;
  /** Toplam izleme suresi (dakika) */
  totalWatchTimeMinutes: number;
  /** Tur */
  genre?: string;
  /** Yil */
  year?: number;
  /** IMDB/TMDB rating */
  rating?: number;
  /** Yeni bolum var mi? */
  hasNewEpisode: boolean;
  /** Son kontrol edilen bolum sayisi */
  lastKnownEpisodeCount: number;
  /** Bildirim gosterildi mi? */
  newEpisodeNotified: boolean;
  /** Bolum bazli izleme durumu */
  watchedEpisodes: WatchedEpisodeMap;
}

/**
 * Bolum izleme haritasi.
 * Key: "S01E05" formati
 * Value: izleme bilgisi
 */
export type WatchedEpisodeMap = Record<string, EpisodeWatchInfo>;

export interface EpisodeWatchInfo {
  /** Izlendi mi (yuzde 90+ = izlendi) */
  watched: boolean;
  /** Izleme ilerlemesi (saniye) */
  progressSeconds: number;
  /** Toplam sure (saniye) */
  durationSeconds: number;
  /** Izleme yuzdesi */
  progressPercent: number;
  /** Son izlenme tarihi */
  watchedAt: number;
}

/** Takvim gorunumu icin haftalik program */
export interface WeeklyScheduleItem {
  seriesId: string;
  seriesName: string;
  posterUrl?: string;
  /** Yayin gunu (0=Pazar, 6=Cumartesi) */
  dayOfWeek: number;
  /** Sonraki bolum bilgisi */
  nextEpisode: { season: number; episode: number };
  /** Tahmini yayin tarihi */
  estimatedAirDate?: number;
}

/** Dizi istatistikleri */
export interface TrackingStats {
  /** Toplam takip edilen dizi */
  totalTracked: number;
  /** Aktif izlenen */
  watching: number;
  /** Tamamlanan */
  completed: number;
  /** Beklemede */
  onHold: number;
  /** Birakilmis */
  dropped: number;
  /** Izlenecekler */
  planToWatch: number;
  /** Toplam izlenen bolum */
  totalEpisodesWatched: number;
  /** Toplam izleme suresi (saat) */
  totalWatchTimeHours: number;
  /** Bu ay izlenen bolum */
  episodesThisMonth: number;
  /** En cok izlenen tur */
  topGenre: string | null;
}

// ─── Store ──────────────────────────────────────────────

interface SeriesTrackingState {
  /** Takip edilen diziler */
  trackedSeries: TrackedSeries[];
  /** Yukleniyor mu */
  isLoading: boolean;

  // ─── Temel Islemler ───────────────────────────
  trackSeries: (series: Omit<TrackedSeries, 'addedAt' | 'lastWatchedAt' | 'totalWatchedEpisodes' | 'totalWatchTimeMinutes' | 'hasNewEpisode' | 'lastKnownEpisodeCount' | 'newEpisodeNotified' | 'watchedEpisodes'>) => void;
  untrackSeries: (seriesId: string) => void;
  updateStatus: (seriesId: string, status: SeriesStatus) => void;
  setUserRating: (seriesId: string, rating: number | null) => void;
  setNotes: (seriesId: string, notes: string) => void;

  // ─── Bolum Takibi ────────────────────────────
  markEpisodeWatched: (seriesId: string, season: number, episode: number, durationSeconds: number) => void;
  updateEpisodeProgress: (seriesId: string, season: number, episode: number, progressSeconds: number, durationSeconds: number) => void;
  markEpisodeUnwatched: (seriesId: string, season: number, episode: number) => void;
  markSeasonWatched: (seriesId: string, season: number, episodeCount: number, avgDuration: number) => void;

  // ─── Sorgular ────────────────────────────────
  isTracked: (seriesId: string) => boolean;
  getByStatus: (status: SeriesStatus) => TrackedSeries[];
  getContinueWatching: () => TrackedSeries[];
  getWithNewEpisodes: () => TrackedSeries[];
  getStats: () => TrackingStats;
  getTrackedSeries: (seriesId: string) => TrackedSeries | undefined;
  isEpisodeWatched: (seriesId: string, season: number, episode: number) => boolean;
  getEpisodeProgress: (seriesId: string, season: number, episode: number) => EpisodeWatchInfo | null;
  getNextEpisode: (seriesId: string) => { season: number; episode: number } | null;

  // ─── Yeni Bolum Kontrolu ─────────────────────
  checkNewEpisodes: (seriesId: string, currentEpisodeCount: number) => void;
  clearNewEpisodeFlag: (seriesId: string) => void;
}

export const useSeriesTrackingStore = create<SeriesTrackingState>()(
  persist(
    (set, get) => ({
      trackedSeries: [],
      isLoading: false,

      trackSeries: (series) => {
        const exists = get().trackedSeries.find((s) => s.seriesId === series.seriesId);
        if (exists) return;

        const now = Date.now();
        const newTracked: TrackedSeries = {
          ...series,
          addedAt: now,
          lastWatchedAt: now,
          totalWatchedEpisodes: 0,
          totalWatchTimeMinutes: 0,
          hasNewEpisode: false,
          lastKnownEpisodeCount: 0,
          newEpisodeNotified: false,
          watchedEpisodes: {},
        };

        set((state) => ({
          trackedSeries: [newTracked, ...state.trackedSeries],
        }));
      },

      untrackSeries: (seriesId) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.filter((s) => s.seriesId !== seriesId),
        }));
      },

      updateStatus: (seriesId, status) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) =>
            s.seriesId === seriesId ? { ...s, status } : s,
          ),
        }));
      },

      setUserRating: (seriesId, rating) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) =>
            s.seriesId === seriesId ? { ...s, userRating: rating } : s,
          ),
        }));
      },

      setNotes: (seriesId, notes) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) =>
            s.seriesId === seriesId ? { ...s, notes } : s,
          ),
        }));
      },

      markEpisodeWatched: (seriesId, season, episode, durationSeconds) => {
        const key = formatEpisodeKey(season, episode);
        const now = Date.now();

        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) => {
            if (s.seriesId !== seriesId) return s;

            const watchedEpisodes = {
              ...s.watchedEpisodes,
              [key]: {
                watched: true,
                progressSeconds: durationSeconds,
                durationSeconds,
                progressPercent: 100,
                watchedAt: now,
              },
            };

            const newCurrentSeason = season;
            const newCurrentEpisode = episode;

            return {
              ...s,
              watchedEpisodes,
              currentSeason: Math.max(s.currentSeason, newCurrentSeason),
              currentEpisode: newCurrentEpisode,
              lastWatchedAt: now,
              totalWatchedEpisodes: Object.values(watchedEpisodes).filter((e) => e.watched).length,
              totalWatchTimeMinutes: s.totalWatchTimeMinutes + Math.round(durationSeconds / 60),
              status: checkIfCompleted(watchedEpisodes, s.totalSeasons, s.totalEpisodesInSeason)
                ? 'completed'
                : s.status,
            };
          }),
        }));
      },

      updateEpisodeProgress: (seriesId, season, episode, progressSeconds, durationSeconds) => {
        const key = formatEpisodeKey(season, episode);
        const progressPercent = durationSeconds > 0
          ? Math.round((progressSeconds / durationSeconds) * 100)
          : 0;
        const now = Date.now();

        const watched = progressPercent >= 90;

        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) => {
            if (s.seriesId !== seriesId) return s;

            const existing = s.watchedEpisodes[key];
            if (existing && existing.progressSeconds > progressSeconds && !watched) return s;

            const watchedEpisodes = {
              ...s.watchedEpisodes,
              [key]: {
                watched,
                progressSeconds,
                durationSeconds,
                progressPercent,
                watchedAt: now,
              },
            };

            return {
              ...s,
              watchedEpisodes,
              currentSeason: season,
              currentEpisode: episode,
              lastWatchedAt: now,
              totalWatchedEpisodes: Object.values(watchedEpisodes).filter((e) => e.watched).length,
              status: s.status === 'plan_to_watch' ? 'watching' : s.status,
            };
          }),
        }));
      },

      markEpisodeUnwatched: (seriesId, season, episode) => {
        const key = formatEpisodeKey(season, episode);

        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) => {
            if (s.seriesId !== seriesId) return s;

            const { [key]: removed, ...rest } = s.watchedEpisodes;
            return {
              ...s,
              watchedEpisodes: rest,
              totalWatchedEpisodes: Object.values(rest).filter((e) => e.watched).length,
              status: s.status === 'completed' ? 'watching' : s.status,
            };
          }),
        }));
      },

      markSeasonWatched: (seriesId, season, episodeCount, avgDuration) => {
        const now = Date.now();

        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) => {
            if (s.seriesId !== seriesId) return s;

            const newEpisodes = { ...s.watchedEpisodes };
            for (let ep = 1; ep <= episodeCount; ep++) {
              const key = formatEpisodeKey(season, ep);
              if (!newEpisodes[key]?.watched) {
                newEpisodes[key] = {
                  watched: true,
                  progressSeconds: avgDuration,
                  durationSeconds: avgDuration,
                  progressPercent: 100,
                  watchedAt: now,
                };
              }
            }

            return {
              ...s,
              watchedEpisodes: newEpisodes,
              currentSeason: season,
              currentEpisode: episodeCount,
              lastWatchedAt: now,
              totalWatchedEpisodes: Object.values(newEpisodes).filter((e) => e.watched).length,
              totalWatchTimeMinutes: s.totalWatchTimeMinutes + Math.round((avgDuration * episodeCount) / 60),
            };
          }),
        }));
      },

      isTracked: (seriesId) => {
        return get().trackedSeries.some((s) => s.seriesId === seriesId);
      },

      getByStatus: (status) => {
        return get().trackedSeries.filter((s) => s.status === status);
      },

      getContinueWatching: () => {
        return get().trackedSeries
          .filter((s) => s.status === 'watching')
          .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
      },

      getWithNewEpisodes: () => {
        return get().trackedSeries.filter((s) => s.hasNewEpisode);
      },

      getTrackedSeries: (seriesId) => {
        return get().trackedSeries.find((s) => s.seriesId === seriesId);
      },

      isEpisodeWatched: (seriesId, season, episode) => {
        const series = get().trackedSeries.find((s) => s.seriesId === seriesId);
        if (!series) return false;
        const key = formatEpisodeKey(season, episode);
        return series.watchedEpisodes[key]?.watched ?? false;
      },

      getEpisodeProgress: (seriesId, season, episode) => {
        const series = get().trackedSeries.find((s) => s.seriesId === seriesId);
        if (!series) return null;
        const key = formatEpisodeKey(season, episode);
        return series.watchedEpisodes[key] ?? null;
      },

      getNextEpisode: (seriesId) => {
        const series = get().trackedSeries.find((s) => s.seriesId === seriesId);
        if (!series) return null;

        const nextEp = series.currentEpisode + 1;

        if (nextEp > series.totalEpisodesInSeason) {
          const nextSeason = series.currentSeason + 1;
          if (nextSeason <= series.totalSeasons) {
            return { season: nextSeason, episode: 1 };
          }
          return null;
        }

        return { season: series.currentSeason, episode: nextEp };
      },

      getStats: () => {
        const tracked = get().trackedSeries;

        const genreCounts: Record<string, number> = {};
        let totalEpisodes = 0;
        let totalMinutes = 0;
        let episodesThisMonth = 0;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthStartMs = monthStart.getTime();

        for (const s of tracked) {
          totalEpisodes += s.totalWatchedEpisodes;
          totalMinutes += s.totalWatchTimeMinutes;

          if (s.genre) {
            genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
          }

          for (const ep of Object.values(s.watchedEpisodes)) {
            if (ep.watched && ep.watchedAt >= monthStartMs) {
              episodesThisMonth++;
            }
          }
        }

        const topGenreEntry = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];

        return {
          totalTracked: tracked.length,
          watching: tracked.filter((s) => s.status === 'watching').length,
          completed: tracked.filter((s) => s.status === 'completed').length,
          onHold: tracked.filter((s) => s.status === 'on_hold').length,
          dropped: tracked.filter((s) => s.status === 'dropped').length,
          planToWatch: tracked.filter((s) => s.status === 'plan_to_watch').length,
          totalEpisodesWatched: totalEpisodes,
          totalWatchTimeHours: Math.round(totalMinutes / 60 * 10) / 10,
          episodesThisMonth,
          topGenre: topGenreEntry ? topGenreEntry[0] : null,
        };
      },

      checkNewEpisodes: (seriesId, currentEpisodeCount) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) => {
            if (s.seriesId !== seriesId) return s;

            const hasNew = currentEpisodeCount > s.lastKnownEpisodeCount && s.lastKnownEpisodeCount > 0;
            return {
              ...s,
              hasNewEpisode: hasNew,
              lastKnownEpisodeCount: currentEpisodeCount,
              newEpisodeNotified: hasNew ? false : s.newEpisodeNotified,
            };
          }),
        }));
      },

      clearNewEpisodeFlag: (seriesId) => {
        set((state) => ({
          trackedSeries: state.trackedSeries.map((s) =>
            s.seriesId === seriesId
              ? { ...s, hasNewEpisode: false, newEpisodeNotified: true }
              : s,
          ),
        }));
      },
    }),
    {
      name: STORE_NAMES.SERIES_TRACKING,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        trackedSeries: state.trackedSeries,
      }),
    },
  ),
);

// ─── Helpers ────────────────────────────────────────────

function formatEpisodeKey(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}

function checkIfCompleted(
  watchedEpisodes: WatchedEpisodeMap,
  totalSeasons: number,
  totalEpisodesInLastSeason: number,
): boolean {
  if (totalSeasons <= 0 || totalEpisodesInLastSeason <= 0) return false;
  const lastKey = formatEpisodeKey(totalSeasons, totalEpisodesInLastSeason);
  return watchedEpisodes[lastKey]?.watched ?? false;
}
