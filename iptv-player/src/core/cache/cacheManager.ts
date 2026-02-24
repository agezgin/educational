/**
 * 3 Katmanli Cache Sistemi
 *
 * L1: Bellek (RAM) - Aninda erisim
 *   - Son 50 kanal logosu
 *   - Aktif kategori kanal listesi
 *   - Mevcut + komsu kanal stream bilgisi
 *
 * L2: Yerel Depolama (MMKV/AsyncStorage) - < 100ms
 *   - Tum kanal listesi (M3U parsed)
 *   - EPG verisi (son 24 saat)
 *   - Favori kanallar
 *   - Son izleme gecmisi
 *   - Kullanici ayarlari
 *
 * L3: Ag (Lazy Fetch) - Arka plan
 *   - Guncel M3U playlist
 *   - Guncel EPG
 *   - Kanal logolari (ilk kez)
 *
 * Strateji: L1'den goster -> L2'den kontrol et -> L3'ten guncelle
 */

import { Channel, EPGData, AppSettings } from '@/types';

// ─── L1: Bellek Cache ─────────────────────────────────────────

/** Bellekte tutulacak maximum logo sayisi */
const MAX_MEMORY_LOGOS = 50;

class MemoryCache {
  private channels: Channel[] = [];
  private channelMap = new Map<string, Channel>();
  private logoCache = new Map<string, string>();
  private activeGroupChannels: Channel[] = [];

  setChannels(channels: Channel[]): void {
    this.channels = channels;
    this.channelMap.clear();
    for (const ch of channels) {
      this.channelMap.set(ch.id, ch);
    }
  }

  getChannels(): Channel[] {
    return this.channels;
  }

  getChannelById(id: string): Channel | undefined {
    return this.channelMap.get(id);
  }

  setActiveGroupChannels(channels: Channel[]): void {
    this.activeGroupChannels = channels;
  }

  getActiveGroupChannels(): Channel[] {
    return this.activeGroupChannels;
  }

  /** Logo URL'ini bellekte cache'le (LRU mantigi) */
  cacheLogo(channelId: string, uri: string): void {
    // Limiti asarsa en eski entry'leri sil
    while (this.logoCache.size >= MAX_MEMORY_LOGOS) {
      const firstKey = this.logoCache.keys().next().value;
      if (firstKey) {
        this.logoCache.delete(firstKey);
      } else {
        break;
      }
    }
    this.logoCache.set(channelId, uri);
  }

  getLogo(channelId: string): string | undefined {
    return this.logoCache.get(channelId);
  }

  clear(): void {
    this.channels = [];
    this.channelMap.clear();
    this.logoCache.clear();
    this.activeGroupChannels = [];
  }
}

// ─── L2: Yerel Depolama Cache ─────────────────────────────────

/** MMKV/AsyncStorage key'leri */
const STORAGE_KEYS = {
  CHANNELS: 'cache:channels',
  EPG: 'cache:epg',
  FAVORITES: 'cache:favorites',
  HISTORY: 'cache:history',
  SETTINGS: 'cache:settings',
  LAST_PLAYLIST_URL: 'cache:last_playlist_url',
  LAST_CHANNEL_ID: 'cache:last_channel_id',
} as const;

/**
 * Storage adapter interface - MMKV veya AsyncStorage ile kullanilabilir.
 */
export interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  contains(key: string): boolean;
}

class DiskCache {
  /** Storage adapter - persist middleware tarafindan da kullanilir */
  storage: StorageAdapter | null = null;

  init(storage: StorageAdapter): void {
    this.storage = storage;
  }

  saveChannels(channels: Channel[]): void {
    this.storage?.set(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
  }

  loadChannels(): Channel[] | null {
    const data = this.storage?.getString(STORAGE_KEYS.CHANNELS);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  saveEPG(epgData: EPGData): void {
    this.storage?.set(STORAGE_KEYS.EPG, JSON.stringify(epgData));
  }

  loadEPG(): EPGData | null {
    const data = this.storage?.getString(STORAGE_KEYS.EPG);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  saveFavorites(channelIds: string[]): void {
    this.storage?.set(STORAGE_KEYS.FAVORITES, JSON.stringify(channelIds));
  }

  loadFavorites(): string[] {
    const data = this.storage?.getString(STORAGE_KEYS.FAVORITES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveWatchHistory(channelIds: string[]): void {
    this.storage?.set(STORAGE_KEYS.HISTORY, JSON.stringify(channelIds));
  }

  loadWatchHistory(): string[] {
    const data = this.storage?.getString(STORAGE_KEYS.HISTORY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveSettings(settings: AppSettings): void {
    this.storage?.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  loadSettings(): AppSettings | null {
    const data = this.storage?.getString(STORAGE_KEYS.SETTINGS);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  saveLastPlaylistUrl(url: string): void {
    this.storage?.set(STORAGE_KEYS.LAST_PLAYLIST_URL, url);
  }

  loadLastPlaylistUrl(): string | undefined {
    return this.storage?.getString(STORAGE_KEYS.LAST_PLAYLIST_URL);
  }

  saveLastChannelId(id: string): void {
    this.storage?.set(STORAGE_KEYS.LAST_CHANNEL_ID, id);
  }

  loadLastChannelId(): string | undefined {
    return this.storage?.getString(STORAGE_KEYS.LAST_CHANNEL_ID);
  }
}

// ─── Cache Manager (Singleton) ────────────────────────────────

class CacheManager {
  readonly memory = new MemoryCache();
  readonly disk = new DiskCache();

  /**
   * Uygulama baslatildiginda cache'i initialize eder.
   * Disk'ten bellege yukler (hizli baslangic).
   */
  async warmup(): Promise<{ channels: Channel[]; hasData: boolean }> {
    // L2'den L1'e yukle
    const cachedChannels = this.disk.loadChannels();
    if (cachedChannels && cachedChannels.length > 0) {
      this.memory.setChannels(cachedChannels);

      // Favorileri isle
      const favorites = this.disk.loadFavorites();
      if (favorites.length > 0) {
        const favSet = new Set(favorites);
        for (const ch of cachedChannels) {
          ch.isFavorite = favSet.has(ch.id);
        }
      }

      return { channels: cachedChannels, hasData: true };
    }

    return { channels: [], hasData: false };
  }

  /**
   * Yeni kanal listesi geldiginde tum katmanlari gunceller.
   */
  updateChannels(channels: Channel[]): void {
    this.memory.setChannels(channels);
    this.disk.saveChannels(channels);
  }
}

/** Global cache manager instance */
export const cacheManager = new CacheManager();
