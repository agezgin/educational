/**
 * Watchlist & Interaction Store
 *
 * "Daha Sonra Izle" listesi, begeni sistemi, izleme durumu:
 *
 * - Daha Sonra Izle: Film/dizi eklerken zaman damgasi ile kayit
 * - Begeni: Icerik begenme (benzer oneri icin kullanilir)
 * - Izleme Durumu: izlenmedi / izleniyor / tamamlandi / yarida kaldi
 * - Progress: Film/bolum progress (saniye) ve yuzdesi
 * - Benzer icerik onerisi: Begenilenlerin tur/yonetmen/oyuncu analizi
 *
 * Persist: Tum kullanici verileri cihazda kalici saklanir.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORE_NAMES } from './persistStorage';

// ─── Types ──────────────────────────────────────────────

export type WatchStatus = 'unwatched' | 'watching' | 'completed' | 'abandoned';

export interface WatchlistItem {
  contentId: string;
  contentType: 'movie' | 'series';
  name: string;
  posterUrl?: string;
  /** Listeye eklenme zamani */
  addedAt: number;
  /** Hatirlatma notu (opsiyonel) */
  note?: string;
}

export interface LikedItem {
  contentId: string;
  contentType: 'movie' | 'series';
  name: string;
  genre?: string;
  /** Begeni zamani */
  likedAt: number;
}

export interface WatchProgress {
  contentId: string;
  contentType: 'movie' | 'episode';
  /** Izlenen sure (saniye) */
  currentTime: number;
  /** Toplam sure (saniye) */
  totalDuration: number;
  /** Izleme durumu */
  status: WatchStatus;
  /** Son izleme zamani */
  lastWatchedAt: number;
  /** Dizi bilgisi (episode icin) */
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
}

export interface TasteProfile {
  /** En cok begenilen turler (frekans sirali) */
  topGenres: Array<{ genre: string; count: number }>;
  /** Begenme sayisi */
  totalLikes: number;
  /** Toplam izleme saati */
  totalWatchHours: number;
}

// ─── Store ──────────────────────────────────────────────

interface WatchlistState {
  // ── Daha Sonra Izle ──
  watchlist: WatchlistItem[];
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (contentId: string) => void;
  isInWatchlist: (contentId: string) => boolean;

  // ── Begeni ──
  likedItems: LikedItem[];
  toggleLike: (item: Omit<LikedItem, 'likedAt'>) => void;
  isLiked: (contentId: string) => boolean;

  // ── Izleme Durumu ──
  progressMap: Record<string, WatchProgress>;
  updateProgress: (progress: Omit<WatchProgress, 'lastWatchedAt'>) => void;
  getProgress: (contentId: string) => WatchProgress | undefined;
  markCompleted: (contentId: string) => void;
  markAbandoned: (contentId: string) => void;

  // ── Queries ──
  /** Kaldigi yerden devam edilecekler (watching + yarida kalmis) */
  getContinueWatching: () => WatchProgress[];
  /** Son izlenenler */
  getRecentlyWatched: (limit?: number) => WatchProgress[];
  /** Tamamlananlar */
  getCompleted: () => WatchProgress[];
  /** Zevk profili (tur analizi) */
  getTasteProfile: () => TasteProfile;
  /** Belirli bir ture benzer begeniler */
  getLikedByGenre: (genre: string) => LikedItem[];
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      likedItems: [],
      progressMap: {},

      // ── Daha Sonra Izle ──

      addToWatchlist: (item) => {
        const existing = get().watchlist.find(w => w.contentId === item.contentId);
        if (existing) return;

        set(state => ({
          watchlist: [{ ...item, addedAt: Date.now() }, ...state.watchlist],
        }));
      },

      removeFromWatchlist: (contentId) => {
        set(state => ({
          watchlist: state.watchlist.filter(w => w.contentId !== contentId),
        }));
      },

      isInWatchlist: (contentId) => {
        return get().watchlist.some(w => w.contentId === contentId);
      },

      // ── Begeni ──

      toggleLike: (item) => {
        const { likedItems } = get();
        const existing = likedItems.find(l => l.contentId === item.contentId);

        if (existing) {
          set({ likedItems: likedItems.filter(l => l.contentId !== item.contentId) });
        } else {
          set({ likedItems: [{ ...item, likedAt: Date.now() }, ...likedItems] });
        }
      },

      isLiked: (contentId) => {
        return get().likedItems.some(l => l.contentId === contentId);
      },

      // ── Izleme Durumu ──

