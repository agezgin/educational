/**
 * AudioTrackPicker - Ses dili secim paneli.
 *
 * Player uzerinde acilan modal/overlay:
 * - Mevcut ses kanallarini listeler
 * - Secili kanal vurgulanir
 * - Codec ve kanal bilgisi gosterilir
 * - Kumanda ile hizli secim
 * - "Varsayilan yap" secenegi - tercihi hatirlar
 * - Kayitli tercih yaninda pin ikonu
 */

import React, { memo, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { AudioTrack, getTrackDescription } from '@/core/audio';
import { colors, typography, spacing, borderRadius } from '@/theme';
import {
  useMediaPreferencesStore,
  matchesLanguage,
} from '@/store/mediaPreferencesStore';

interface AudioTrackPickerProps {
  visible: boolean;
  tracks: AudioTrack[];
  selectedTrackId: number;
  onSelectTrack: (trackId: number) => void;
  onClose: () => void;
}

export const AudioTrackPicker: React.FC<AudioTrackPickerProps> = memo(({
  visible,
  tracks,
  selectedTrackId,
  onSelectTrack,
  onClose,
}) => {
  const {
    preferredAudioLang,
    setPreferredAudioLang,
    addSelectionHistory,
  } = useMediaPreferencesStore();
  const [showRememberHint, setShowRememberHint] = useState(false);

  if (!visible || tracks.length === 0) return null;

  const handleSelect = (track: AudioTrack) => {
    onSelectTrack(track.id);
    addSelectionHistory('audio', track.language);
    onClose();
  };

  const handleSetDefault = (language: string, label: string) => {
    setPreferredAudioLang({ code: language, label });
    setShowRememberHint(true);
    setTimeout(() => setShowRememberHint(false), 2000);
  };

  const isPreferred = (language: string) =>
    preferredAudioLang && matchesLanguage(preferredAudioLang.code, language);

  const renderTrack = ({ item }: { item: AudioTrack }) => {
    const isSelected = item.id === selectedTrackId;
    const description = getTrackDescription(item);
    const isPref = isPreferred(item.language);

    return (
      <FocusableItem
        onPress={() => handleSelect(item)}
        style={[styles.trackItem, isSelected && styles.trackItemSelected]}
        hasTVPreferredFocus={isSelected}
      >
        <View style={styles.trackContent}>
          <View style={styles.trackLeft}>
            {isSelected && <Text style={styles.checkmark}>{'>'}</Text>}
            <View style={styles.trackInfo}>
              <View style={styles.trackLabelRow}>
                <Text style={[styles.trackLabel, isSelected && styles.trackLabelSelected]}>
                  {item.languageLabel}
                </Text>
                {isPref && <Text style={styles.pinIcon}>📌</Text>}
              </View>
              <Text style={styles.trackDescription}>{description}</Text>
            </View>
          </View>
          <View style={styles.trackActions}>
            {item.isDefault && !isPref && (
              <Text style={styles.streamDefaultBadge}>Kaynak</Text>
            )}
            <FocusableItem
              onPress={() => handleSetDefault(item.language, item.languageLabel)}
              style={[styles.defaultButton, isPref && styles.defaultButtonActive]}
            >
              <Text style={[styles.defaultButtonText, isPref && styles.defaultButtonTextActive]}>
                {isPref ? 'Varsayilan' : 'Varsayilan Yap'}
              </Text>
            </FocusableItem>
          </View>
        </View>
      </FocusableItem>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ses Dili</Text>
            {preferredAudioLang && (
              <Text style={styles.prefHint}>
                Varsayilan: {preferredAudioLang.label}
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

        {/* Track listesi */}
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={item => String(item.id)}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
});

AudioTrackPicker.displayName = 'AudioTrackPicker';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  panel: {
    width: 400,
    maxHeight: '80%',
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
    gap: spacing.md,
    flex: 1,
  },
  trackInfo: {
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
    width: 20,
  },
  trackLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  trackLabelSelected: {
    color: colors.accent.blue,
    fontWeight: '600',
  },
  trackDescription: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  pinIcon: {
    fontSize: 12,
  },
  streamDefaultBadge: {
    ...typography.tiny,
    color: colors.text.muted,
    backgroundColor: colors.background.active,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
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
});
