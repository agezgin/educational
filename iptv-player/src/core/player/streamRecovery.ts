/**
 * Stream Error Recovery (Yayın Hata Kurtarma)
 *
 * Canli TV'de olusabilecek sorunlar:
 *
 * 1. Donma (Stall/Freeze):
 *    - Playback progress durur ama player hata vermez
 *    - Sebebi: server yavasi, ag gecikme, buffer yetersizligi
 *    - Cozum: Belirli sure sonra otomatik yeniden baglanti
 *
 * 2. Kopma (Disconnect):
 *    - Player error event firlatir
 *    - Sebebi: server kapandi, ag kesildi, URL degisti
 *    - Cozum: Exponential backoff ile yeniden deneme + alternatif gecis
 *
 * 3. Buffer Yetersizligi (Rebuffer):
 *    - Surekli buffering durumu
 *    - Sebebi: bant genisligi yetersiz, server yavas
 *    - Cozum: Dusuk kalite alternatife gec
 *
 * 4. Format Hatasi:
 *    - Codec/container desteklenmez
 *    - Cozum: Farkli player engine dene (ExoPlayer -> VLC)
 *
 * Strateji:
 * - Ilk 3 deneme: Ayni URL'i yeniden baglan (exponential backoff)
 * - 4-6. deneme: Alternatif URL'lere gec
 * - 7+: Kullaniciya hata bildirimi goster
 */

import { Channel } from '@/types';
import { streamAlternatives, AlternativeSelectionResult } from './streamAlternatives';

// ─── Configuration ───────────────────────────────────────

/** Donma algilama suresi (ms) - progress bu sure kadar degismezse donmus sayilir */
const STALL_DETECTION_MS = 8000;

/** Yeniden baglanti denemeleri icin backoff sureleri (ms) */
const RETRY_BACKOFF = [2000, 4000, 8000];

/** Surekli buffering esigi (ms) - bu sure boyunca buffering olursa sorun var */
const EXCESSIVE_BUFFER_MS = 15000;

/** Toplam max deneme sayisi (ayni URL + alternatifler dahil) */
const MAX_TOTAL_RETRIES = 7;

/** Hata sonrasi stabil kabul suresi (ms) - bu kadar sorunsuz oynarsa recovery basarili */
const STABLE_PLAYBACK_MS = 30000;

// ─── Types ───────────────────────────────────────────────

export type StreamHealthStatus =
  | 'healthy'         // Normal oynatma
  | 'stalling'        // Donma algilandi, mudahale bekleniyor
  | 'buffering'       // Surekli buffering
  | 'recovering'      // Yeniden baglanti deneniyor
  | 'switching'       // Alternatif kaynaga geciliyor
  | 'failed';         // Tum denemeler basarisiz

export type RecoveryAction =
  | { type: 'retry'; url: string; attempt: number }
  | { type: 'switch_alternative'; url: string; alternativeId: string; label: string }
  | { type: 'switch_engine'; engine: 'vlc' | 'exoplayer' | 'native' }
  | { type: 'give_up'; reason: string };

export interface StreamHealthState {
  /** Mevcut saglik durumu */
  status: StreamHealthStatus;
  /** Mevcut stream URL */
  currentUrl: string;
  /** Mevcut alternatif ID */
  currentAlternativeId: string;
  /** Toplam deneme sayisi */
  totalRetries: number;
  /** Ayni URL icin deneme sayisi */
  currentUrlRetries: number;
  /** Son hata mesaji */
  lastError: string | null;
  /** Son basarili oynatma zamani */
  lastHealthyAt: number;
  /** Daha once denenip basarisiz olan URL'ler */
  failedUrls: string[];
  /** Aktif recovery islemi */
  activeRecovery: RecoveryAction | null;
}

export interface RecoveryCallbacks {
  /** Yeni URL ile player'i yeniden baslat */
  onReconnect: (url: string) => void;
  /** Player engine degistir */
  onSwitchEngine: (engine: 'vlc' | 'exoplayer' | 'native') => void;
  /** Kullaniciya bilgi goster */
  onStatusChange: (status: StreamHealthStatus, message: string) => void;
  /** Tum denemeler basarisiz, kullaniciya sor */
  onGiveUp: (reason: string) => void;
}

// ─── Stream Recovery Manager ─────────────────────────────

export class StreamRecoveryManager {
  private state: StreamHealthState;
  private channel: Channel | null = null;
  private callbacks: RecoveryCallbacks | null = null;

  // Zamanlayicilar
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private stableTimer: ReturnType<typeof setTimeout> | null = null;

  // Son bilinen playback pozisyonu
  private lastProgress = 0;
  private lastProgressTime = 0;

  constructor() {
    this.state = this.createInitialState('');
  }

