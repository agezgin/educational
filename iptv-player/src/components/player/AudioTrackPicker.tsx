/**
 * AudioTrackPicker - Ses dili secim paneli.
 *
 * Player uzerinde acilan modal/overlay:
 * - Mevcut ses kanallarini listeler
 * - Secili kanal vurgulanir
 * - Codec ve kanal bilgisi gosterilir
 * - Kumanda ile hizli secim
 */

import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { FocusableItem } from '@/components/common';
import { AudioTrack, getTrackDescription } from '@/core/audio';
import { colors, typography, spacing, borderRadius } from '@/theme';

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
  if (!visible || tracks.length === 0) return null;

  const renderTrack = useCallback(({ item }: { item: AudioTrack }) => {
    const isSelected = item.id === selectedTrackId;
    const description = getTrackDescription(item);

    return (
      <FocusableItem
        onPress={() => {
          onSelectTrack(item.id);
          onClose();
        }}
        style={[styles.trackItem, isSelected && styles.trackItemSelected]}
        hasTVPreferredFocus={isSelected}
      >
        <View style={styles.trackContent}>
          <View style={styles.trackLeft}>
            {isSelected && <Text style={styles.checkmark}>{'>'}</Text>}
            <View>
              <Text style={[styles.trackLabel, isSelected && styles.trackLabelSelected]}>
                {item.languageLabel}
              </Text>
              <Text style={styles.trackDescription}>{description}</Text>
            </View>
          </View>
          {item.isDefault && (
            <Text style={styles.defaultBadge}>Varsayilan</Text>
          )}
        </View>
      </FocusableItem>
    );
  }, [selectedTrackId, onSelectTrack, onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ses Dili</Text>
          <FocusableItem onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </FocusableItem>
        </View>

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
  defaultBadge: {
    ...typography.tiny,
    color: colors.text.muted,
    backgroundColor: colors.background.active,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
});
