/**
 * Zustand Persist Storage Adapter
 *
 * cacheManager.disk (MMKV/AsyncStorage) ile Zustand persist middleware'ini
 * birbirine baglar. Tum store'lar bu adapter uzerinden kalici depolama yapar.
 *
 * Kullanim:
 *   create<MyState>()(
 *     persist(
 *       (set, get) => ({ ... }),
 *       { name: 'my-store', storage: zustandStorage },
 *     )
 *   );
 */

import { StateStorage } from 'zustand/middleware';
import { cacheManager } from '@/core/cache';

/**
 * Zustand persist icin StateStorage uyumlu adapter.
 * MMKV (senkron) veya AsyncStorage (asenkron) ile calisir.
 */
export const zustandStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const storage = (cacheManager.disk as any).storage;
    if (!storage) return null;
    return storage.getString(name) ?? null;
  },

  setItem: (name: string, value: string): void => {
    const storage = (cacheManager.disk as any).storage;
    if (!storage) return;
    storage.set(name, value);
  },

  removeItem: (name: string): void => {
    const storage = (cacheManager.disk as any).storage;
    if (!storage) return;
    storage.delete(name);
  },
};

/** Store isimleri - cakisma onleme icin prefix */
export const STORE_NAMES = {
  PLAYER: 'store:player',
  WATCHLIST: 'store:watchlist',
  SERIES_TRACKING: 'store:series-tracking',
  MEDIA_PREFERENCES: 'store:media-preferences',
} as const;
