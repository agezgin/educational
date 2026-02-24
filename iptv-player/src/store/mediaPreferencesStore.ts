/**
 * Media Preferences Store - Altyazi / Ses Dili Tercih Yonetimi
 *
 * Kullanicinin altyazi ve ses dili tercihlerini hatirlar:
 * - Tercih edilen altyazi dili (veya 'off')
 * - Tercih edilen ses dili
 * - Altyazi gorunum ayarlari (boyut, renk, arka plan)
 * - Icerik bazli override (bu film/dizi icin farkli secim)
 * - Ilk kez sorma mekanizmasi (preference yoksa prompt goster)
 * - Otomatik uygulama (yeni video acildiginda)
 *
 * Persist: Tum tercihler cihazda kalici saklanir.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, STORE_NAMES } from './persistStorage';

// ─── Types ──────────────────────────────────────────────

export type SubtitleSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SubtitlePosition = 'bottom' | 'top';

export interface SubtitleStyle {
  fontSize: SubtitleSize;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0-1
  position: SubtitlePosition;
  /** Altyazi kenarligi (okunurluk icin) */
  strokeEnabled: boolean;
}

/** Dil tercihi */
export interface LanguagePreference {
  /** ISO 639 dil kodu (tur, eng, ger, vb.) veya 'off' (altyazi icin) */
  code: string;
  /** Okunabilir etiket */
  label: string;
}

/** Icerige ozel override */
export interface ContentOverride {
  contentId: string;
  subtitleTrackId?: string | null;
  audioTrackId?: number;
  /** Override zamani */
  timestamp: number;
}

/** Secim gecmisi kaydı */
export interface SelectionHistoryEntry {
  languageCode: string;
  type: 'subtitle' | 'audio';
  timestamp: number;
}

// ─── Desteklenen Diller ─────────────────────────────────

export const SUPPORTED_LANGUAGES: LanguagePreference[] = [
  { code: 'tur', label: 'Turkce' },
  { code: 'eng', label: 'Ingilizce' },
  { code: 'ger', label: 'Almanca' },
  { code: 'fre', label: 'Fransizca' },
  { code: 'spa', label: 'Ispanyolca' },
  { code: 'ita', label: 'Italyanca' },
  { code: 'por', label: 'Portekizce' },
  { code: 'rus', label: 'Rusca' },
  { code: 'ara', label: 'Arapca' },
  { code: 'jpn', label: 'Japonca' },
  { code: 'kor', label: 'Korece' },
  { code: 'chi', label: 'Cince' },
];

/** Altyazi icin ek secenek */
export const SUBTITLE_OFF: LanguagePreference = { code: 'off', label: 'Kapali' };

// ─── Default Style ──────────────────────────────────────

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 'medium',
  fontColor: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.6,
  position: 'bottom',
  strokeEnabled: true,
};

// ─── Store ──────────────────────────────────────────────

interface MediaPreferencesState {
  // ── Tercihler ──
  preferredSubtitleLang: LanguagePreference | null;
  preferredAudioLang: LanguagePreference | null;
  subtitleStyle: SubtitleStyle;

  // ── Flags ──
  hasAskedSubtitlePref: boolean;
  hasAskedAudioPref: boolean;
  autoApply: boolean;
  showSelectionToast: boolean;

  // ── Icerik bazli override ──
  contentOverrides: ContentOverride[];

  // ── Gecmis (en sik secilen dili ogrenmek icin) ──
  selectionHistory: SelectionHistoryEntry[];

  // ── Actions ──
  setPreferredSubtitleLang: (lang: LanguagePreference | null) => void;
  setPreferredAudioLang: (lang: LanguagePreference | null) => void;
  setSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  setHasAskedSubtitlePref: (asked: boolean) => void;
  setHasAskedAudioPref: (asked: boolean) => void;
  setAutoApply: (enabled: boolean) => void;
  setShowSelectionToast: (enabled: boolean) => void;