  // ─── Public API ────────────────────────────────────

  /**
   * Recovery manager'i bir kanal icin baslatir.
   */
  start(channel: Channel, callbacks: RecoveryCallbacks): void {
    this.stop();

    this.channel = channel;
    this.callbacks = callbacks;
    this.state = this.createInitialState(channel.url);

    this.startStallDetection();
  }

  /**
   * Recovery'yi durdurur ve temizler.
   */
  stop(): void {
    this.clearAllTimers();
    this.channel = null;
    this.callbacks = null;
    this.lastProgress = 0;
    this.lastProgressTime = 0;
  }

  /**
   * Player'dan gelen progress bildirimini isler.
   * Donma algılama icin progress'i izler.
   */
  reportProgress(currentTime: number): void {
    const now = Date.now();

    if (currentTime !== this.lastProgress) {
      // Progress degisti = saglikli
      this.lastProgress = currentTime;
      this.lastProgressTime = now;

      if (this.state.status === 'stalling' || this.state.status === 'recovering') {
        this.markHealthy();
      }

      // Stall timer'i sifirla
      this.resetStallTimer();
    }
  }

  /**
   * Player buffer durumunu bildirir.
   */
  reportBuffering(isBuffering: boolean): void {
    if (isBuffering) {
      this.startBufferTimer();
    } else {
      this.clearBufferTimer();

      if (this.state.status === 'buffering') {
        this.markHealthy();
      }
    }
  }

  /**
   * Player hata bildirimini isler.
   * Hata tipine gore recovery stratejisi belirler.
   */
  reportError(errorCode: string, errorMessage: string, recoverable: boolean): void {
    this.state.lastError = errorMessage;

    if (!recoverable) {
      // Kurtarilamaz hata (codec desteklenmez vs.)
      this.tryAlternativeOrGiveUp(`Kurtarılamaz hata: ${errorMessage}`);
      return;
    }

    // Kurtarilabilir hata - retry stratejisi
    this.initiateRecovery();
  }

  /**
   * Mevcut saglik durumunu dondurur.
   */
  getState(): Readonly<StreamHealthState> {
    return { ...this.state };
  }

  /**
   * Kullanici manuel olarak alternatif sectiginde.
   */
  manualSwitchAlternative(url: string, alternativeId: string): void {
    this.clearAllTimers();
    this.state = {
      ...this.createInitialState(url),
      currentAlternativeId: alternativeId,
    };
    this.callbacks?.onReconnect(url);
    this.startStallDetection();
  }

  // ─── Private: Recovery Logic ───────────────────────

  /** Donma algilama baslatir */
  private startStallDetection(): void {
    this.clearStallTimer();

    this.stallTimer = setTimeout(() => {
      // Progress son STALL_DETECTION_MS icerisinde degismedi
      if (this.state.status === 'healthy') {
        this.handleStall();
      }
    }, STALL_DETECTION_MS);
  }

  /** Stall timer'i sifirlar (her progress'te) */
  private resetStallTimer(): void {
    this.startStallDetection();
  }

  /** Donma algilandi */
  private handleStall(): void {
    this.updateStatus('stalling', 'Yayın dondu, yeniden bağlanılıyor...');
    this.initiateRecovery();
  }

  /** Surekli buffering timer */
  private startBufferTimer(): void {
    if (this.bufferTimer) return; // Zaten calisyor

    this.bufferTimer = setTimeout(() => {
      this.updateStatus('buffering', 'Sürekli tamponlama, alternatif aranıyor...');
      // Surekli buffering = dusuk kalite alternatife gec
      this.tryAlternativeOrGiveUp('Sürekli tamponlama sorunu');
    }, EXCESSIVE_BUFFER_MS);
  }

  /** Recovery baslatir (retry veya alternatif gecis) */
  private initiateRecovery(): void {
    this.clearStallTimer();

    if (this.state.totalRetries >= MAX_TOTAL_RETRIES) {
      this.giveUp('Maksimum deneme sayısına ulaşıldı');
      return;
    }

    // Ayni URL icin retry mi yoksa alternatife mi gecilmeli?
    if (this.state.currentUrlRetries < RETRY_BACKOFF.length) {
      // Ayni URL'i yeniden dene
      this.retryCurrentUrl();
    } else {
      // Alternatif kaynaga gec
      this.tryAlternativeOrGiveUp('Mevcut kaynak yanıt vermiyor');
    }
  }

