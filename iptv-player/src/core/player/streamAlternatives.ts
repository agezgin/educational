/**
 * Stream Alternatives Manager
 *
 * Ayni kanalin birden fazla stream kaynagini yonetir.
 *
 * IPTV Sorunu:
 * - Ayni kanal farkli server'larda yayinlanir
 * - Bazi kaynaklar gecici olarak durebilir
 * - Kalite farkliliklari olabilir (SD/HD/FHD)
 * - Bazi kaynaklar belli saatlerde yogunluk yasabilir
 *
 * Cozum:
 * - Her kanal icin alternatif URL listesi tutulur
 * - Basarisiz olan kaynak otomatik olarak gerilere alinir
 * - Basarili kaynaklar one cikarilir (akilli siralama)
 * - Kullanici manuel tercih yapabilir
 * - Belirli sure sonra basarisiz kaynaklar tekrar denenir (cooldown)
 */

import { Channel, StreamAlternative } from '@/types';

// ─── Configuration ───────────────────────────────────────

/** Bir alternatifin tekrar denenmesi icin bekleme suresi (ms) */
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 dakika

/** Bir alternatifin max ard arda basarisizlik limiti */
const MAX_CONSECUTIVE_FAILURES = 5;

/** Cooldown sonrasi penalty carpani (once daha basarili olanlar tercih edilir) */
const FAILURE_PENALTY = 10;

// ─── Types ───────────────────────────────────────────────

export interface AlternativeSelectionResult {
  /** Secilen stream URL */
  url: string;
  /** Secilen alternatifin ID'si (ana URL ise 'primary') */
  alternativeId: string;
  /** Secilen alternatifin etiketi */
  label: string;
  /** Kalan denenebilecek alternatif sayisi */
  remainingAlternatives: number;
}

export interface AlternativeStats {
  /** Toplam alternatif sayisi */
  total: number;
  /** Aktif (kullanilabilir) alternatif sayisi */
  active: number;
  /** Cooldown'da olan alternatif sayisi */
  inCooldown: number;
  /** Tamamen devre disi olan sayisi */
  disabled: number;
}

// ─── Stream Alternatives Manager ─────────────────────────

