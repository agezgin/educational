/**
 * SmartTrackSelector - Akilli Altyazi/Ses Dili Secici
 *
 * Video acildiginda otomatik olarak:
 * 1. Kayitli tercih varsa -> otomatik uygula + kisa toast goster
 * 2. Tercih yoksa (ilk kez) -> guzel bir prompt ile sor
 * 3. "Bu secimi hatirla" secenegi
 *
 * Ayrica:
 * - Hizli degistirme paneli (D-Pad ile kolay erisim)
 * - Mevcut secimi gosterir
 * - Icerige ozel override destegi
 */

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme';
import {
  useMediaPreferencesStore,
  SUPPORTED_LANGUAGES,
  SUBTITLE_OFF,
  matchesLanguage,
  findBestSubtitleTrack,
  findBestAudioTrack,
  getLanguageLabelTR,
  type LanguagePreference,
} from '@/store/mediaPreferencesStore';

// ─── Types ──────────────────────────────────────────────

interface TrackInfo {
  id: string | number;
  language: string;
  label: string;
  codec?: string;
  channels?: number;
}

interface SmartTrackSelectorProps {
  /** Mevcut altyazi track'leri */
  subtitleTracks: Array<{ id: string; language: string; label: string }>;
  /** Mevcut ses track'leri */
  audioTracks: Array<{ id: number; language: string; label: string; codec?: string; channels?: number }>;
  /** Icerik ID (override icin) */
  contentId?: string;
  /** Track secildiginde */
  onSubtitleSelect: (trackId: string | null) => void;
  onAudioSelect: (trackId: number) => void;
  /** Video yuklendi mi? */
  isVideoReady: boolean;
}

// ─── Toast Component ────────────────────────────────────