  /** Ayni URL ile yeniden baglanti dene */
  private retryCurrentUrl(): void {
    const attempt = this.state.currentUrlRetries;
    const backoffMs = RETRY_BACKOFF[attempt] || RETRY_BACKOFF[RETRY_BACKOFF.length - 1];

    this.updateStatus('recovering', `Yeniden bağlanılıyor... (${attempt + 1}/${RETRY_BACKOFF.length})`);

    const action: RecoveryAction = {
      type: 'retry',
      url: this.state.currentUrl,
      attempt: attempt + 1,
    };
    this.state.activeRecovery = action;

    this.retryTimer = setTimeout(() => {
      this.state.currentUrlRetries++;
      this.state.totalRetries++;

      this.callbacks?.onReconnect(this.state.currentUrl);

      // Yeniden baglanti sonrasi stall detection'i yeniden baslat
      this.startStallDetection();
    }, backoffMs);
  }

  /** Alternatif kaynaga gecmeyi dene, yoksa pes et */
  private tryAlternativeOrGiveUp(reason: string): void {
    if (!this.channel) {
      this.giveUp(reason);
      return;
    }

    // Mevcut URL'i basarisiz olarak isaretle
    if (!this.state.failedUrls.includes(this.state.currentUrl)) {
      this.state.failedUrls.push(this.state.currentUrl);
    }

    // Mevcut alternatifin failure'ini bildir
    if (this.channel.alternativeUrls) {
      const currentAlt = this.channel.alternativeUrls.find(
        alt => alt.id === this.state.currentAlternativeId
      );
      if (currentAlt) {
        const updated = streamAlternatives.reportFailure(currentAlt);
        // In-place guncelle
        Object.assign(currentAlt, updated);
      }
    }

    // Siradaki alternatifi sec
    const next = streamAlternatives.selectNextAlternative(
      this.channel,
      this.state.currentUrl,
      this.state.failedUrls,
    );

    if (next) {
      this.switchToAlternative(next);
    } else {
      this.giveUp(reason);
    }
  }

  /** Alternatif kaynaga gec */
  private switchToAlternative(result: AlternativeSelectionResult): void {
    this.updateStatus('switching', `"${result.label}" kaynağına geçiliyor...`);

    const action: RecoveryAction = {
      type: 'switch_alternative',
      url: result.url,
      alternativeId: result.alternativeId,
      label: result.label,
    };
    this.state.activeRecovery = action;

    // Kisa bir gecikme sonra gec (UI'nin guncellenmesi icin)
    this.retryTimer = setTimeout(() => {
      this.state.currentUrl = result.url;
      this.state.currentAlternativeId = result.alternativeId;
      this.state.currentUrlRetries = 0;
      this.state.totalRetries++;

      this.callbacks?.onReconnect(result.url);
      this.startStallDetection();
    }, 1000);
  }

  /** Tum denemeler basarisiz */
  private giveUp(reason: string): void {
    this.clearAllTimers();
    this.updateStatus('failed', reason);
    this.state.activeRecovery = { type: 'give_up', reason };
    this.callbacks?.onGiveUp(reason);
  }

  /** Saglikli duruma don */
  private markHealthy(): void {
    this.updateStatus('healthy', 'Yayın normal');
    this.state.activeRecovery = null;

    // Mevcut alternatifi basarili olarak isaretle
    if (this.channel?.alternativeUrls) {
      const currentAlt = this.channel.alternativeUrls.find(
        alt => alt.id === this.state.currentAlternativeId
      );
      if (currentAlt) {
        const updated = streamAlternatives.reportSuccess(currentAlt);
        Object.assign(currentAlt, updated);
      }
    }

    // Stabil kabul zamanlayicisi
    this.clearStableTimer();
    this.stableTimer = setTimeout(() => {
      // 30sn sorunsuz oynadi, retry sayaclarini sifirla
      this.state.totalRetries = 0;
      this.state.currentUrlRetries = 0;
      this.state.failedUrls = [];
      this.state.lastHealthyAt = Date.now();
    }, STABLE_PLAYBACK_MS);

    this.startStallDetection();
  }

  /** Durum guncelle ve callback cagir */
  private updateStatus(status: StreamHealthStatus, message: string): void {
    this.state.status = status;
    this.callbacks?.onStatusChange(status, message);
  }

  /** Baslangic state'i olustur */
  private createInitialState(url: string): StreamHealthState {
    return {
      status: 'healthy',
      currentUrl: url,
      currentAlternativeId: 'primary',
      totalRetries: 0,
      currentUrlRetries: 0,
      lastError: null,
      lastHealthyAt: Date.now(),
      failedUrls: [],
      activeRecovery: null,
    };
  }

  // ─── Timer Management ──────────────────────────────

  private clearStallTimer(): void {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private clearBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  private clearStableTimer(): void {
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearStallTimer();
    this.clearBufferTimer();
    this.clearStableTimer();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

/** Singleton instance */
export const streamRecovery = new StreamRecoveryManager();
