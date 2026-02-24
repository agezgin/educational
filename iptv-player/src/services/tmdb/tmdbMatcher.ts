/**
 * TMDB Matcher - IPTV iceriklerini TMDB ile eslestirir.
 *
 * Problem: IPTV playlist'lerinde film/dizi isimleri farkli formatlarda olabilir:
 *   - "The Matrix (1999)"
 *   - "Matrix.1999.1080p"
 *   - "Kurulus Osman S05E12"
 *
 * Bu modul, bu isimleri temizleyip TMDB'de arama yaparak
 * dogru film/diziyi bulur ve zengin metadata ile eslestirir.
 */

import { searchMovie, searchTVShow, imageUrl, TMDBListItem } from './tmdbApi';

interface MatchResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year?: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  overview: string;
  type: 'movie' | 'tv';
}

/**
 * Film/Dizi adini temizler (yil, kalite, uzanti bilgilerini cikarir).
 *
 * Ornekler:
 *   "The.Matrix.1999.1080p.BluRay" -> { name: "The Matrix", year: 1999 }
 *   "Kurulus Osman S05E12"         -> { name: "Kurulus Osman", year: undefined }
 *   "Inception (2010) [1080p]"     -> { name: "Inception", year: 2010 }
 */
export function cleanContentName(rawName: string): { name: string; year?: number } {
  let name = rawName;

  // Yil cikar: (2021) veya .2021. veya [2021]
  const yearMatch = name.match(/[\.\s\(\[]((?:19|20)\d{2})[\.\s\)\]]/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  // Sezon/Bolum bilgisini cikar: S01E05, s01e05
  name = name.replace(/[Ss]\d+[Ee]\d+.*$/, '');

  // Kalite/format bilgilerini cikar
  const removePatterns = [
    /[\.\s](?:720p|1080p|2160p|4K|HDR|BluRay|BRRip|WEBRip|HDTV|DVDRip|CAM|TS)[\.\s]?.*/i,
    /[\.\s](?:x264|x265|HEVC|AAC|AC3|DTS|MULTI|DUAL)[\.\s]?.*/i,
    /\[.*?\]/g,
    /\((?:19|20)\d{2}\)/g,
    /\.(mkv|mp4|avi|ts)$/i,
  ];

  for (const pattern of removePatterns) {
    name = name.replace(pattern, '');
  }

  // Noktalari ve alt cizcileri bosluga cevir
  name = name.replace(/[._]/g, ' ');

  // Fazla bosluklari temizle
  name = name.replace(/\s+/g, ' ').trim();

  return { name, year };
}

/**
 * Bir film adini TMDB'de arar ve en iyi eslesmyi dondurur.
 */
export async function matchMovie(rawName: string): Promise<MatchResult | null> {
  const { name, year } = cleanContentName(rawName);
  if (!name) return null;

  const results = await searchMovie(name, year);
  if (results.length === 0) return null;

  // En iyi eslesmyi sec (isim benzerligine gore)
  const best = findBestMatch(results, name, year);
  if (!best) return null;

  return {
    tmdbId: best.id,
    title: best.title || best.name || name,
    originalTitle: best.title || name,
    year: best.release_date ? parseInt(best.release_date.split('-')[0], 10) : year,
    posterUrl: imageUrl.poster(best.poster_path),
    backdropUrl: imageUrl.backdrop(best.backdrop_path),
    rating: best.vote_average,
    overview: best.overview,
    type: 'movie',
  };
}

/**
 * Bir dizi adini TMDB'de arar ve en iyi eslesmyi dondurur.
 */
export async function matchTVShow(rawName: string): Promise<MatchResult | null> {
  const { name, year } = cleanContentName(rawName);
  if (!name) return null;

  const results = await searchTVShow(name, year);
  if (results.length === 0) return null;

  const best = findBestMatch(results, name, year);
  if (!best) return null;

  return {
    tmdbId: best.id,
    title: best.name || best.title || name,
    originalTitle: best.name || name,
    year: best.first_air_date ? parseInt(best.first_air_date.split('-')[0], 10) : year,
    posterUrl: imageUrl.poster(best.poster_path),
    backdropUrl: imageUrl.backdrop(best.backdrop_path),
    rating: best.vote_average,
    overview: best.overview,
    type: 'tv',
  };
}

/**
 * Toplu eslestirme - Birden fazla icerigi paralel olarak eslestirir.
 * Rate limiting icin batch'ler halinde isler.
 */
export async function batchMatch(
  items: Array<{ id: string; name: string; type: 'movie' | 'tv' }>,
  batchSize = 5,
  delayMs = 250
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(item =>
        item.type === 'movie'
          ? matchMovie(item.name)
          : matchTVShow(item.name)
      )
    );

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[j].id, result.value);
      }
    }

    // Rate limiting - TMDB free tier: 40 request / 10 saniye
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ─── Yardimci Fonksiyonlar ────────────────────────────────────

function findBestMatch(
  results: TMDBListItem[],
  searchName: string,
  searchYear?: number
): TMDBListItem | null {
  if (results.length === 0) return null;

  const normalizedSearch = searchName.toLowerCase().trim();

  // Skor hesapla
  const scored = results.map(item => {
    let score = 0;
    const itemName = (item.title || item.name || '').toLowerCase().trim();
    const itemDate = item.release_date || item.first_air_date || '';
    const itemYear = itemDate ? parseInt(itemDate.split('-')[0], 10) : 0;

    // Tam isim eslesmesi: +10
    if (itemName === normalizedSearch) score += 10;
    // Baslangiç eslesmesi: +5
    else if (itemName.startsWith(normalizedSearch)) score += 5;
    // Icerik eslesmesi: +3
    else if (itemName.includes(normalizedSearch)) score += 3;

    // Yil eslesmesi: +5
    if (searchYear && itemYear === searchYear) score += 5;

    // Yuksek oy puanli icerikler tercihi: +0 to +2
    score += Math.min(item.vote_average / 5, 2);

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Skor 0 ise hicbir isim eslesmesi yok, yanlis sonuc donme
  return scored[0].score > 0 ? scored[0].item : null;
}
