/**
 * Content Deduplication (Tekrar Filtreleme)
 *
 * IPTV Sorunu: Ayni film/dizi 5-6 hucrede gozukuyor!
 * Sebebi:
 * - Ayni icerik farkli kalitelerde var (720p, 1080p, 4K)
 * - Ayni icerik farkli dillerde var (TR, EN, DE)
 * - Ayni icerik farkli gruplarda tekrar ediyor
 * - Bazi provider'lar bilgiyi cokluyor
 *
 * Cozum:
 * - Isim benzerlik analizi (fuzzy match)
 * - En iyi kaliteyi sec, gerisini grupla
 * - Kullaniciya "2 daha versiyon var" goster
 * - Akilli filtreleme + gruplama
 */

// ─── Types ──────────────────────────────────────────────

export interface ContentItem {
  id: string;
  name: string;
  streamUrl: string;
  groupTitle?: string;
  /** Icerikten cikarilan kalite bilgisi */
  quality?: string;
  /** Icerikten cikarilan dil bilgisi */
  language?: string;
}

export interface DedupedContent {
  /** Ana (en iyi) versiyon */
  primary: ContentItem;
  /** Diger versiyonlar (farkli kalite/dil) */
  alternates: ContentItem[];
  /** Temizlenmis isim */
  cleanName: string;
  /** Toplam versiyon sayisi */
  totalVersions: number;
}

// ─── Deduplication Engine ───────────────────────────────

/**
 * Icerik listesindeki tekrarlari temizler.
 * Ayni film/dizinin farkli versiyonlarini gruplar.
 *
 * @param items - Ham icerik listesi
 * @param similarityThreshold - Benzerlik esigi (0-1, varsayilan 0.85)
 * @returns Tekrarsiz, gruplu icerik listesi
 */
export function deduplicateContent(
  items: ContentItem[],
  similarityThreshold: number = 0.85,
): DedupedContent[] {
  if (items.length === 0) return [];

  // 1. Isimleri temizle ve metadata cikar
  const processed = items.map((item) => ({
    item,
    clean: cleanContentName(item.name),
    quality: extractQuality(item.name),
    language: extractLanguage(item.name),
  }));

  // 2. Benzer icerikleri grupla
  const groups: Map<string, typeof processed> = new Map();
  const assigned = new Set<number>();

  for (let i = 0; i < processed.length; i++) {
    if (assigned.has(i)) continue;

    const current = processed[i];
    const groupKey = current.clean.toLowerCase();
    const group = [current];
    assigned.add(i);

    for (let j = i + 1; j < processed.length; j++) {
      if (assigned.has(j)) continue;

      const candidate = processed[j];
      const similarity = calculateSimilarity(current.clean, candidate.clean);

      if (similarity >= similarityThreshold) {
        group.push(candidate);
        assigned.add(j);
      }
    }

    groups.set(groupKey, group);
  }

  // 3. Her grup icin en iyi versiyonu sec
  const result: DedupedContent[] = [];

  for (const [_, group] of groups) {
    // Kaliteye gore sirala (4K > 1080p > 720p > SD)
    group.sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality));

    const primary = group[0];
    const alternates = group.slice(1).map((g) => ({
      ...g.item,
      quality: g.quality,
      language: g.language,
    }));

    result.push({
      primary: {
        ...primary.item,
        quality: primary.quality,
        language: primary.language,
      },
      alternates,
      cleanName: primary.clean,
      totalVersions: group.length,
    });
  }

  return result;
}

// ─── Name Cleaner ───────────────────────────────────────

/**
 * IPTV icerik adini temizler.
 * "TR | The Batman (2022) [1080p] [DUAL]" -> "The Batman"
 */
