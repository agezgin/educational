/**
 * Player Abstraction Layer
 *
 * Birden fazla player engine'i destekler:
 *
 * 1. ExoPlayer (Android TV - varsayilan)
 *    + En stabil, Google destekli
 *    + Hardware decoding mukemmel
 *    + Adaptive bitrate (HLS/DASH)
 *    + DRM destegi (Widevine)
 *    - Sadece Android
 *
 * 2. VLC Player
 *    + HER formati oynatir (MKV, AVI, FLV, RTSP, RTMP...)
 *    + Dahili codec'ler (ek kurulum gerektirmez)
 *    + Altyazi destegi dahili
 *    + Multi-audio track destegi iyi
 *    - Biraz daha fazla RAM kullanir
 *
 * 3. Native Player (react-native-video)
 *    + Cross-platform (Android + iOS)
 *    + Basit entegrasyon
 *    - Bazi formatlar desteklenmez
 *
 * Kullanici ayarlardan tercih edebilir.
 * Varsayilan: Android TV -> ExoPlayer, diger -> VLC
 */

import { VideoQuality } from '@/types';
import { AudioTrack } from '@/core/audio';
import { SubtitleTrack } from '@/core/subtitle';

// ─── Player Engine Interface ──────────────────────────────────

export type PlayerEngineType = 'exoplayer' | 'vlc' | 'native';

export interface PlayerEventHandlers {
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onBuffer?: (isBuffering: boolean) => void;
  onProgress?: (currentTime: number, duration: number, buffered: number) => void;
  onError?: (error: PlayerError) => void;
  onEnd?: () => void;
  onAudioTracksAvailable?: (tracks: AudioTrack[]) => void;
  onSubtitleTracksAvailable?: (tracks: SubtitleTrack[]) => void;
  onVideoSizeChange?: (width: number, height: number) => void;
  onBitrateChange?: (bitrate: number) => void;
}

export interface PlayerError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface PlayerCapabilities {
  supportsHLS: boolean;
  supportsDASH: boolean;
  supportsRTSP: boolean;
  supportsRTMP: boolean;
  supportsMKV: boolean;
  supportsAVI: boolean;
  supportsDRM: boolean;
  supportsPiP: boolean;
  supportsChromecast: boolean;
  supportsAudioTrackSwitch: boolean;
  supportsSubtitleTrackSwitch: boolean;
  supportsAdaptiveBitrate: boolean;
  maxResolution: '4K' | '1080p' | '720p';
}

export interface PlayerEngineConfig {
  /** Baslangic sesi (0-100) */
  initialVolume: number;
  /** Hardware decoding aktif mi */
  hardwareDecoding: boolean;
  /** Min buffer (ms) */
  minBufferMs: number;
  /** Max buffer (ms) */
  maxBufferMs: number;
  /** Oynatma baslamasi icin gereken buffer (ms) */
  bufferForPlaybackMs: number;
  /** Tercih edilen kalite */
  preferredQuality: VideoQuality;
  /** Tercih edilen ses dili */
  preferredAudioLanguage: string;
  /** Tercih edilen altyazi dili */
  preferredSubtitleLanguage: string | null;
  /** Loop (tekrar) */
  loop: boolean;
  /** Aspect ratio modu */
  aspectRatio: AspectRatio;
}

export type AspectRatio = 'auto' | '16:9' | '4:3' | 'fill' | 'fit';

/** Her engine'in destekledigi ozellikler */
export const ENGINE_CAPABILITIES: Record<PlayerEngineType, PlayerCapabilities> = {
  exoplayer: {
    supportsHLS: true,
    supportsDASH: true,
    supportsRTSP: false,
    supportsRTMP: false,
    supportsMKV: true,
    supportsAVI: false,
    supportsDRM: true,
    supportsPiP: true,
    supportsChromecast: true,
    supportsAudioTrackSwitch: true,
    supportsSubtitleTrackSwitch: true,
    supportsAdaptiveBitrate: true,
    maxResolution: '4K',
  },
  vlc: {
    supportsHLS: true,
    supportsDASH: true,
    supportsRTSP: true,
    supportsRTMP: true,
    supportsMKV: true,
    supportsAVI: true,
    supportsDRM: false,
    supportsPiP: true,
    supportsChromecast: false,
    supportsAudioTrackSwitch: true,
    supportsSubtitleTrackSwitch: true,
    supportsAdaptiveBitrate: true,
    maxResolution: '4K',
  },
  native: {
    supportsHLS: true,
    supportsDASH: false,
    supportsRTSP: false,
    supportsRTMP: false,
    supportsMKV: false,
    supportsAVI: false,
    supportsDRM: false,
    supportsPiP: true,
    supportsChromecast: false,
    supportsAudioTrackSwitch: true,
    supportsSubtitleTrackSwitch: true,
    supportsAdaptiveBitrate: true,
    maxResolution: '1080p',
  },
};

/** Varsayilan player konfigurasyonu */
export const DEFAULT_ENGINE_CONFIG: PlayerEngineConfig = {
  initialVolume: 85,
  hardwareDecoding: true,
  minBufferMs: 2000,
  maxBufferMs: 15000,
  bufferForPlaybackMs: 1000,
  preferredQuality: 'auto',
  preferredAudioLanguage: 'tr',
  preferredSubtitleLanguage: null,
  loop: false,
  aspectRatio: 'auto',
};

/**
 * Stream URL'ine gore en uygun player engine'i secer.
 *
 * Mantik:
 * - RTSP/RTMP -> VLC (tek secenke)
 * - MKV/AVI -> VLC
 * - HLS/DASH -> ExoPlayer (Android), Native (diger)
 * - DRM korumali -> ExoPlayer
 */
export function selectBestEngine(url: string, hasDRM = false): PlayerEngineType {
  const lowerUrl = url.toLowerCase();

  // RTSP/RTMP sadece VLC destekler
  if (lowerUrl.startsWith('rtsp://') || lowerUrl.startsWith('rtmp://')) {
    return 'vlc';
  }

  // MKV/AVI/FLV VLC ile daha iyi
  if (lowerUrl.endsWith('.mkv') || lowerUrl.endsWith('.avi') || lowerUrl.endsWith('.flv')) {
    return 'vlc';
  }

  // DRM korumali icerik -> ExoPlayer
  if (hasDRM) {
    return 'exoplayer';
  }

  // HLS/TS -> ExoPlayer (Android TV icin en iyi)
  if (lowerUrl.endsWith('.m3u8') || lowerUrl.endsWith('.ts')) {
    return 'exoplayer';
  }

  // Varsayilan
  return 'exoplayer';
}

/**
 * Aspect ratio degerini pixel degerine cevirir.
 */
export function getAspectRatioValue(ratio: AspectRatio, videoWidth: number, videoHeight: number): number | undefined {
  switch (ratio) {
    case '16:9': return 16 / 9;
    case '4:3': return 4 / 3;
    case 'fill': return undefined; // Container'i doldur
    case 'fit': return videoWidth / videoHeight; // Video oranini koru
    case 'auto':
    default:
      return videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9;
  }
}
