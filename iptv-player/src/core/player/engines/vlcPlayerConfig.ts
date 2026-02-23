/**
 * VLC Player Konfigurasyonu
 *
 * VLC - Her formati oynatan en guclu player
 * react-native-vlc-media-player paketi ile kullanilir.
 *
 * Avantajlar:
 * - RTSP, RTMP, MKV, AVI, FLV, MPEG-TS, HLS, DASH hepsi
 * - Dahili codec'ler (FFmpeg tabanlı)
 * - Dahili altyazi render
 * - Audio track switch
 * - Hardware + Software decoding
 *
 * Ne zaman VLC kullanilmali:
 * - RTSP stream'ler (IP kamera, bazi IPTV servisleri)
 * - RTMP stream'ler
 * - MKV/AVI dosyalar (filmler)
 * - ExoPlayer'in acamadigi formatlar
 */

import { PlayerEngineConfig, AspectRatio } from './playerAbstraction';

/**
 * VLC player icin react-native-vlc-media-player props olusturur.
 */
export function buildVLCPlayerProps(config: PlayerEngineConfig, streamUrl: string) {
  return {
    source: {
      uri: streamUrl,
      initOptions: buildVLCInitOptions(config),
    },
    autoplay: true,
    style: { flex: 1 },

    // VLC-specific callbacks (component'te handle edilir)
    // onPlaying, onPaused, onStopped, onBuffering, onError, onProgress, onEnd
  };
}

/**
 * VLC initialization options.
 * libVLC komut satiri argumanlari formatinda.
 */
function buildVLCInitOptions(config: PlayerEngineConfig): string[] {
  const options: string[] = [
    // Genel
    '--no-osd',                    // OSD'yi biz yonetiyoruz
    '--no-video-title-show',       // Baslik gosterme

    // Network
    '--network-caching=2000',      // Network cache (ms)
    '--live-caching=1000',         // Live stream cache
    '--file-caching=1500',         // Dosya cache

    // Codec
    '--codec=avcodec,none',        // FFmpeg codec'leri kullan

    // Audio
    '--audio-language=tur,eng',    // Turkce oncelikli
  ];

  // Hardware decoding
  if (config.hardwareDecoding) {
    options.push('--avcodec-hw=any');   // Hardware decoding otomatik
  } else {
    options.push('--avcodec-hw=none');  // Software decoding
  }

  // Buffer ayarlari
  options.push(`--network-caching=${config.minBufferMs}`);
  options.push(`--live-caching=${Math.max(config.bufferForPlaybackMs, 500)}`);

  // Altyazi
  if (config.preferredSubtitleLanguage) {
    options.push(`--sub-language=${config.preferredSubtitleLanguage}`);
  } else {
    options.push('--no-sub-autodetect-file'); // Otomatik altyazi kapaliysa
  }

  return options;
}

/**
 * VLC aspect ratio string formati.
 */
export function getVLCAspectRatio(ratio: AspectRatio): string | undefined {
  switch (ratio) {
    case '16:9': return '16:9';
    case '4:3': return '4:3';
    case 'fill': return undefined; // VLC varsayilani
    case 'fit': return undefined;
    case 'auto':
    default:
      return undefined;
  }
}

/**
 * VLC hata kodlari ve aciklamalari.
 */
export function getVLCErrorMessage(errorCode: number): string {
  const errors: Record<number, string> = {
    0: 'Bilinmeyen hata',
    1: 'Medya acilamadi',
    2: 'Codec bulunamadi',
    3: 'Ag baglantisi kesildi',
    4: 'Dosya format desteklenmiyor',
    5: 'DRM korumali icerik (VLC ile acilmaz)',
  };
  return errors[errorCode] || `VLC Hata: ${errorCode}`;
}

/**
 * Hizli kanal degistirme icin VLC ayarlari.
 */
export function buildVLCFastSwitchProps(config: PlayerEngineConfig, streamUrl: string) {
  return {
    ...buildVLCPlayerProps(config, streamUrl),
    source: {
      uri: streamUrl,
      initOptions: [
        '--no-osd',
        '--no-video-title-show',
        '--network-caching=500',     // Cok dusuk cache
        '--live-caching=300',
        '--avcodec-skiploopfilter=4', // Hizli decode (kalite dusuk)
        config.hardwareDecoding ? '--avcodec-hw=any' : '--avcodec-hw=none',
      ],
    },
  };
}
