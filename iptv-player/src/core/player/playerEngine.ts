/**
 * Player Engine - Video oynatma mantigi
 *
 * Hizli kanal degistirme (zapping) stratejisi:
 * 1. Preloading: Secili kanalin ust/alt 2 kanalini hazirla
 * 2. Fast switch: Mevcut stream kesilmeden yeni stream hazirlanir
 * 3. Adaptive buffer: Ilk 2sn dusuk kalite -> sonra HD
 *
 * Platform-specific player:
 * - Android TV: ExoPlayer (react-native-video)
 * - Samsung Tizen: AVPlay API
 */

import { PlayerConfig, PlayerStatus, PlayerState, VideoQuality, Channel } from '@/types';
import { streamAlternatives } from './streamAlternatives';

/** Varsayilan player konfigurasyonu */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  quality: 'auto',
  bufferDuration: 2,
  hardwareDecoding: true,
  osdTimeout: 5,
  preloadCount: 2,
};

/**
 * Preload queue - komsu kanallarin URL'lerini tutar.
 * Hizli kanal degistirme icin arka planda hazirlanir.
 */
export class PreloadManager {
  private preloadedUrls = new Set<string>();
  private maxPreloads: number;

  constructor(maxPreloads = 2) {
    this.maxPreloads = maxPreloads;
  }

  /**
   * Mevcut kanalin komsu kanallarini preload listesine ekler.
   * Her kanal icin en iyi alternatif URL kullanilir.
   */
  updatePreloadQueue(channels: Channel[], currentIndex: number): string[] {
    this.preloadedUrls.clear();
    const toPreload: string[] = [];

    for (let i = 1; i <= this.maxPreloads; i++) {
      // Ustteki kanal
      const prevIdx = currentIndex - i;
      if (prevIdx >= 0) {
        const url = this.getBestUrl(channels[prevIdx]);
        toPreload.push(url);
        this.preloadedUrls.add(url);
      }

      // Alttaki kanal
      const nextIdx = currentIndex + i;
      if (nextIdx < channels.length) {
        const url = this.getBestUrl(channels[nextIdx]);
        toPreload.push(url);
        this.preloadedUrls.add(url);
      }
    }

    return toPreload;
  }

  /** Kanal icin en uygun URL'i dondurur (alternatifler dahil) */
  private getBestUrl(channel: Channel): string {
    const result = streamAlternatives.selectBestAlternative(channel);
    return result?.url || channel.url;
  }

  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  clear(): void {
    this.preloadedUrls.clear();
  }
}

/**
 * Buffer stratejisi hesaplayici.
 * Ag durumuna gore optimal buffer ayarlarini dondurur.
 */
export function calculateBufferConfig(config: PlayerConfig) {
  return {
    minBufferMs: config.bufferDuration * 1000,
    maxBufferMs: config.bufferDuration * 7500, // 2sn -> 15sn, 5sn -> 37.5sn
    bufferForPlaybackMs: 1000, // 1sn buffer sonra oynat (hizli baslatma)
    bufferForPlaybackAfterRebufferMs: config.bufferDuration * 1500,
  };
}

/**
 * Video kalite secici.
 * Bant genisligine gore uygun kaliteyi secer.
 */
export function selectQuality(
  preferredQuality: VideoQuality,
  availableBitrates: number[],
  currentBandwidth: number
): number {
  if (preferredQuality === 'auto') {
    // Mevcut bant genisliginin %80'ini kullan (guvenli margin)
    const targetBitrate = currentBandwidth * 0.8;
    // Hedeften kucuk en buyuk bitrate'i sec
    const suitable = availableBitrates
      .filter(b => b <= targetBitrate)
      .sort((a, b) => b - a);
    return suitable[0] || availableBitrates[availableBitrates.length - 1] || 0;
  }

  // Manuel kalite secimi
  const qualityMap: Record<string, number> = {
    '1080p': 5000000,
    '720p': 2500000,
    '480p': 1000000,
    '360p': 500000,
  };

  const targetBitrate = qualityMap[preferredQuality] || 2500000;
  const closest = availableBitrates.reduce((prev, curr) =>
    Math.abs(curr - targetBitrate) < Math.abs(prev - targetBitrate) ? curr : prev
  );

  return closest;
}

/**
 * Kanal degistirme suresi olcumu (performans tracking).
 */
export class ZappingTimer {
  private startTime = 0;
  private measurements: number[] = [];

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    const elapsed = Date.now() - this.startTime;
    this.measurements.push(elapsed);
    // Son 20 olcumu tut
    if (this.measurements.length > 20) {
      this.measurements.shift();
    }
    return elapsed;
  }

  /** Ortalama kanal degistirme suresi (ms) */
  getAverage(): number {
    if (this.measurements.length === 0) return 0;
    const sum = this.measurements.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.measurements.length);
  }
}
