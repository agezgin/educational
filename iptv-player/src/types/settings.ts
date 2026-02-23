/**
 * Uygulama ayarlari type tanimlari.
 */

export type ThemeMode = 'dark' | 'light' | 'amoled';
export type AccentColor = 'blue' | 'red' | 'green' | 'orange';
export type FontSize = 'normal' | 'large';
export type ListStyle = 'list' | 'grid';
export type Language = 'tr' | 'en' | 'de';

export interface AppSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  listStyle: ListStyle;
  language: Language;
  parentalPin?: string;
  lockedCategories: string[];
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  bufferDuration: 2 | 5 | 10;
  hardwareDecoding: boolean;
  osdTimeout: 3 | 5 | 10;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'blue',
  fontSize: 'normal',
  listStyle: 'list',
  language: 'tr',
  lockedCategories: [],
  defaultQuality: 'auto',
  bufferDuration: 2,
  hardwareDecoding: true,
  osdTimeout: 5,
};