const SelectionToast: React.FC<{
  message: string;
  visible: boolean;
}> = memo(({ message, visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      // 3 saniye sonra kaybol
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- animated refs stable

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
});
SelectionToast.displayName = 'SelectionToast';

// ─── First Time Prompt ──────────────────────────────────

interface FirstTimePromptProps {
  visible: boolean;
  type: 'subtitle' | 'audio';
  availableLanguages: LanguagePreference[];
  onSelect: (lang: LanguagePreference) => void;
  onSkip: () => void;
}

const FirstTimePrompt: React.FC<FirstTimePromptProps> = memo(({
  visible,
  type,
  availableLanguages,
  onSelect,
  onSkip,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  const isSubtitle = type === 'subtitle';
  const title = isSubtitle ? 'Altyazi Dili Secin' : 'Ses Dili Secin';
  const description = isSubtitle
    ? 'Tercih ettiginiz altyazi dilini secin. Sonraki videolarda otomatik uygulanacak.'
    : 'Tercih ettiginiz ses dilini secin. Sonraki videolarda otomatik uygulanacak.';
  const icon = isSubtitle ? '💬' : '🔊';

  // Altyazi icin ek "Kapali" secenegi
  const options = isSubtitle
    ? [SUBTITLE_OFF, ...availableLanguages]
    : availableLanguages;

  return (
    <Animated.View style={[styles.promptOverlay, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.promptPanel}>
        {/* Header */}
        <View style={styles.promptHeader}>
          <Text style={styles.promptIcon}>{icon}</Text>
          <Text style={styles.promptTitle}>{title}</Text>
        </View>
        <Text style={styles.promptDescription}>{description}</Text>

        {/* Dil secenekleri */}
        <ScrollView style={styles.promptOptions} showsVerticalScrollIndicator={false}>
          {options.map((lang, index) => {
            const isFocused = index === selectedIndex;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.promptOption,
                  isFocused && styles.promptOptionFocused,
                ]}
                onPress={() => onSelect(lang)}
                onFocus={() => setSelectedIndex(index)}
                hasTVPreferredFocus={index === 0}
              >
                <Text style={[
                  styles.promptOptionText,
                  isFocused && styles.promptOptionTextFocused,
                ]}>
                  {lang.label}
                </Text>
                {lang.code === 'tur' && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Onerilen</Text>
                  </View>
                )}
                {lang.code === 'off' && (
                  <Text style={styles.offIcon}>✕</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Alt bilgi */}
        <View style={styles.promptFooter}>
          <Text style={styles.promptHint}>
            Ayarlar'dan istediginiz zaman degistirebilirsiniz
          </Text>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Simdilik Gecis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});
FirstTimePrompt.displayName = 'FirstTimePrompt';

// ─── Quick Switch Bar ───────────────────────────────────

interface QuickSwitchBarProps {
  visible: boolean;
  currentSubtitle: string | null;
  currentAudio: string | null;
  isPreferenceSet: boolean;
  onSubtitlePress: () => void;
  onAudioPress: () => void;
}

export const QuickSwitchBar: React.FC<QuickSwitchBarProps> = memo(({
  visible,
  currentSubtitle,
  currentAudio,
  isPreferenceSet,
  onSubtitlePress,
  onAudioPress,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.quickBar}>
      {/* Altyazi */}
      <TouchableOpacity style={styles.quickItem} onPress={onSubtitlePress}>
        <Text style={styles.quickIcon}>💬</Text>
        <View>
          <Text style={styles.quickLabel}>Altyazi</Text>
          <Text style={styles.quickValue}>
            {currentSubtitle || 'Kapali'}
          </Text>
        </View>
        {isPreferenceSet && <Text style={styles.savedDot}>●</Text>}
      </TouchableOpacity>

      {/* Ayirici */}
      <View style={styles.quickDivider} />

      {/* Ses */}
      <TouchableOpacity style={styles.quickItem} onPress={onAudioPress}>
        <Text style={styles.quickIcon}>🔊</Text>
        <View>
          <Text style={styles.quickLabel}>Ses Dili</Text>
          <Text style={styles.quickValue}>
            {currentAudio || 'Varsayilan'}
          </Text>
        </View>
        {isPreferenceSet && <Text style={styles.savedDot}>●</Text>}
      </TouchableOpacity>
    </View>
  );
});
QuickSwitchBar.displayName = 'QuickSwitchBar';

// ─── Main Component ─────────────────────────────────────

export const SmartTrackSelector: React.FC<SmartTrackSelectorProps> = memo(({
  subtitleTracks,
  audioTracks,
  contentId,
  onSubtitleSelect,
  onAudioSelect,
  isVideoReady,
}) => {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showSubtitlePrompt, setShowSubtitlePrompt] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const hasAutoApplied = useRef(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Temizlik: component unmount olunca timeout'lari temizle
  useEffect(() => {
    return () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    };
  }, []);

  const {
    preferredSubtitleLang,
    preferredAudioLang,
    hasAskedSubtitlePref,
    hasAskedAudioPref,
    autoApply,
    showSelectionToast,
    setPreferredSubtitleLang,
    setPreferredAudioLang,
    addSelectionHistory,
  } = useMediaPreferencesStore();

  // Video hazir oldugunda otomatik secim yap
  useEffect(() => {
    if (!isVideoReady || hasAutoApplied.current) return;
    hasAutoApplied.current = true;

    // Kisa gecikme - player'in track listesini yuklemesi icin
    const timer = setTimeout(() => {
      applyPreferences();
    }, 500);

    return () => clearTimeout(timer);
  }, [isVideoReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreferences = useCallback(() => {
    const messages: string[] = [];

    // ── Altyazi ──
    if (subtitleTracks.length > 0) {
      if (autoApply && (preferredSubtitleLang || hasAskedSubtitlePref)) {
        const result = findBestSubtitleTrack(subtitleTracks, contentId);
        if (result.reason !== 'none') {
          onSubtitleSelect(result.trackId);
          if (result.trackId) {
            const track = subtitleTracks.find(t => t.id === result.trackId);
            messages.push(`Altyazi: ${track?.label || 'Secildi'}`);
          } else {
            messages.push('Altyazi: Kapali');
          }
        }
      } else if (!hasAskedSubtitlePref) {
        // Ilk kez - sor
        setShowSubtitlePrompt(true);
        return; // Ses icin altyazi cevabini bekle
      }
    }

    // ── Ses ──
    if (audioTracks.length > 1) {
      if (autoApply && (preferredAudioLang || hasAskedAudioPref)) {
        const result = findBestAudioTrack(audioTracks, contentId);
        if (result.reason !== 'none' && result.trackId !== null) {
          onAudioSelect(result.trackId);
          const track = audioTracks.find(t => t.id === result.trackId);
          messages.push(`Ses: ${track?.label || 'Secildi'}`);
        }
      } else if (!hasAskedAudioPref) {
        setShowAudioPrompt(true);
      }
    }

    // Toast goster
    if (showSelectionToast && messages.length > 0) {
      setToastMessage(messages.join('  ·  '));
      setShowToast(true);
    }
  }, [
    subtitleTracks, audioTracks, contentId, autoApply,
    preferredSubtitleLang, preferredAudioLang,
    hasAskedSubtitlePref, hasAskedAudioPref,
    showSelectionToast, onSubtitleSelect, onAudioSelect,
  ]);

  // Ilk kez altyazi secimi
  const handleSubtitlePromptSelect = useCallback((lang: LanguagePreference) => {
    setPreferredSubtitleLang(lang);
    setShowSubtitlePrompt(false);
    addSelectionHistory('subtitle', lang.code);

    // Secimi uygula
    if (lang.code === 'off') {
      onSubtitleSelect(null);
    } else {
      const match = subtitleTracks.find(t => matchesLanguage(t.language, lang.code));
      if (match) onSubtitleSelect(match.id);
    }

    // Simdi ses icin sor
    if (!hasAskedAudioPref && audioTracks.length > 1) {
      promptTimerRef.current = setTimeout(() => setShowAudioPrompt(true), 300);
    }
  }, [
    setPreferredSubtitleLang, addSelectionHistory, subtitleTracks,
    onSubtitleSelect, hasAskedAudioPref, audioTracks,
  ]);

  // Ilk kez ses secimi
  const handleAudioPromptSelect = useCallback((lang: LanguagePreference) => {
    setPreferredAudioLang(lang);
    setShowAudioPrompt(false);
    addSelectionHistory('audio', lang.code);

    const match = audioTracks.find(t => matchesLanguage(t.language, lang.code));
    if (match) onAudioSelect(match.id);
  }, [setPreferredAudioLang, addSelectionHistory, audioTracks, onAudioSelect]);

  // Prompt skip
  const handleSubtitleSkip = useCallback(() => {
    setShowSubtitlePrompt(false);
    useMediaPreferencesStore.getState().setHasAskedSubtitlePref(true);
    if (!hasAskedAudioPref && audioTracks.length > 1) {
      promptTimerRef.current = setTimeout(() => setShowAudioPrompt(true), 300);
    }
  }, [hasAskedAudioPref, audioTracks]);

  const handleAudioSkip = useCallback(() => {
    setShowAudioPrompt(false);
    useMediaPreferencesStore.getState().setHasAskedAudioPref(true);
  }, []);

  // Prompt'a gosterilecek diller: sadece mevcut track'lerde bulunanlar
  const availableSubLangs = getAvailableLanguages(subtitleTracks);
  const availableAudioLangs = getAvailableLanguages(audioTracks);

  return (
    <>
      {/* Toast bildirim */}
      <SelectionToast message={toastMessage} visible={showToast} />

      {/* Ilk kez altyazi prompt */}
      <FirstTimePrompt
        visible={showSubtitlePrompt}
        type="subtitle"
        availableLanguages={availableSubLangs}
        onSelect={handleSubtitlePromptSelect}
        onSkip={handleSubtitleSkip}
      />

      {/* Ilk kez ses prompt */}
      <FirstTimePrompt
        visible={showAudioPrompt}
        type="audio"
        availableLanguages={availableAudioLangs}
        onSelect={handleAudioPromptSelect}
        onSkip={handleAudioSkip}
      />
    </>
  );
});

SmartTrackSelector.displayName = 'SmartTrackSelector';

// ─── Helpers ────────────────────────────────────────────

function getAvailableLanguages(
  tracks: Array<{ language: string }>,
): LanguagePreference[] {
  const seen = new Set<string>();
  const result: LanguagePreference[] = [];

  for (const track of tracks) {
    const label = getLanguageLabelTR(track.language);
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ code: track.language, label });
    }
  }

  // Turkce varsa basa al
  result.sort((a, b) => {
    if (matchesLanguage(a.code, 'tur')) return -1;
    if (matchesLanguage(b.code, 'tur')) return 1;
    if (matchesLanguage(a.code, 'eng')) return -1;
    if (matchesLanguage(b.code, 'eng')) return 1;
    return a.label.localeCompare(b.label);
  });

  return result;
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // Toast
  toast: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(13, 17, 23, 0.92)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    zIndex: 500,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // First time prompt
  promptOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 380,
    zIndex: 400,
  },
  promptPanel: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 23, 0.97)',
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  promptIcon: {
    fontSize: 28,
  },
  promptTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  promptDescription: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Options
  promptOptions: {
    flex: 1,
  },
  promptOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  promptOptionFocused: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: colors.accent.blue,
  },
  promptOptionText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  promptOptionTextFocused: {
    color: colors.accent.blue,
    fontWeight: '600',
  },
  recommendedBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recommendedText: {
    color: colors.accent.blue,
    fontSize: 11,
    fontWeight: '600',
  },
  offIcon: {
    color: colors.text.muted,
    fontSize: 16,
  },

  // Footer
  promptFooter: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 16,
    gap: 12,
  },
  promptHint: {
    color: colors.text.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Quick switch bar
  quickBar: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 17, 23, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 100,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quickIcon: {
    fontSize: 16,
  },
  quickLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  savedDot: {
    color: colors.accent.blue,
    fontSize: 8,
    marginLeft: 2,
  },
  quickDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 6,
  },
});
