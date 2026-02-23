/**
 * Picture-in-Picture (PiP) Manager
 *
 * Kucuk pencerede video izleme:
 * - Android TV PiP API entegrasyonu
 * - Otomatik PiP (Home tusuna basinca)
 * - PiP boyut ve pozisyon kontrolu
 * - PiP durumunda OSD gizleme
 * - Kanal gecisi PiP'te de calisir
 *
 * Android 8+ (API 26+) destekler.
 * Android TV'de native PiP modu kullanilir.
 */

import { Platform } from 'react-native';

// ─── PiP State ──────────────────────────────────────────

export interface PiPState {
  /** PiP modu aktif mi */
  isActive: boolean;
  /** PiP destekleniyor mu */
  isSupported: boolean;
  /** PiP boyut orani */
  aspectRatio: { width: number; height: number };
  /** PiP pencere pozisyonu */
  position: PiPPosition;
}

export type PiPPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PiPConfig {
  /** Otomatik PiP (Home tusuna basinca) */
  autoEnterOnHome: boolean;
  /** PiP boyut orani */
  aspectRatio: { width: number; height: number };
  /** PiP'te ses acik kalsin mi */
  keepAudio: boolean;
  /** PiP'te altyazi gosterilsin mi */
  showSubtitles: boolean;
}

export const DEFAULT_PIP_CONFIG: PiPConfig = {
  autoEnterOnHome: true,
  aspectRatio: { width: 16, height: 9 },
  keepAudio: true,
  showSubtitles: false,
};

// ─── PiP Manager ────────────────────────────────────────

/**
 * PiP desteği kontrol eder.
 * Android 8+ (API 26) gerekir.
 */
export function isPiPSupported(): boolean {
  return Platform.OS === 'android' && Platform.Version >= 26;
}

/**
 * PiP moduna gecis parametrelerini hazirlar.
 * Android Activity.enterPictureInPictureMode() icin.
 */
export function buildPiPParams(config: PiPConfig) {
  return {
    // Android PictureInPictureParams.Builder
    aspectRatio: config.aspectRatio,
    // PiP aksiyonlari (remote control)
    actions: [
      {
        title: 'Oynat/Duraklat',
        icon: 'ic_media_play_pause',
        requestCode: 1,
      },
      {
        title: 'Onceki Kanal',
        icon: 'ic_media_previous',
        requestCode: 2,
      },
      {
        title: 'Sonraki Kanal',
        icon: 'ic_media_next',
        requestCode: 3,
      },
    ],
    // Seamless resize (Android 12+)
    seamlessResizeEnabled: true,
    // Otomatik PiP
    autoEnterEnabled: config.autoEnterOnHome,
  };
}

/**
 * PiP aksiyonlarini isler.
 * PiP modundayken remote control butonlari.
 */
export function handlePiPAction(
  requestCode: number,
  callbacks: {
    onPlayPause?: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
  },
) {
  switch (requestCode) {
    case 1:
      callbacks.onPlayPause?.();
      break;
    case 2:
      callbacks.onPrevious?.();
      break;
    case 3:
      callbacks.onNext?.();
      break;
  }
}

/**
 * PiP pencere boyut hesaplayici.
 * Ekran boyutuna gore PiP boyutu belirler.
 */
export function calculatePiPDimensions(
  screenWidth: number,
  screenHeight: number,
  aspectRatio: { width: number; height: number },
): { width: number; height: number } {
  // PiP pencere genisligi ekranin ~%35'i (TV icin ideal)
  const pipWidth = Math.round(screenWidth * 0.35);
  const pipHeight = Math.round(pipWidth * (aspectRatio.height / aspectRatio.width));

  return {
    width: Math.min(pipWidth, screenWidth * 0.5),  // Max %50
    height: Math.min(pipHeight, screenHeight * 0.5),
  };
}

/**
 * PiP pozisyon koordinatlari.
 */
export function getPiPPositionStyle(
  position: PiPPosition,
  screenWidth: number,
  screenHeight: number,
  pipWidth: number,
  pipHeight: number,
  margin: number = 24,
) {
  const positions = {
    'top-left': { top: margin, left: margin },
    'top-right': { top: margin, left: screenWidth - pipWidth - margin },
    'bottom-left': { top: screenHeight - pipHeight - margin, left: margin },
    'bottom-right': { top: screenHeight - pipHeight - margin, left: screenWidth - pipWidth - margin },
  };

  return positions[position];
}