      updateProgress: (progress) => {
        const lastWatchedAt = Date.now();
        const percentWatched = progress.totalDuration > 0
          ? progress.currentTime / progress.totalDuration
          : 0;

        // Otomatik durum tespiti - kullanicinin manuel ayarladigi durumu (abandoned vb.) ezme
        let status = progress.status;
        const existingProgress = get().progressMap[progress.contentId];
        const isUserSetStatus = existingProgress &&
          (existingProgress.status === 'abandoned' || existingProgress.status === 'completed');

        if (!isUserSetStatus) {
          if (percentWatched >= 0.92) {
            status = 'completed';
          } else if (percentWatched > 0.02) {
            status = 'watching';
          }
        }

        set(state => ({
          progressMap: {
            ...state.progressMap,
            [progress.contentId]: { ...progress, status, lastWatchedAt },
          },
        }));
      },

      getProgress: (contentId) => {
        return get().progressMap[contentId];
      },

      markCompleted: (contentId) => {
        const existing = get().progressMap[contentId];
        if (existing) {
          set(state => ({
            progressMap: {
              ...state.progressMap,
              [contentId]: { ...existing, status: 'completed', lastWatchedAt: Date.now() },
            },
          }));
        }
      },

      markAbandoned: (contentId) => {
        const existing = get().progressMap[contentId];
        if (existing) {
          set(state => ({
            progressMap: {
              ...state.progressMap,
              [contentId]: { ...existing, status: 'abandoned', lastWatchedAt: Date.now() },
            },
          }));
        }
      },

      // ── Queries ──

      getContinueWatching: () => {
        const { progressMap } = get();
        return Object.values(progressMap)
          .filter(p => p.status === 'watching' && p.currentTime > 0)
          .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
      },

      getRecentlyWatched: (limit = 20) => {
        const { progressMap } = get();
        return Object.values(progressMap)
          .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)
          .slice(0, limit);
      },

      getCompleted: () => {
        const { progressMap } = get();
        return Object.values(progressMap)
          .filter(p => p.status === 'completed')
          .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
      },

      getTasteProfile: () => {
        const { likedItems, progressMap } = get();

        // Tur frekans analizi
        const genreCount: Record<string, number> = {};
        for (const item of likedItems) {
          if (item.genre) {
            const genres = item.genre.split(/[,&/]/).map(g => g.trim());
            for (const genre of genres) {
              if (genre) genreCount[genre] = (genreCount[genre] || 0) + 1;
            }
          }
        }

        const topGenres = Object.entries(genreCount)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Toplam izleme saati
        const totalWatchSeconds = Object.values(progressMap)
          .reduce((sum, p) => sum + p.currentTime, 0);

        return {
          topGenres,
          totalLikes: likedItems.length,
          totalWatchHours: Math.round(totalWatchSeconds / 3600),
        };
      },

      getLikedByGenre: (genre) => {
        return get().likedItems.filter(item =>
          item.genre?.toLowerCase().includes(genre.toLowerCase()),
        );
      },
    }),
    {
      name: STORE_NAMES.WATCHLIST,
      storage: createJSONStorage(() => zustandStorage),
      // Tum kullanici verilerini persist et
      partialize: (state) => ({
        watchlist: state.watchlist,
        likedItems: state.likedItems,
        progressMap: state.progressMap,
      }),
    },
  ),
);

// ─── Helper: Progress gosterim formati ──────────────────

/**
 * Izleme durumu icin kullaniciya gosterilecek etiket.
 */
export function getWatchStatusLabel(progress: WatchProgress): string {
  switch (progress.status) {
    case 'completed':
      return 'Izlendi';
    case 'watching': {
      if (progress.totalDuration <= 0) return '';
      const remaining = progress.totalDuration - progress.currentTime;
      const mins = Math.round(remaining / 60);
      if (mins > 60) {
        return `${Math.floor(mins / 60)}s ${mins % 60}dk kaldi`;
      }
      return `${mins} dk kaldi`;
    }
    case 'abandoned':
      return 'Yarida birakildi';
    default:
      return '';
  }
}

/**
 * Izleme yuzdesi.
 */
export function getWatchPercent(progress: WatchProgress): number {
  if (progress.totalDuration <= 0) return 0;
  return Math.round((progress.currentTime / progress.totalDuration) * 100);
}

/**
 * Ne zaman izlendigi (goreli zaman).
 */
export function getTimeAgoLabel(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az once';
  if (minutes < 60) return `${minutes} dk once`;
  if (hours < 24) return `${hours} saat once`;
  if (days < 7) return `${days} gun once`;
  if (days < 30) return `${Math.floor(days / 7)} hafta once`;
  return `${Math.floor(days / 30)} ay once`;
}
