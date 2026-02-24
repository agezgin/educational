/**
 * Kanal Store - Zustand ile state yonetimi
 *
 * Canli TV kanallari, kategoriler, favoriler ve izleme gecmisi.
 */

import { create } from 'zustand';
import { Channel, ChannelGroup, StreamAlternative } from '@/types';
import { groupChannels } from '@/core/parser';
import { cacheManager } from '@/core/cache';
import { streamAlternatives } from '@/core/player/streamAlternatives';

interface ChannelState {
  /** Tum kanallar (flat liste) */
  channels: Channel[];
  /** Gruplara ayrilmis kanallar */
  groups: ChannelGroup[];
  /** Secili kategori */
  activeGroupId: string | null;
  /** Aktif kategorideki kanallar */
  activeGroupChannels: Channel[];
  /** Secili kanal */
  currentChannel: Channel | null;
  /** Secili kanalin listedeki indexi */
  currentChannelIndex: number;
  /** Favori kanal ID'leri */
  favoriteIds: Set<string>;
  /** Yukleniyor mu? */
  isLoading: boolean;
  /** Hata mesaji */
  error: string | null;
  /** Alternatif gruplama aktif mi */
  alternativeGroupingEnabled: boolean;

  // Actions
  setChannels: (channels: Channel[]) => void;
  setActiveGroup: (groupId: string | null) => void;
  setCurrentChannel: (channel: Channel) => void;
  toggleFavorite: (channelId: string) => void;
  switchChannelUp: () => void;
  switchChannelDown: () => void;
  switchToChannelNumber: (number: number) => void;
  searchChannels: (query: string) => Channel[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Alternatifleri gruplama (M3U parse sonrasi) */
  groupAlternatives: () => void;
  /** Alternatif gruplama toggle */
  setAlternativeGrouping: (enabled: boolean) => void;
  /** Kanala manuel alternatif ekle */
  addAlternative: (channelId: string, alternative: StreamAlternative) => void;
  /** Kullanicinin tercih ettigi alternatifi kaydet */
  setPreferredAlternative: (channelId: string, alternativeId: string) => void;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  groups: [],
  activeGroupId: null,
  activeGroupChannels: [],
  currentChannel: null,
  currentChannelIndex: 0,
  favoriteIds: new Set(),
  isLoading: false,
  error: null,
  alternativeGroupingEnabled: true,

  setChannels: (channels) => {
    // Favori bilgisini immutable olarak uygula
    const favIds = get().favoriteIds;
    const updatedChannels = favIds.size > 0
      ? channels.map(ch => ({ ...ch, isFavorite: favIds.has(ch.id) }))
      : channels;

    // Cache'e kaydet
    cacheManager.memory.setChannels(updatedChannels);
    cacheManager.disk.saveChannels(updatedChannels);

    set({
      channels: updatedChannels,
      groups: groupChannels(updatedChannels),
      activeGroupChannels: updatedChannels, // Basta tum kanallari goster
    });
  },

  setActiveGroup: (groupId) => {
    const { channels, groups } = get();

    if (!groupId) {
      // "Tumu" secildi
      set({ activeGroupId: null, activeGroupChannels: channels });
      return;
    }

    // "Favoriler" ozel grubu
    if (groupId === 'favorites') {
      const favorites = channels.filter(ch => ch.isFavorite);
      set({ activeGroupId: groupId, activeGroupChannels: favorites });
      return;
    }

    const group = groups.find(g => g.id === groupId);
    if (group) {
      set({ activeGroupId: groupId, activeGroupChannels: group.channels });
      cacheManager.memory.setActiveGroupChannels(group.channels);
    }
  },

  setCurrentChannel: (channel) => {
    const { activeGroupChannels } = get();
    const index = activeGroupChannels.findIndex(ch => ch.id === channel.id);

    // Izlenme sayisini immutable olarak artir
    const updatedChannel = {
      ...channel,
      watchCount: (channel.watchCount || 0) + 1,
      lastWatched: Date.now(),
    };

    // Son izlenen kanali cache'e kaydet
    cacheManager.disk.saveLastChannelId(updatedChannel.id);

    set({
      currentChannel: updatedChannel,
      currentChannelIndex: index >= 0 ? index : 0,
    });
  },

  toggleFavorite: (channelId) => {
    const { channels, favoriteIds, activeGroupId } = get();
    const newFavIds = new Set(favoriteIds);

    if (newFavIds.has(channelId)) {
      newFavIds.delete(channelId);
    } else {
      newFavIds.add(channelId);
    }

    // Kanallardaki isFavorite bilgisini guncelle
    const updatedChannels = channels.map(ch => ({
      ...ch,
      isFavorite: newFavIds.has(ch.id),
    }));

    // Cache'e kaydet
    cacheManager.disk.saveFavorites(Array.from(newFavIds));

    set({ channels: updatedChannels, favoriteIds: newFavIds });

    // Eger favoriler gorunuyorsa listeyi guncelle
    if (activeGroupId === 'favorites') {
      set({ activeGroupChannels: updatedChannels.filter(ch => ch.isFavorite) });
    }
  },

  switchChannelUp: () => {
    const { activeGroupChannels, currentChannelIndex } = get();
    if (currentChannelIndex > 0) {
      const newIndex = currentChannelIndex - 1;
      const channel = activeGroupChannels[newIndex];
      if (channel) {
        get().setCurrentChannel(channel);
      }
    }
  },

  switchChannelDown: () => {
    const { activeGroupChannels, currentChannelIndex } = get();
    if (currentChannelIndex < activeGroupChannels.length - 1) {
      const newIndex = currentChannelIndex + 1;
      const channel = activeGroupChannels[newIndex];
      if (channel) {
        get().setCurrentChannel(channel);
      }
    }
  },

  switchToChannelNumber: (number) => {
    const { channels } = get();
    const channel = channels.find(ch => ch.number === number);
    if (channel) {
      get().setCurrentChannel(channel);
    }
  },

  searchChannels: (query) => {
    if (!query) return [];
    const { channels } = get();
    const lowerQuery = query.toLowerCase();
    return channels.filter(ch =>
      (ch.name?.toLowerCase().includes(lowerQuery)) ||
      (ch.groupTitle?.toLowerCase().includes(lowerQuery))
    );
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  groupAlternatives: () => {
    const { channels } = get();
    const grouped = streamAlternatives.groupChannelAlternatives(channels);

    cacheManager.memory.setChannels(grouped);
    cacheManager.disk.saveChannels(grouped);

    set({
      channels: grouped,
      groups: groupChannels(grouped),
      activeGroupChannels: grouped,
    });
  },

  setAlternativeGrouping: (enabled) => {
    set({ alternativeGroupingEnabled: enabled });
  },

  addAlternative: (channelId, alternative) => {
    const { channels } = get();
    const updatedChannels = channels.map(ch => {
      if (ch.id !== channelId) return ch;
      const existing = ch.alternativeUrls || [];
      return {
        ...ch,
        alternativeUrls: [...existing, alternative],
      };
    });

    set({ channels: updatedChannels });
  },

  setPreferredAlternative: (channelId, alternativeId) => {
    const { channels, currentChannel } = get();
    const updatedChannels = channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return { ...ch, preferredAlternativeId: alternativeId };
    });

    set({ channels: updatedChannels });

    // Mevcut kanal guncellenmis ise onu da guncelle
    if (currentChannel?.id === channelId) {
      set({
        currentChannel: { ...currentChannel, preferredAlternativeId: alternativeId },
      });
    }
  },
}));
