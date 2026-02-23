/**
 * Smart Recommendation Engine
 *
 * Akilli icerik onerisi:
 * - Izleme gecmisine dayali oneriler
 * - Tur bazli benzerlik skoru
 * - Populerlik + Kalite faktorleri
 * - "Devam Et" (Continue Watching) listesi
 * - Saat bazli oneri (sabah haberler, aksam filmler)
 * - Trending/Populer icerikler
 *
 * Offline calisir, cloud gerektirmez.
 * Tum veriler lokal cihazda tutulur.
 */

// ─── Types ──────────────────────────────────────────────

export interface WatchHistory {
  /** Icerik ID */
  contentId: string;
  /** Icerik tipi */
  contentType: 'live' | 'movie' | 'series';
  /** Icerik adi */
  title: string;
  /** Poster URL */
  posterUrl?: string;
  /** Stream URL */
  streamUrl: string;
  /** Turler */
  genres: string[];
  /** Son izlenme zamani (ms) */
  lastWatched: number;
  /** Toplam izlenme suresi (saniye) */
  totalWatchTime: number;
  /** Icerik suresi (saniye) - VOD icin */
  duration?: number;
  /** Ilerleme yuzdesi (0-100) */
  progress: number;
  /** Kac kez izlendi */
  watchCount: number;
  /** IMDB/TMDB rating */
  rating?: number;
  /** Sezon/Bolum bilgisi - dizi icin */
  seasonNumber?: number;
  /** Bolum numarasi */
  episodeNumber?: number;
}

export interface RecommendationItem {
  contentId: string;
  contentType: 'live' | 'movie' | 'series';
  title: string;
  posterUrl?: string;
  streamUrl: string;
  /** Oneri skoru (0-100) */
  score: number;
  /** Neden onerildi */
  reason: RecommendationReason;
}

export type RecommendationReason =
  | 'continue_watching'  // Yarim kalan icerik
  | 'similar_genre'      // Benzer turde
  | 'popular'            // Populer/trending
  | 'time_based'         // Saate gore
  | 'frequently_watched' // Sik izlenen
  | 'new_episode'        // Yeni bolum
  | 'because_you_watched'; // "X izlediniz, bunu da begenebilirsiniz"

// ─── Continue Watching ──────────────────────────────────

/**
 * "Devam Et" listesini olusturur.
 * Yarim kalmis filmleri ve dizileri dondurur.
 */
export function getContinueWatching(
  history: WatchHistory[],
  maxItems: number = 10,
): WatchHistory[] {
  return history
    .filter((item) => {
      // VOD: %5-%95 arasi izlenmis (baslangic ve bitis haric)
      if (item.contentType !== 'live') {
        return item.progress > 5 && item.progress < 95;
      }
      return false;
    })
    .sort((a, b) => b.lastWatched - a.lastWatched) // En son izleneni uste
    .slice(0, maxItems);
}

// ─── Genre-based Recommendations ────────────────────────

/**
 * Izleme gecmisinden tur tercihlerini cikarir.
 * Her turun puanini hesaplar.
 */
export function analyzeGenrePreferences(
  history: WatchHistory[],
): Map<string, number> {
  const genreScores = new Map<string, number>();

  for (const item of history) {
    // Skor: izlenme suresi * tekrar * recency
    const recencyFactor = getRecencyFactor(item.lastWatched);
    const baseScore = item.totalWatchTime * item.watchCount * recencyFactor;

    for (const genre of item.genres) {
      const current = genreScores.get(genre) || 0;
      genreScores.set(genre, current + baseScore);
    }
  }

  // Normalize (0-100)
  const maxScore = Math.max(...genreScores.values(), 1);
  for (const [genre, score] of genreScores) {
    genreScores.set(genre, Math.round((score / maxScore) * 100));
  }

  return genreScores;
}

/**
 * Gecmise gore benzer icerikleri skor ile dondurur.
 */
