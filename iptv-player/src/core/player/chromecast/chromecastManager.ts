/**
 * Chromecast / Google Cast Manager
 *
 * TV'den baska cihaza casting:
 * - Chromecast cihaz kesfetme
 * - Baglanti yonetimi
 * - Media kontrolu (play, pause, seek, volume)
 * - Queue yonetimi (siradaki kanal/bolum)
 * - Kanal degistirme cast halinde
 *
 * react-native-google-cast paketi ile kullanilir.
 * Android TV'de dahili cast sender API kullanilabilir.
 */

// ─── Cast State ─────────────────────────────────────────

export type CastState =
  | 'NO_DEVICES'    // Hic Chromecast yok
  | 'NOT_CONNECTED' // Cihaz var ama bagli degil
  | 'CONNECTING'    // Baglantiyor
  | 'CONNECTED'     // Bagli, idle
  | 'PLAYING';      // Bagli, oynatiliyor

export interface CastDevice {
  id: string;
  name: string;
  modelName: string;
  isOnLocalNetwork: boolean;
}

export interface CastMediaInfo {
  /** Stream URL */
  url: string;
  /** Icerik tipi */
  contentType: string;
  /** Icerik basligi */
  title: string;
  /** Aciklama */
  subtitle?: string;
  /** Poster/thumbnail URL */
  imageUrl?: string;
  /** Stream tipi */
  streamType: 'LIVE' | 'BUFFERED';
  /** Baslangic pozisyonu (ms) - VOD icin */
  startPosition?: number;
}

export interface CastPlayerState {
  /** Oynatma durumu */
  isPlaying: boolean;
  /** Mevcut pozisyon (saniye) */
  currentTime: number;
  /** Toplam sure (saniye) - VOD icin */
  duration: number;
  /** Ses seviyesi (0-1) */
  volume: number;
  /** Sessiz mi */
  isMuted: boolean;
}

// ─── Cast Manager ───────────────────────────────────────

/**
 * Canli TV stream'i icin Cast media bilgisi olusturur.
 */
export function buildLiveCastMedia(
  streamUrl: string,
  channelName: string,
  channelLogo?: string,
  currentProgram?: string,
): CastMediaInfo {
  return {
    url: streamUrl,
    contentType: getContentType(streamUrl),
    title: channelName,
    subtitle: currentProgram,
    imageUrl: channelLogo,
    streamType: 'LIVE',
  };
}

/**
 * Film/Dizi icin Cast media bilgisi olusturur.
 */
export function buildVODCastMedia(
  streamUrl: string,
  title: string,
  subtitle?: string,
  posterUrl?: string,
  startPosition?: number,
): CastMediaInfo {
  return {
    url: streamUrl,
    contentType: getContentType(streamUrl),
    title,
    subtitle,
    imageUrl: posterUrl,
    streamType: 'BUFFERED',
    startPosition,
  };
}

/**
 * Stream URL'inden content type belirler.
 */
function getContentType(url: string): string {
  const lower = url.toLowerCase();

  if (lower.endsWith('.m3u8') || lower.includes('.m3u8')) {
    return 'application/x-mpegurl';
  }
  if (lower.endsWith('.mpd')) {
    return 'application/dash+xml';
  }
  if (lower.endsWith('.mp4')) {
    return 'video/mp4';
  }
  if (lower.endsWith('.mkv')) {
    return 'video/x-matroska';
  }
  if (lower.endsWith('.ts')) {
    return 'video/mp2t';
  }

  // Varsayilan: HLS (IPTV'de en yaygin)
  return 'application/x-mpegurl';
}

/**
 * Cast cihazlari listeleme ve filtreleme.
 */
export function filterCastDevices(
  devices: CastDevice[],
  searchQuery?: string,
): CastDevice[] {
  if (!searchQuery) return devices;

  const query = searchQuery.toLowerCase();
  return devices.filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.modelName.toLowerCase().includes(query),
  );
}

/**
 * Cast session icin default ayarlar.
 */
export const CAST_OPTIONS = {
  /** Cihaz kesfetme suresi (ms) */
  discoveryTimeout: 10000,
  /** Baglanti suresi (ms) */
  connectionTimeout: 15000,
  /** Otomatik yeniden baglanti */
  autoReconnect: true,
  /** Baska cihaz cast ediyorsa uyar */
  warnOnActiveSession: true,
  /** Cast bitince yerel oynatmaya don */
  resumeLocalOnDisconnect: true,
};

/**
 * Cast durumu icin okunabilir metin.
 */
export function getCastStateLabel(state: CastState): string {
  const labels: Record<CastState, string> = {
    NO_DEVICES: 'Cast cihazı bulunamadı',
    NOT_CONNECTED: 'Bağlantı yok',
    CONNECTING: 'Bağlanıyor...',
    CONNECTED: 'Bağlı',
    PLAYING: 'Oynatılıyor',
  };
  return labels[state];
}
