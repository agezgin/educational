/**
 * ExoPlayer Konfigurasyonu (Android TV)
 *
 * Google ExoPlayer - Android TV icin en iyi player
 * react-native-video v6+ arkada ExoPlayer kullanir.
 *
 * Optimizasyonlar:
 * - Hardware decoding varsayilan
 * - Dusuk buffer (hizli baslama)
 * - Adaptive bitrate
 * - Hizli kanal degistirme (seamless source switch)
 */

import { PlayerEngineConfig } from './playerAbstraction';

/**
 * ExoPlayer icin react-native-video props olusturur.
 */
export function buildExoPlayerProps(config: PlayerEngineConfig, streamUrl: string) {
  return {
    source: {
      uri: streamUrl,
      // ExoPlayer-specific ayarlar
      bufferConfig: {
        minBufferMs: config.minBufferMs,
        maxBufferMs: config.maxBufferMs,
        bufferForPlaybackMs: config.bufferForPlaybackMs,
        bufferForPlaybackAfterRebufferMs: config.minBufferMs * 1.5,
      },
    },
    // Video ayarlari
    resizeMode: mapAspectRatio(config.aspectRatio),
    volume: config.initialVolume / 100,
    muted: false,
    paused: false,
    repeat: config.loop,

    // Performance
    useTextureView: false, // SurfaceView daha performansli (TV icin)
    disableFocus: true,    // TV'de focus yonetimini biz yapiyoruz
    playInBackground: false,
    playWhenInactive: false,

    // Codec tercihleri
    selectedVideoTrack: getVideoTrackSelection(config.preferredQuality),
    selectedAudioTrack: {
      type: 'language' as const,
      value: config.preferredAudioLanguage,
    },

    // Poster (video yuklenirken gosterilecek gorsel)
    posterResizeMode: 'cover' as const,

    // Hata yonetimi
    maxBitRate: getMaxBitrate(config.preferredQuality),
    automaticallyWaitsToMinimizeStalling: true,
  };
}

/**
 * Hizli kanal degistirme icin ExoPlayer ayarlari.
 * Normal moddan farkli olarak buffer cok dusuk tutulur.
 */
export function buildFastSwitchProps(config: PlayerEngineConfig, streamUrl: string) {
  return {
    ...buildExoPlayerProps(config, streamUrl),
    source: {
      uri: streamUrl,
      bufferConfig: {
        minBufferMs: 500,
        maxBufferMs: 3000,
        bufferForPlaybackMs: 300,     // 300ms sonra oynat!
        bufferForPlaybackAfterRebufferMs: 500,
      },
    },
  };
}

function mapAspectRatio(ratio: string): 'contain' | 'cover' | 'stretch' {
  switch (ratio) {
    case 'fill': return 'cover';
    case 'fit': return 'contain';
    case '16:9':
    case '4:3':
    case 'auto':
    default:
      return 'contain';
  }
}

function getVideoTrackSelection(quality: string): { type: string; value?: number } {
  switch (quality) {
    case '1080p': return { type: 'resolution', value: 1080 };
    case '720p': return { type: 'resolution', value: 720 };
    case '480p': return { type: 'resolution', value: 480 };
    case '360p': return { type: 'resolution', value: 360 };
    case 'auto':
    default:
      return { type: 'auto' };
  }
}

function getMaxBitrate(quality: string): number {
  switch (quality) {
    case '1080p': return 8000000;  // 8 Mbps
    case '720p': return 4000000;   // 4 Mbps
    case '480p': return 1500000;   // 1.5 Mbps
    case '360p': return 800000;    // 800 Kbps
    case 'auto':
    default:
      return 0; // Sinir yok
  }
}