class StreamAlternativesManager {
  /**
   * Kanal icin en uygun stream URL'ini secer.
   *
   * Siralama mantigi:
   * 1. Kullanici tercihi varsa onu dene (basarisiz degilse)
   * 2. Priority'ye gore sirala
   * 3. Son basarili olanlari one al
   * 4. Cok fazla hata alanlari geriye at
   * 5. Cooldown'daki alternatifleri atla
   */
  selectBestAlternative(
    channel: Channel,
    excludeUrls: Set<string> = new Set(),
  ): AlternativeSelectionResult | null {
    const alternatives = this.getAvailableAlternatives(channel);

    // Dislanmis URL'leri filtrele (ornegin az once hata alan)
    const candidates = alternatives.filter(alt => !excludeUrls.has(alt.url));

    if (candidates.length === 0) {
      // Hic alternatif yoksa ana URL'i dondur (exclude'da degilse)
      if (!excludeUrls.has(channel.url)) {
        return {
          url: channel.url,
          alternativeId: 'primary',
          label: 'Ana Yayın',
          remainingAlternatives: 0,
        };
      }
      return null; // Hicbir kaynak kullanilabilir degil
    }

    // Kullanici tercihi varsa onu one al
    if (channel.preferredAlternativeId) {
      const preferred = candidates.find(
        alt => alt.id === channel.preferredAlternativeId
      );
      if (preferred && this.isAlternativeUsable(preferred)) {
        return {
          url: preferred.url,
          alternativeId: preferred.id,
          label: preferred.label,
          remainingAlternatives: candidates.length - 1,
        };
      }
    }

    // Akilli siralama
    const scored = candidates
      .filter(alt => this.isAlternativeUsable(alt))
      .map(alt => ({
        alt,
        score: this.calculateScore(alt),
      }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Tum alternatifler cooldown'da, ana URL'i dene
      if (!excludeUrls.has(channel.url)) {
        return {
          url: channel.url,
          alternativeId: 'primary',
          label: 'Ana Yayın',
          remainingAlternatives: 0,
        };
      }
      return null;
    }

    const best = scored[0].alt;
    return {
      url: best.url,
      alternativeId: best.id,
      label: best.label,
      remainingAlternatives: scored.length - 1,
    };
  }

  /**
   * Siradaki alternatifi sec (mevcut basarisiz oldugunda).
   * Mevcut + daha once basarisiz olanlari dislar.
   */
  selectNextAlternative(
    channel: Channel,
    currentUrl: string,
    previouslyFailed: string[] = [],
  ): AlternativeSelectionResult | null {
    const excludeUrls = new Set([currentUrl, ...previouslyFailed]);
    return this.selectBestAlternative(channel, excludeUrls);
  }

  /**
   * Bir alternatifin basarili oldugunu bildir.
   * Son basari zamanini gunceller, hata sayacini sifirlar.
   */
  reportSuccess(alternative: StreamAlternative): StreamAlternative {
    return {
      ...alternative,
      isActive: true,
      lastSuccessAt: Date.now(),
      consecutiveFailures: 0,
    };
  }

  /**
   * Bir alternatifin basarisiz oldugunu bildir.
   * Hata sayacini arttirir, son hata zamanini gunceller.
   */
  reportFailure(alternative: StreamAlternative): StreamAlternative {
    const newFailures = alternative.consecutiveFailures + 1;
    return {
      ...alternative,
      lastFailedAt: Date.now(),
      consecutiveFailures: newFailures,
      isActive: newFailures < MAX_CONSECUTIVE_FAILURES,
    };
  }

  /**
   * Kanalin alternatif istatistiklerini dondurur.
   */
  getStats(channel: Channel): AlternativeStats {
    const alts = channel.alternativeUrls || [];
    const now = Date.now();

    let active = 0;
    let inCooldown = 0;
    let disabled = 0;

    for (const alt of alts) {
      if (!alt.isActive && alt.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        disabled++;
      } else if (
        alt.lastFailedAt &&
        now - alt.lastFailedAt < FAILURE_COOLDOWN_MS
      ) {
        inCooldown++;
      } else {
        active++;
      }
    }

    return {
      total: alts.length + 1, // +1 ana URL
      active: active + 1, // +1 ana URL
      inCooldown,
      disabled,
    };
  }

  /**
   * M3U parse sonrasinda ayni isimli kanallari gruplar
   * ve alternatiflerini olusturur.
   *
   * IPTV listelerinde ayni kanal birden fazla URL ile gelebilir:
   * - "Star TV" -> url1
   * - "Star TV HD" -> url2
   * - "Star TV FHD" -> url3
   * - "Star TV | Yedek" -> url4
   */
  groupChannelAlternatives(channels: Channel[]): Channel[] {
    const channelMap = new Map<string, Channel[]>();

    for (const channel of channels) {
      const normalizedName = this.normalizeChannelName(channel.name);
      if (!channelMap.has(normalizedName)) {
        channelMap.set(normalizedName, []);
      }
      channelMap.get(normalizedName)!.push(channel);
    }

    const result: Channel[] = [];

    for (const [_, group] of channelMap) {
      if (group.length === 1) {
        // Tekil kanal, alternatif yok
        result.push(group[0]);
        continue;
      }

      // Birden fazla: kaliteye gore sirala, en iyisini ana yap
      const sorted = group.sort(
        (a, b) => this.getChannelQualityScore(b.name) - this.getChannelQualityScore(a.name)
      );

      const primary = sorted[0];
      const alternatives: StreamAlternative[] = sorted.slice(1).map((ch, idx) => ({
        id: `alt_${primary.id}_${idx}`,
        url: ch.url,
        label: this.extractAlternativeLabel(ch.name, primary.name),
        priority: sorted.length - idx - 1,
        isActive: true,
        consecutiveFailures: 0,
      }));

      result.push({
        ...primary,
        alternativeUrls: alternatives,
      });
    }

    return result;
  }

  // ─── Private Methods ─────────────────────────────────

  /** Kullanilabilir alternatifleri getir (ana URL dahil degil) */
  private getAvailableAlternatives(channel: Channel): StreamAlternative[] {
    if (!channel.alternativeUrls || channel.alternativeUrls.length === 0) {
      return [];
    }
    return channel.alternativeUrls;
  }

  /** Bir alternatif simdi kullanilabilir mi */
  private isAlternativeUsable(alt: StreamAlternative): boolean {
    // Tamamen devre disi
    if (!alt.isActive && alt.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      return false;
    }

    // Cooldown kontrolu
    if (alt.lastFailedAt) {
      const elapsed = Date.now() - alt.lastFailedAt;
      if (elapsed < FAILURE_COOLDOWN_MS && alt.consecutiveFailures > 0) {
        return false;
      }
    }

    return true;
  }

  /** Alternatifin akilli puanini hesapla */
  private calculateScore(alt: StreamAlternative): number {
    let score = alt.priority * 100;

    // Son basarili olanlara bonus
    if (alt.lastSuccessAt) {
      const hoursSinceSuccess = (Date.now() - alt.lastSuccessAt) / (1000 * 60 * 60);
      score += Math.max(0, 50 - hoursSinceSuccess);
    }

    // Hatali olanlara penalty
    score -= alt.consecutiveFailures * FAILURE_PENALTY;

    return score;
  }

  /**
   * Kanal adini normalize et (gruplama icin).
   * "Star TV HD" ve "Star TV FHD" ayni gruba dusmeli.
   */
  private normalizeChannelName(name: string): string {
    let clean = name
      .toLowerCase()
      .trim();

    // Kalite ibarelerini kaldir
    clean = clean.replace(
      /\b(4k|uhd|fhd|hd|sd|h\.?265|h\.?264|hevc|1080p?|720p?|480p?)\b/gi,
      ''
    );

    // Yedek/backup ibarelerini kaldir
    clean = clean.replace(
      /\b(yedek|backup|bak|alt|alternatif|reserve)\b/gi,
      ''
    );

    // Numara eklentilerini kaldir: "Star TV 2", "Star TV (2)"
    clean = clean.replace(/\(\d+\)/, '');
    clean = clean.replace(/\s+\d+\s*$/, '');

    // Ayirici karakterleri temizle
    clean = clean.replace(/[|:_\-\/\\]+/g, ' ');

    // Coklu bosluklari birle
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
  }

  /** Kanal adindan kalite puani cikar */
  private getChannelQualityScore(name: string): number {
    const upper = name.toUpperCase();
    if (upper.includes('4K') || upper.includes('UHD')) return 5;
    if (upper.includes('FHD') || upper.includes('1080')) return 4;
    if (upper.includes('HD') && !upper.includes('SD')) return 3;
    if (upper.includes('SD')) return 1;
    return 2; // Belirtilmemis = orta kalite
  }

  /** Alternatif etiketi cikar */
  private extractAlternativeLabel(altName: string, primaryName: string): string {
    const upper = altName.toUpperCase();

    // Kalite etiketi
    if (upper.includes('4K') || upper.includes('UHD')) return '4K';
    if (upper.includes('FHD') || upper.includes('1080')) return 'FHD';
    if (upper.includes('HD')) return 'HD';
    if (upper.includes('SD')) return 'SD';

    // Yedek etiketi
    if (upper.includes('YEDEK') || upper.includes('BACKUP') || upper.includes('BAK')) {
      return 'Yedek';
    }

    // Numara farki
    const altNum = altName.match(/(\d+)\s*$/);
    if (altNum) return `Kaynak ${altNum[1]}`;

    return 'Alternatif';
  }
}

/** Singleton instance */
export const streamAlternatives = new StreamAlternativesManager();
