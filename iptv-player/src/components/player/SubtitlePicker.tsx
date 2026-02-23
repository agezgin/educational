/**
 * SubtitlePicker - Altyazi secim paneli.
 *
 * Ozellikler:
 * - Stream icindeki gomulu altyazilari listeler
 * - OpenSubtitles'dan indirilebilir altyazilari gosterir
 * - Altyazi kapatma secenegi
 * - Dil bazli filtreleme
 */

import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { SubtitleTrack } from '@/core/subtitle';
import { colors, typography, spacing, borderRadius } from '@/theme';

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
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Altyazi</Text>
          <FocusableItem onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </FocusableItem>
        </View>

        {/* Altyazi kapat secenegi */}
        <FocusableItem
          onPress={() => { onSelectTrack(null); onClose(); }}
          style={[styles.trackItem, !selectedTrackId && styles.trackItemSelected]}
          hasTVPreferredFocus={!selectedTrackId}
        >
          <View style={styles.trackContent}>
            {!selectedTrackId && <Text style={styles.checkmark}>{'>'}</Text>}
            <Text style={[styles.trackLabel, !selectedTrackId && styles.trackLabelSelected]}>
              Altyazi Kapali
            </Text>
          </View>
        </FocusableItem>

        {/* Gomulu altyazilar */}
        {embeddedTracks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Gomulu Altyazilar</Text>
            {embeddedTracks.map(track => {
              const isSelected = track.id === selectedTrackId;
              return (
                <FocusableItem
                  key={track.id}
                  onPress={() => { onSelectTrack(track.id); onClose(); }}
                  style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                >
                  <View style={styles.trackContent}>
                    {isSelected && <Text style={styles.checkmark}>{'>'}</Text>}
                    <View>
                      <Text style={[styles.trackLabel, isSelected && styles.trackLabelSelected]}>
                        {track.languageLabel}
                      </Text>
                      <Text style={styles.trackMeta}>
                        {track.format.toUpperCase()} - {track.cues.length} satir
                      </Text>
                    </View>
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
  trackContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