export function getGenreBasedRecommendations(
  history: WatchHistory[],
  allContent: Array<{ id: string; title: string; genres: string[]; posterUrl?: string; streamUrl: string; type: 'movie' | 'series'; rating?: number }>,
  maxItems: number = 15,
): RecommendationItem[] {
  const genrePrefs = analyzeGenrePreferences(history);
  const watchedIds = new Set(history.map((h) => h.contentId));

  const scored = allContent
    .filter((c) => !watchedIds.has(c.id)) // Izlenmemis olanlar
    .map((content) => {
      // Tur benzerlik skoru
      let genreScore = 0;
      for (const genre of content.genres) {
        genreScore += genrePrefs.get(genre) || 0;
      }
      genreScore = content.genres.length > 0
        ? genreScore / content.genres.length
        : 0;

      // Rating bonus
      const ratingBonus = (content.rating || 5) * 2; // 0-20 arasi

      const totalScore = Math.min(genreScore + ratingBonus, 100);

      return {
        contentId: content.id,
        contentType: content.type,
        title: content.title,
        posterUrl: content.posterUrl,
        streamUrl: content.streamUrl,
        score: totalScore,
        reason: 'similar_genre' as RecommendationReason,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);

  return scored;
}

// ─── Time-based Recommendations ─────────────────────────

/**
 * Saate gore icerik onerir.
 * Sabah: Haberler, Cocuk
 * Oglen: Belgesel, Spor
 * Aksam: Film, Dizi
 * Gece: Film, Yetiskin
 */
export function getTimeBasedCategories(hour?: number): string[] {
  const h = hour ?? new Date().getHours();

  if (h >= 6 && h < 10) {
    return ['Haber', 'Cocuk', 'Muzik', 'Sabah Programlari'];
  }
  if (h >= 10 && h < 14) {
    return ['Belgesel', 'Spor', 'Yasam', 'Yemek'];
  }
  if (h >= 14 && h < 18) {
    return ['Dizi', 'Sinema', 'Eglence', 'Spor'];
  }
  if (h >= 18 && h < 22) {
    return ['Film', 'Dizi', 'Spor Canli', 'Eglence'];
  }
  // 22:00 - 06:00
  return ['Film', 'Dizi', 'Belgesel', 'Gece Programlari'];
}

/**
 * Kullanicinin bu saatte genellikle ne izledigini analiz eder.
 */
export function analyzeTimePatterns(
  history: WatchHistory[],
): Map<number, string[]> {
  const hourPatterns = new Map<number, Map<string, number>>();

  for (const item of history) {
    const hour = new Date(item.lastWatched).getHours();
    const timeSlot = Math.floor(hour / 3) * 3; // 3 saatlik dilimler

    if (!hourPatterns.has(timeSlot)) {
      hourPatterns.set(timeSlot, new Map());
    }

    const slotGenres = hourPatterns.get(timeSlot)!;
    for (const genre of item.genres) {
      slotGenres.set(genre, (slotGenres.get(genre) || 0) + item.watchCount);
    }
  }

  // En populer turleri cikar
  const result = new Map<number, string[]>();
  for (const [slot, genres] of hourPatterns) {
    const sorted = [...genres.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([genre]) => genre);
    result.set(slot, sorted);
  }

  return result;
}

// ─── Frequently Watched ─────────────────────────────────

/**
 * En sik izlenen kanallari dondurur.
 * Canli TV icin "Favori Kanallarim" listesi.
 */
export function getFrequentlyWatched(
  history: WatchHistory[],
  maxItems: number = 10,
): WatchHistory[] {
  return history
    .filter((item) => item.contentType === 'live')
    .sort((a, b) => {
      // Skor: izlenme suresi * izlenme sayisi * recency
      const scoreA = a.totalWatchTime * a.watchCount * getRecencyFactor(a.lastWatched);
      const scoreB = b.totalWatchTime * b.watchCount * getRecencyFactor(b.lastWatched);
      return scoreB - scoreA;
    })
    .slice(0, maxItems);
}

// ─── Home Screen Carousel Builder ───────────────────────

export interface CarouselSection {
  id: string;
  title: string;
  type: 'continue_watching' | 'recommendations' | 'trending' | 'favorites' | 'time_based' | 'genre';
  items: RecommendationItem[] | WatchHistory[];
}

/**
 * Ana ekran icin carousel bolumlerini olusturur.
 * Netflix tarzinda yatay kaydirmali bolumler.
 */
export function buildHomeCarousels(
  history: WatchHistory[],
  allContent: Array<{ id: string; title: string; genres: string[]; posterUrl?: string; streamUrl: string; type: 'movie' | 'series'; rating?: number }>,
): CarouselSection[] {
  const sections: CarouselSection[] = [];

  // 1. Devam Et (en uste)
  const continueItems = getContinueWatching(history);
  if (continueItems.length > 0) {
    sections.push({
      id: 'continue_watching',
      title: 'Kaldığın Yerden Devam Et',
      type: 'continue_watching',
      items: continueItems,
    });
  }

  // 2. Sik Izlenen Kanallar
  const frequent = getFrequentlyWatched(history);
  if (frequent.length > 0) {
    sections.push({
      id: 'frequent',
      title: 'En Çok İzlediğin Kanallar',
      type: 'favorites',
      items: frequent,
    });
  }

  // 3. Sana Ozel Oneriler
  const recommended = getGenreBasedRecommendations(history, allContent);
  if (recommended.length > 0) {
    sections.push({
      id: 'recommended',
      title: 'Senin İçin Öneriler',
      type: 'recommendations',
      items: recommended,
    });
  }

  // 4. Saate Gore Oneriler
  const timeCategories = getTimeBasedCategories();
  sections.push({
    id: 'time_based',
    title: `Şu An İzlenebilecek`,
    type: 'time_based',
    items: allContent
      .filter((c) => c.genres.some((g) => timeCategories.includes(g)))
      .slice(0, 15)
      .map((c) => ({
        contentId: c.id,
        contentType: c.type,
        title: c.title,
        posterUrl: c.posterUrl,
        streamUrl: c.streamUrl,
        score: 50,
        reason: 'time_based' as RecommendationReason,
      })),
  });

  // 5. Tur bazli bolumler
  const genrePrefs = analyzeGenrePreferences(history);
  const topGenres = [...genrePrefs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [genre, _score] of topGenres) {
    const genreItems = allContent
      .filter((c) => c.genres.includes(genre))
      .slice(0, 15)
      .map((c) => ({
        contentId: c.id,
        contentType: c.type,
        title: c.title,
        posterUrl: c.posterUrl,
        streamUrl: c.streamUrl,
        score: 50,
        reason: 'similar_genre' as RecommendationReason,
      }));

    if (genreItems.length > 0) {
      sections.push({
        id: `genre_${genre}`,
        title: genre,
        type: 'genre',
        items: genreItems,
      });
    }
  }

  return sections;
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Recency factor: son izleme ne kadar yakinda?
 * Son 24 saat: 1.0
 * Son hafta: 0.7
 * Son ay: 0.4
 * Daha eski: 0.2
 */
function getRecencyFactor(timestamp: number): number {
  const now = Date.now();
  const diffHours = (now - timestamp) / (1000 * 60 * 60);

  if (diffHours < 24) return 1.0;
  if (diffHours < 168) return 0.7;  // 7 gun
  if (diffHours < 720) return 0.4;  // 30 gun
  return 0.2;
}