  setContentOverride: (contentId: string, subtitle?: string | null, audio?: number) => void;
  clearContentOverride: (contentId: string) => void;
  getContentOverride: (contentId: string) => ContentOverride | undefined;

  addSelectionHistory: (type: 'subtitle' | 'audio', languageCode: string) => void;
  getMostUsedLanguage: (type: 'subtitle' | 'audio') => string | null;

  resetPreferences: () => void;
}

export const useMediaPreferencesStore = create<MediaPreferencesState>()(
  persist(
    (set, get) => ({
      // Defaults
      preferredSubtitleLang: null,
      preferredAudioLang: null,
      subtitleStyle: DEFAULT_SUBTITLE_STYLE,
      hasAskedSubtitlePref: false,
      hasAskedAudioPref: false,
      autoApply: true,
      showSelectionToast: true,
      contentOverrides: [],
      selectionHistory: [],

      // ── Tercih ayarlari ──

      setPreferredSubtitleLang: (lang) => {
        set({ preferredSubtitleLang: lang, hasAskedSubtitlePref: true });
      },

      setPreferredAudioLang: (lang) => {
        set({ preferredAudioLang: lang, hasAskedAudioPref: true });
      },

      setSubtitleStyle: (partial) => {
        const current = get().subtitleStyle;
        set({ subtitleStyle: { ...current, ...partial } });
      },

      setHasAskedSubtitlePref: (asked) => set({ hasAskedSubtitlePref: asked }),
      setHasAskedAudioPref: (asked) => set({ hasAskedAudioPref: asked }),
      setAutoApply: (enabled) => set({ autoApply: enabled }),
      setShowSelectionToast: (enabled) => set({ showSelectionToast: enabled }),

      // ── Icerik bazli override ──

      setContentOverride: (contentId, subtitle, audio) => {
        const filtered = get().contentOverrides.filter(o => o.contentId !== contentId);
        const newOverride: ContentOverride = {
          contentId,
          subtitleTrackId: subtitle,
          audioTrackId: audio,
          timestamp: Date.now(),
        };
        // Son 200 override tut (eski olanlari temizle)
        const trimmed = [...filtered, newOverride].slice(-200);
        set({ contentOverrides: trimmed });
      },

      clearContentOverride: (contentId) => {
        set({ contentOverrides: get().contentOverrides.filter(o => o.contentId !== contentId) });
      },

      getContentOverride: (contentId) => {
        return get().contentOverrides.find(o => o.contentId === contentId);
      },

      // ── Secim gecmisi ──

      addSelectionHistory: (type, languageCode) => {
        const entry: SelectionHistoryEntry = { type, languageCode, timestamp: Date.now() };
        const updated = [...get().selectionHistory, entry];
        // Son 500 kayit tut
        const trimmed = updated.slice(-500);
        set({ selectionHistory: trimmed });
      },

      getMostUsedLanguage: (type) => {
        const history = get().selectionHistory.filter(h => h.type === type);
        if (history.length === 0) return null;

        // Son 30 gundeki secimler (daha guncel tercih)
        const recentCutoff = Date.now() - 30 * 86400000;
        const recent = history.filter(h => h.timestamp > recentCutoff);
        const target = recent.length >= 3 ? recent : history;

        // Frekans say
        const freq: Record<string, number> = {};
        for (const entry of target) {
          freq[entry.languageCode] = (freq[entry.languageCode] || 0) + 1;
        }

        // En cok secileni bul
        let maxCode: string | null = null;
        let maxCount = 0;
        for (const [code, count] of Object.entries(freq)) {
          if (count > maxCount) {
            maxCount = count;
            maxCode = code;
          }
        }
        return maxCode;
      },

      // ── Reset ──

      resetPreferences: () => {
        set({
          preferredSubtitleLang: null,
          preferredAudioLang: null,
          subtitleStyle: DEFAULT_SUBTITLE_STYLE,
          hasAskedSubtitlePref: false,
          hasAskedAudioPref: false,
          autoApply: true,
          showSelectionToast: true,
          contentOverrides: [],
          selectionHistory: [],
        });
      },
    }),
    {
      name: STORE_NAMES.MEDIA_PREFERENCES,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        preferredSubtitleLang: state.preferredSubtitleLang,
        preferredAudioLang: state.preferredAudioLang,
        subtitleStyle: state.subtitleStyle,
        hasAskedSubtitlePref: state.hasAskedSubtitlePref,
        hasAskedAudioPref: state.hasAskedAudioPref,
        autoApply: state.autoApply,
        showSelectionToast: state.showSelectionToast,
        contentOverrides: state.contentOverrides,
        selectionHistory: state.selectionHistory,
      }),
    },
  ),
);

