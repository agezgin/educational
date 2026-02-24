/**
 * Kanal ve playlist ile ilgili tum type tanimlari.
 */

/** Bir kanalin alternatif stream URL'i */
export interface StreamAlternative {
  /** Benzersiz alternatif ID'si */
  id: string;
  /** Stream URL */
  url: string;
  /** Kullaniciya gosterilecek etiket ("HD", "Yedek 1", "SD" vs.) */
  label: string;
  /** Kalite siralamasinda oncelik (yuksek = daha iyi) */
  priority: number;
  /** Bu alternatif aktif mi (erisilebilir mi) */
  isActive: boolean;
  /** Son basarili erisim zamani */
  lastSuccessAt?: number;
  /** Son hata zamani */
  lastFailedAt?: number;
  /** Ard arda basarisizlik sayisi */
  consecutiveFailures: number;
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  groupTitle: string;
  number?: number;
  isFavorite: boolean;
  isLocked: boolean;
  /** Son izlenme zamani (timestamp) */
  lastWatched?: number;
  /** Toplam izlenme sayisi - akilli oneri icin */
  watchCount: number;
  /** Xtream Codes stream ID */
  streamId?: number;
  /** catchup / timeshift destegi */
  catchupSupport: boolean;
  /** Alternatif stream URL'leri (ayni kanalin farkli kaynaklari) */
  alternativeUrls?: StreamAlternative[];
  /** Kullanicinin tercih ettigi alternatif ID'si */
  preferredAlternativeId?: string;
}

export interface ChannelGroup {
  id: string;
  name: string;
  icon?: string;
  channelCount: number;
  channels: Channel[];
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  type: PlaylistType;
  /** Xtream Codes icin */
  username?: string;
  password?: string;
  serverUrl?: string;
  /** Son guncelleme zamani */
  lastUpdated: number;
  /** Toplam kanal sayisi */
  channelCount: number;
  /** Aktif mi? (coklu playlist destegi) */
  isActive: boolean;
}

export type PlaylistType = 'm3u' | 'xtream';

export interface M3UExtInf {
  duration: number;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  groupTitle?: string;
  channelName: string;
}
