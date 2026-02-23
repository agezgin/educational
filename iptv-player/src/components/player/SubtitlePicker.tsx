/**
 * SubtitlePicker - Altyazi secim paneli.
 *
 * Ozellikler:
 * - Stream icindeki gomulu altyazilari listeler
 * - OpenSubtitles'dan indirilebilir altyazilari gosterir
 * - Altyazi kapatma secenegi
 * - Dil bazli filtreleme
 * - "Varsayilan yap" secenegi - tercihi hatirlar
 * - Kayitli tercih yaninda pin ikonu
 */

import React, { memo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { SubtitleTrack } from '@/core/subtitle';
import { colors, typography, spacing, borderRadius } from '@/theme';
import {
  useMediaPreferencesStore,
  matchesLanguage,
  SUBTITLE_OFF,
} from '@/store/mediaPreferencesStore';

interface SubtitlePickerProps {
  visible: boolean;
  embeddedTracks: SubtitleTrack[];
  onlineTracks?: Array<{
    id: string;
    language: string;
    languageLabel: string;
    release: string;
    downloadCount: number;
  }>;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  onDownloadTrack?: (trackId: string) => void;
  onClose: () => void;
}

export const SubtitlePicker: React.FC<SubtitlePickerProps> = memo(({
  visible,
  embeddedTracks,
  onlineTracks,
  selectedTrackId,
  onSelectTrack,
  onDownloadTrack,
  onClose,
}) => {
  const {
    preferredSubtitleLang,
    setPreferredSubtitleLang,
    addSelectionHistory,
  } = useMediaPreferencesStore();
  const [showRememberHint, setShowRememberHint] = useState(false);

  if (!visible) return null;

  const handleSelect = (trackId: string | null, language?: string) => {
    onSelectTrack(trackId);
    // Gecmise kaydet
    addSelectionHistory('subtitle', language || 'off');
    onClose();
  };

  const handleSetDefault = (language: string, label: string) => {
    setPreferredSubtitleLang({ code: language, label });
    setShowRememberHint(true);
    setTimeout(() => setShowRememberHint(false), 2000);
  };

  const handleSetOffDefault = () => {
    setPreferredSubtitleLang(SUBTITLE_OFF);
    setShowRememberHint(true);
    setTimeout(() => setShowRememberHint(false), 2000);
  };

  const isPreferred = (language: string) =>
    preferredSubtitleLang && matchesLanguage(preferredSubtitleLang.code, language);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Altyazi</Text>
            {preferredSubtitleLang && (
              <Text style={styles.prefHint}>
                Varsayilan: {preferredSubtitleLang.label}
              </Text>
            )}
          </View>
          <FocusableItem onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </FocusableItem>
        </View>

        {/* Hatirla bildirimi */}
        {showRememberHint && (
          <View style={styles.rememberBanner}>
            <Text style={styles.rememberText}>
              Tercih kaydedildi! Sonraki videolarda otomatik uygulanacak.
            </Text>
          </View>
        )}

        {/* Altyazi kapat secenegi */}
        <FocusableItem
          onPress={() => handleSelect(null)}
          style={[styles.trackItem, !selectedTrackId && styles.trackItemSelected]}
          hasTVPreferredFocus={!selectedTrackId}
        >
          <View style={styles.trackContent}>
            <View style={styles.trackLeft}>
              {!selectedTrackId && <Text style={styles.checkmark}>{'>'}</Text>}
              <Text style={[styles.trackLabel, !selectedTrackId && styles.trackLabelSelected]}>
                Altyazi Kapali
              </Text>
            </View>
            <View style={styles.trackActions}>
              {preferredSubtitleLang?.code === 'off' && (
                <Text style={styles.pinIcon}>📌</Text>
              )}
              <FocusableItem
                onPress={handleSetOffDefault}
                style={styles.defaultButton}
              >
                <Text style={styles.defaultButtonText}>Varsayilan Yap</Text>
              </FocusableItem>
            </View>
          </View>
        </FocusableItem>

        {/* Gomulu altyazilar */}
        {embeddedTracks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Gomulu Altyazilar</Text>
            {embeddedTracks.map(track => {
              const isSelected = track.id === selectedTrackId;
              const isPref = isPreferred(track.language);
              return (
                <FocusableItem
                  key={track.id}
                  onPress={() => handleSelect(track.id, track.language)}
                  style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                >
                  <View style={styles.trackContent}>
                    <View style={styles.trackLeft}>
                      {isSelected && <Text style={styles.checkmark}>{'>'}</Text>}
                      <View>
                        <View style={styles.trackLabelRow}>
                          <Text style={[styles.trackLabel, isSelected && styles.trackLabelSelected]}>
                            {track.languageLabel}
                          </Text>
                          {isPref && <Text style={styles.pinIcon}>📌</Text>}
                        </View>
                        <Text style={styles.trackMeta}>
                          {track.format.toUpperCase()} - {track.cues.length} satir
                        </Text>
                      </View>
                    </View>
                    <FocusableItem
                      onPress={() => handleSetDefault(track.language, track.languageLabel)}
                      style={[styles.defaultButton, isPref && styles.defaultButtonActive]}
                    >
                      <Text style={[styles.defaultButtonText, isPref && styles.defaultButtonTextActive]}>
                        {isPref ? 'Varsayilan' : 'Varsayilan Yap'}
                      </Text>
                    </FocusableItem>
                  </View>
                </FocusableItem>
              );
            })}
          </>
        )}

        {/* Online altyazilar (OpenSubtitles) */}
        {onlineTracks && onlineTracks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Indirilebilir Altyazilar</Text>
            {onlineTracks.slice(0, 10).map(track => (
              <FocusableItem
                key={track.id}
                onPress={() => onDownloadTrack?.(track.id)}
                style={styles.trackItem}
              >
                <View style={styles.trackContent}>
                  <View>
                    <Text style={styles.trackLabel}>{track.languageLabel}</Text>
                    <Text style={styles.trackMeta}>
                      {track.release}
                    </Text>
                  </View>
                  <View style={styles.downloadBadge}>
                    <Text style={styles.downloadText}>Indir</Text>
                  </View>
                </View>
              </FocusableItem>
            ))}
          </>
        )}
      </View>
    </View>
  );
});

SubtitlePicker.displayName = 'SubtitlePicker';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  panel: {
    width: 420,
    maxHeight: '85%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: colors.background.card,
  },
  closeText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.muted,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trackItem: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  trackItemSelected: {
    backgroundColor: colors.accent.blue + '22',
    borderWidth: 1,
    borderColor: colors.accent.blue,
  },
  prefHint: {
    ...typography.caption,
    color: colors.accent.blue,
    marginTop: 2,
  },
  rememberBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  rememberText: {
    ...typography.caption,
    color: colors.accent.blue,
    textAlign: 'center',
  },
  trackContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  trackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmark: {
    ...typography.h3,
    color: colors.accent.blue,
    marginRight: spacing.md,
  },
  trackLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  trackLabelSelected: {
    color: colors.accent.blue,
    fontWeight: '600',
  },
  trackMeta: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  pinIcon: {
    fontSize: 12,
  },
  defaultButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0,
  },
  defaultButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  defaultButtonText: {
    ...typography.tiny,
    color: colors.text.muted,
    fontWeight: '500',
  },
  defaultButtonTextActive: {
    color: colors.accent.blue,
  },
  downloadBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent.green,
  },
  downloadText: {
    ...typography.tiny,
    color: colors.white,
    fontWeight: '600',
  },
});
