/**
 * Player Store - Video oynatici state yonetimi
 */

import { create } from 'zustand';
import { PlayerState, VideoQuality, OSDInfo } from '@/types';

interface PlayerStoreState {
  /** Oynatici durumu */
  state: PlayerState;
  /** Ses seviyesi (0-100) */
  volume: number;
  /** Sessiz mi? */
  isMuted: boolean;
  /** Secili kalite */
  quality: VideoQuality;
  /** OSD bilgisi */
  osd: OSDInfo;
  /** Tam ekran mi? */
  isFullscreen: boolean;
  /** Mevcut stream URL */
  streamUrl: string | null;

  // Actions
  setState: (state: PlayerState) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  volumeUp: (step?: number) => void;
  volumeDown: (step?: number) => void;
  setQuality: (quality: VideoQuality) => void;
  showOSD: () => void;
  hideOSD: () => void;
  updateOSD: (info: Partial<OSDInfo>) => void;
  setStreamUrl: (url: string | null) => void;
  setFullscreen: (fullscreen: boolean) => void;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  state: 'idle',
  volume: 85,
  isMuted: false,
  quality: 'auto',
  osd: {
    visible: false,
    channelName: '',
    volume: 85,
  },
  isFullscreen: true,
  streamUrl: null,

  setState: (state) => set({ state }),

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  volumeUp: (step = 5) => {
    const { volume } = get();
    get().setVolume(volume + step);
  },

  volumeDown: (step = 5) => {
    const { volume } = get();
    get().setVolume(volume - step);
  },

  setQuality: (quality) => set({ quality }),

  showOSD: () => set(s => ({
    osd: { ...s.osd, visible: true },
  })),

  hideOSD: () => set(s => ({
    osd: { ...s.osd, visible: false },
  })),

  updateOSD: (info) => set(s => ({
    osd: { ...s.osd, ...info },
  })),

  setStreamUrl: (url) => set({ streamUrl: url }),

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
}));
