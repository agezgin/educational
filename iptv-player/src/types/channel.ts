/**
 * Kanal ve playlist ile ilgili tum type tanimlari.
 */

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
