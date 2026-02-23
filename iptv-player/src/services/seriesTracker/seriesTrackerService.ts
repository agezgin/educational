/**
 * Series Tracker Service
 *
 * Dizi takip sistemi arka plan servisleri:
 * - Yeni bolum kontrolu (periyodik)
 * - Hatirlatici zamanlayici
 * - Izleme istatistik hesaplamalari
 * - Dizi takvimi olusturma
 * - Export/Import (yedekleme)
 * - Streak (art arda izleme serisi) takibi
 */

import { TrackedSeries, SeriesStatus, EpisodeWatchInfo, WatchedEpisodeMap } from '@/store/seriesTrackingStore';

// ─── Yeni Bolum Kontrolu ────────────────────────────────

export interface NewEpisodeCheckResult {
  seriesId: string;
  seriesName: string;
  hasNew: boolean;
  newEpisodeCount: number;
  latestSeason: number;
  latestEpisode: number;
}

/**
 * Tum takip edilen diziler icin yeni bolum kontrolu yapar.
 * Xtream API veya TMDB'den guncel bolum bilgisini ceker.
 *
 * @param trackedSeries - Takip edilen diziler
 * @param fetchEpisodeCount - Dizinin guncel bolum sayisini donduren fonksiyon
 */
export async function checkAllNewEpisodes(
  trackedSeries: TrackedSeries[],
  fetchEpisodeCount: (seriesId: string) => Promise<{ total: number; latestSeason: number; latestEpisode: number }>,
): Promise<NewEpisodeCheckResult[]> {
  const results: NewEpisodeCheckResult[] = [];

  // Sadece aktif dizileri kontrol et (watching + on_hold)
  const activeSeries = trackedSeries.filter(
    (s) => s.status === 'watching' || s.status === 'on_hold',
  );

  // Paralel kontrol (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < activeSeries.length; i += batchSize) {
    const batch = activeSeries.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (series) => {
        try {
          const current = await fetchEpisodeCount(series.seriesId);
          const hasNew = current.total > series.lastKnownEpisodeCount && series.lastKnownEpisodeCount > 0;

          return {
            seriesId: series.seriesId,
            seriesName: series.name,
            hasNew,
            newEpisodeCount: hasNew ? current.total - series.lastKnownEpisodeCount : 0,
            latestSeason: current.latestSeason,
            latestEpisode: current.latestEpisode,
          };
        } catch {
          return {
            seriesId: series.seriesId,
            seriesName: series.name,
            hasNew: false,
            newEpisodeCount: 0,
            latestSeason: 0,
            latestEpisode: 0,
          };
        }
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}

// ─── Takvim ─────────────────────────────────────────────

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  series: Array<{
    seriesId: string;
    seriesName: string;
    posterUrl?: string;
    nextSeason: number;
    nextEpisode: number;
  }>;
}

/**
 * Haftalik izleme takvimi olusturur.
 * Aktif dizilerin tahmini yayin gunlerini gosterir.
 */
export function buildWeeklyCalendar(
  trackedSeries: TrackedSeries[],
): CalendarDay[] {
  const today = new Date();
  const calendar: CalendarDay[] = [];

  // 7 gunluk takvim
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    calendar.push({
      date: formatDateKey(date),
      dayOfWeek: date.getDay(),
      series: [],
    });
  }

  // Aktif dizileri gunlere dagit
  // Basit heuristic: son izlenme gunune gore tahmini yayin gunu
  const watching = trackedSeries.filter((s) => s.status === 'watching');

  for (const series of watching) {
    if (series.lastWatchedAt) {
      const lastDay = new Date(series.lastWatchedAt).getDay();
      // Ayni gune yerlestir (haftalik yayin tahmini)
      const dayEntry = calendar.find((d) => d.dayOfWeek === lastDay);
      if (dayEntry) {
        dayEntry.series.push({
          seriesId: series.seriesId,
          seriesName: series.name,
          posterUrl: series.posterUrl,
          nextSeason: series.currentSeason,
          nextEpisode: series.currentEpisode + 1,
        });
      }
    }
  }

  return calendar;
}

// ─── Izleme Streak ──────────────────────────────────────

export interface WatchStreak {
  /** Mevcut art arda izleme serisi (gun) */
  currentStreak: number;
  /** En uzun seri */
  longestStreak: number;
  /** Bu hafta izlenen gun sayisi */
  daysThisWeek: number;
  /** Son 30 gundeki aktif gunler */
  activeDaysLast30: number;
}

/**
 * Izleme streak'ini hesaplar.
 * Her gun en az 1 bolum izlemek = 1 gun streak.
 */