// ─── Helper: Dil kodu eslestirme ────────────────────────

const SHORT_TO_LONG: Record<string, string> = {
  tr: 'tur', en: 'eng', de: 'ger', fr: 'fre',
  es: 'spa', it: 'ita', pt: 'por', ru: 'rus',
  ar: 'ara', ja: 'jpn', ko: 'kor', zh: 'chi',
};

export function normalizeLanguageCode(code: string): string {
  if (!code) return '';
  const lower = code.toLowerCase().trim();
  return SHORT_TO_LONG[lower] || lower;
}

export function matchesLanguage(code1: string, code2: string): boolean {
  if (!code1 || !code2) return false;
  return normalizeLanguageCode(code1) === normalizeLanguageCode(code2);
}

export function findBestSubtitleTrack(
  tracks: Array<{ id: string; language: string }>,
  contentId?: string,
): { trackId: string | null; reason: 'override' | 'preference' | 'learned' | 'none' } {
  const store = useMediaPreferencesStore.getState();

  if (contentId) {
    const override = store.getContentOverride(contentId);
    if (override && override.subtitleTrackId !== undefined) {
      return { trackId: override.subtitleTrackId, reason: 'override' };
    }
  }

  if (store.preferredSubtitleLang) {
    if (store.preferredSubtitleLang.code === 'off') {
      return { trackId: null, reason: 'preference' };
    }
    const match = tracks.find(t =>
      matchesLanguage(t.language, store.preferredSubtitleLang!.code),
    );
    if (match) return { trackId: match.id, reason: 'preference' };
  }

  const learned = store.getMostUsedLanguage('subtitle');
  if (learned) {
    if (learned === 'off') return { trackId: null, reason: 'learned' };
    const match = tracks.find(t => matchesLanguage(t.language, learned));
    if (match) return { trackId: match.id, reason: 'learned' };
  }

  return { trackId: null, reason: 'none' };
}

export function findBestAudioTrack(
  tracks: Array<{ id: number; language: string }>,
  contentId?: string,
): { trackId: number | null; reason: 'override' | 'preference' | 'learned' | 'none' } {
  const store = useMediaPreferencesStore.getState();

  if (contentId) {
    const override = store.getContentOverride(contentId);
    if (override?.audioTrackId !== undefined) {
      return { trackId: override.audioTrackId, reason: 'override' };
    }
  }

  if (store.preferredAudioLang) {
    const match = tracks.find(t =>
      matchesLanguage(t.language, store.preferredAudioLang!.code),
    );
    if (match) return { trackId: match.id, reason: 'preference' };
  }

  const learned = store.getMostUsedLanguage('audio');
  if (learned) {
    const match = tracks.find(t => matchesLanguage(t.language, learned));
    if (match) return { trackId: match.id, reason: 'learned' };
  }

  return { trackId: null, reason: 'none' };
}

export function getLanguageLabelTR(code: string): string {
  const normalized = normalizeLanguageCode(code);
  const found = SUPPORTED_LANGUAGES.find(l => l.code === normalized);
  return found?.label || code;
}
