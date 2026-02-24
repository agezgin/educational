/**
 * Settings Store - Uygulama ayarlari state yonetimi
 */

import { create } from 'zustand';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ThemeMode,
  AccentColor,
  FontSize,
  ListStyle,
  Language,
  ScreensaverStyle,
  ScreensaverTimeout,
} from '@/types';
import { cacheManager } from '@/core/cache';

interface SettingsState extends AppSettings {
  /** Ilk acilis mi? (Hosgeldin ekrani gostermek icin) */
  isFirstLaunch: boolean;
  /** Playlist URL'i ekli mi? */
  hasPlaylist: boolean;

  // Actions
  loadSettings: () => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setListStyle: (style: ListStyle) => void;
  setLanguage: (lang: Language) => void;
  setParentalPin: (pin: string | undefined) => void;
  toggleLockedCategory: (category: string) => void;
  setDefaultQuality: (quality: AppSettings['defaultQuality']) => void;
  setBufferDuration: (duration: AppSettings['bufferDuration']) => void;
  setHardwareDecoding: (enabled: boolean) => void;
  setOsdTimeout: (timeout: AppSettings['osdTimeout']) => void;
  setScreensaverStyle: (style: ScreensaverStyle) => void;
  setScreensaverTimeout: (timeout: ScreensaverTimeout) => void;
  setFirstLaunch: (isFirst: boolean) => void;
  setHasPlaylist: (has: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isFirstLaunch: true,
  hasPlaylist: false,

  loadSettings: () => {
    const cached = cacheManager.disk.loadSettings();
    if (cached) {
      set({ ...cached, isFirstLaunch: false });
    }
  },

  setTheme: (theme) => {
    set({ theme });
    saveSettings(get());
  },

  setAccentColor: (accentColor) => {
    set({ accentColor });
    saveSettings(get());
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    saveSettings(get());
  },

  setListStyle: (listStyle) => {
    set({ listStyle });
    saveSettings(get());
  },

  setLanguage: (language) => {
    set({ language });
    saveSettings(get());
  },

  setParentalPin: (parentalPin) => {
    set({ parentalPin });
    saveSettings(get());
  },

  toggleLockedCategory: (category) => {
    const { lockedCategories } = get();
    const newLocked = lockedCategories.includes(category)
      ? lockedCategories.filter(c => c !== category)
      : [...lockedCategories, category];
    set({ lockedCategories: newLocked });
    saveSettings(get());
  },

  setDefaultQuality: (defaultQuality) => {
    set({ defaultQuality });
    saveSettings(get());
  },

  setBufferDuration: (bufferDuration) => {
    set({ bufferDuration });
    saveSettings(get());
  },

  setHardwareDecoding: (hardwareDecoding) => {
    set({ hardwareDecoding });
    saveSettings(get());
  },

  setOsdTimeout: (osdTimeout) => {
    set({ osdTimeout });
    saveSettings(get());
  },

  setScreensaverStyle: (screensaverStyle) => {
    set({ screensaverStyle });
    saveSettings(get());
  },

  setScreensaverTimeout: (screensaverTimeout) => {
    set({ screensaverTimeout });
    saveSettings(get());
  },

  setFirstLaunch: (isFirstLaunch) => set({ isFirstLaunch }),
  setHasPlaylist: (hasPlaylist) => set({ hasPlaylist }),
}));

function saveSettings(state: SettingsState): void {
  const settings: AppSettings = {
    theme: state.theme,
    accentColor: state.accentColor,
    fontSize: state.fontSize,
    listStyle: state.listStyle,
    language: state.language,
    parentalPin: state.parentalPin,
    lockedCategories: state.lockedCategories,
    defaultQuality: state.defaultQuality,
    bufferDuration: state.bufferDuration,
    hardwareDecoding: state.hardwareDecoding,
    osdTimeout: state.osdTimeout,
    screensaverStyle: state.screensaverStyle,
    screensaverTimeout: state.screensaverTimeout,
  };
  cacheManager.disk.saveSettings(settings);
}