export function cleanContentName(name: string): string {
  let clean = name;

  // Ulke/dil prefix'lerini kaldir: "TR |", "EN:", "DE -"
  clean = clean.replace(/^[A-Z]{2,3}\s*[|:\-]\s*/i, '');

  // Grup prefix: "Film |", "Dizi:", "Series -"
  clean = clean.replace(/^(Film|Dizi|Series|Movies?|TV)\s*[|:\-]\s*/i, '');

  // Kare parantez iceriklerini kaldir: [1080p], [TR], [DUAL], [H265]
  clean = clean.replace(/\[.*?\]/g, '');

  // Yuvarlak parantezdeki yil haricini kaldir
  clean = clean.replace(/\((?!\d{4}\))[^)]*\)/g, '');

  // Kalite ibareleri
  clean = clean.replace(/\b(4K|UHD|2160p|1080p|FHD|720p|HD|480p|SD|HEVC|H\.?265|H\.?264|x264|x265)\b/gi, '');

  // Dil ibareleri
  clean = clean.replace(/\b(DUAL|MULTI|TR|EN|DE|FR|ES|IT|PT|RU|AR|DUBBED|SUBBED|SUB|DUB|Altyazili|Turkce|Dublaj)\b/gi, '');

  // Kaynak ibareleri
  clean = clean.replace(/\b(BluRay|BRRip|WEB-?DL|HDRip|DVDRip|HDTV|CAM|TS|WEBRip|AMZN|NF|DSNP)\b/gi, '');

  // Ozel karakterleri temizle
  clean = clean.replace(/[_\-\.]+/g, ' ');

  // Coklu bosluklari birle
  clean = clean.replace(/\s+/g, ' ').trim();

  // Yili ayir (arama icin)
  clean = clean.replace(/\(\d{4}\)\s*$/, '').trim();

  return clean;
}

/**
 * Icerik adindan kalite bilgisi cikarir.
 */
export function extractQuality(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('4K') || upper.includes('2160P') || upper.includes('UHD')) return '4K';
  if (upper.includes('1080P') || upper.includes('FHD')) return '1080p';
  if (upper.includes('720P') || upper.includes(' HD')) return '720p';
  if (upper.includes('480P') || upper.includes(' SD')) return '480p';
  return 'unknown';
}

/**
 * Icerik adindan dil bilgisi cikarir.
 */
export function extractLanguage(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('DUAL') || upper.includes('MULTI')) return 'multi';
  if (upper.includes('TURKCE') || upper.includes('DUBLAJ') || /\bTR\b/.test(upper)) return 'tr';
  if (/\bEN\b/.test(upper) || upper.includes('ENGLISH')) return 'en';
  if (/\bDE\b/.test(upper) || upper.includes('GERMAN')) return 'de';
  if (/\bFR\b/.test(upper) || upper.includes('FRENCH')) return 'fr';
  return 'unknown';
}

// ─── Similarity Engine ──────────────────────────────────

/**
 * Iki string arasindaki benzerlik orani (0-1).
 * Levenshtein distance tabanli.
 */
export function calculateSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);

  return 1 - distance / maxLen;
}

/**
 * Levenshtein edit distance.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Tek satir DP (bellek optimizasyonu)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // silme
        curr[j - 1] + 1,  // ekleme
        prev[j - 1] + cost, // degistirme
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Kalite puani (siralama icin).
 */
function getQualityScore(quality: string): number {
  switch (quality) {
    case '4K': return 4;
    case '1080p': return 3;
    case '720p': return 2;
    case '480p': return 1;
    default: return 0;
  }
}

// ─── List Helper ────────────────────────────────────────

/**
 * Duplicate badge metni.
 * "3 farklı kalitede mevcut" gibi.
 */
export function getDuplicateLabel(deduped: DedupedContent): string | null {
  if (deduped.totalVersions <= 1) return null;

  const qualities = [deduped.primary.quality, ...deduped.alternates.map((a) => a.quality)]
    .filter((q) => q && q !== 'unknown');

  if (qualities.length > 1) {
    return `${qualities.join(', ')} mevcut`;
  }

  return `${deduped.totalVersions} versiyon`;
}