export function calculateWatchStreak(
  trackedSeries: TrackedSeries[],
): WatchStreak {
  // Tum izleme tarihlerini topla
  const watchDates = new Set<string>();

  for (const series of trackedSeries) {
    for (const ep of Object.values(series.watchedEpisodes)) {
      if (ep.watched && ep.watchedAt) {
        watchDates.add(formatDateKey(new Date(ep.watchedAt)));
      }
    }
  }

  const sortedDates = [...watchDates].sort().reverse(); // En yeniden eskiye
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));

  // Mevcut streak
  let currentStreak = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    let checkDate = new Date();
    if (sortedDates[0] === yesterday) checkDate = new Date(Date.now() - 86400000);

    for (let i = 0; i < 365; i++) {
      const dateKey = formatDateKey(checkDate);
      if (watchDates.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // En uzun streak
  let longestStreak = 0;
  let tempStreak = 0;
  const allDates = [...watchDates].sort();

  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(allDates[i - 1]);
      const currDate = new Date(allDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Bu hafta
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const daysThisWeek = sortedDates.filter((d) => new Date(d) >= weekStart).length;

  // Son 30 gun
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const activeDaysLast30 = sortedDates.filter((d) => new Date(d) >= thirtyDaysAgo).length;

  return {
    currentStreak,
    longestStreak,
    daysThisWeek,
    activeDaysLast30,
  };
}

// ─── Export / Import ────────────────────────────────────

export interface TrackingExportData {
  version: 1;
  exportDate: string;
  trackedSeries: TrackedSeries[];
}

/**
 * Takip verilerini export eder (JSON).
 * Yedekleme ve cihaz transferi icin.
 */
export function exportTrackingData(
  trackedSeries: TrackedSeries[],
): string {
  const data: TrackingExportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    trackedSeries,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Takip verilerini import eder.
 * Mevcut verilerle birlestirir (merge).
 */
export function importTrackingData(
  jsonString: string,
  existingSeries: TrackedSeries[],
): TrackedSeries[] {
  try {
    const data: TrackingExportData = JSON.parse(jsonString);

    if (data.version !== 1) {
      throw new Error('Desteklenmeyen veri versiyonu');
    }

    // Merge: Mevcut veriler oncelikli, yeni olanlar eklenir
    const existingIds = new Set(existingSeries.map((s) => s.seriesId));
    const newSeries = data.trackedSeries.filter((s) => !existingIds.has(s.seriesId));

    return [...existingSeries, ...newSeries];
  } catch (error) {
    throw new Error('Veri okuma hatası: Geçersiz format');
  }
}

// ─── Durum Etiketleri ───────────────────────────────────

export function getStatusLabel(status: SeriesStatus): string {
  const labels: Record<SeriesStatus, string> = {
    watching: 'İzleniyor',
    completed: 'Tamamlandı',
    on_hold: 'Beklemede',
    dropped: 'Bırakıldı',
    plan_to_watch: 'İzlenecek',
  };
  return labels[status];
}

export function getStatusColor(status: SeriesStatus): string {
  const statusColors: Record<SeriesStatus, string> = {
    watching: '#3B82F6',
    completed: '#10B981',
    on_hold: '#F59E0B',
    dropped: '#F85149',
    plan_to_watch: '#8B949E',
  };
  return statusColors[status];
}

export function getStatusIcon(status: SeriesStatus): string {
  const icons: Record<SeriesStatus, string> = {
    watching: '▶',
    completed: '✓',
    on_hold: '⏸',
    dropped: '✕',
    plan_to_watch: '📋',
  };
  return icons[status];
}

// ─── Ilerleme Hesaplama ─────────────────────────────────

/**
 * Dizinin toplam ilerleme yuzdesini hesaplar.
 * Izlenen bolumler / toplam bolumler * 100
 */
export function calculateSeriesProgress(series: TrackedSeries): number {
  const totalEpisodes = series.totalSeasons * series.totalEpisodesInSeason;
  if (totalEpisodes <= 0) return 0;
  return Math.round((series.totalWatchedEpisodes / totalEpisodes) * 100);
}

/**
 * Sezondaki ilerleme.
 */
export function calculateSeasonProgress(
  watchedEpisodes: WatchedEpisodeMap,
  season: number,
  totalEpisodes: number,
): { watched: number; total: number; percent: number } {
  let watched = 0;
  for (let ep = 1; ep <= totalEpisodes; ep++) {
    const key = `S${String(season).padStart(2, '0')}E${String(ep).padStart(2, '0')}`;
    if (watchedEpisodes[key]?.watched) {
      watched++;
    }
  }
  return {
    watched,
    total: totalEpisodes,
    percent: totalEpisodes > 0 ? Math.round((watched / totalEpisodes) * 100) : 0,
  };
}

// ─── Helpers ────────────────────────────────────────────

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
