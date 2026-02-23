/**
 * VODControls - Film/Dizi player kontrolleri.
 *
 * Live TV'den farkli olarak:
 * - Oynat/Duraklat butonu
 * - Ileri/geri sarma (10sn / 30sn)
 * - Zaman cubugu (seekable)
 * - Kaldigi yerden devam gostergesi
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FocusableItem, ProgressBar } from '@/components/common';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface VODControlsProps {
  visible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  title: string;
  subtitle?: string;
  onPlayPause: () => void;
  onSeekBackward: (seconds?: number) => void;
  onSeekForward: (seconds?: number) => void;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const VODControls: React.FC<VODControlsProps> = memo(({
  visible,
  isPlaying,
  currentTime,
  duration,
  title,
  subtitle,
  onPlayPause,
  onSeekBackward,
  onSeekForward,
  onBack,
}) => {
  if (!visible) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Ust: Baslik */}
      <View style={styles.header}>
        <FocusableItem onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Geri</Text>
        </FocusableItem>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
      </View>

      {/* Alt: Kontroller */}
      <View style={styles.controls}>
        {/* Progress bar */}
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
          <ProgressBar progress={progress} height={6} style={styles.progressBar} />
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>

        {/* Butonlar */}
        <View style={styles.buttonRow}>
          <FocusableItem onPress={() => onSeekBackward(10)} style={styles.controlButton}>
            <Text style={styles.controlText}>-10s</Text>
          </FocusableItem>

          <FocusableItem
            onPress={onPlayPause}
            style={styles.playButton}
            hasTVPreferredFocus
          >
            <Text style={styles.playText}>{isPlaying ? 'II' : '>'}</Text>
          </FocusableItem>

          <FocusableItem onPress={() => onSeekForward(10)} style={styles.controlButton}>
            <Text style={styles.controlText}>+10s</Text>
          </FocusableItem>
        </View>
      </View>
    </View>
  );
});

VODControls.displayName = 'VODControls';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.overlay,
    justifyContent: 'space-between',
    padding: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.lg,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  backText: {
    ...typography.body,
    color: colors.text.primary,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  controls: {
    marginBottom: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  timeText: {
    ...typography.caption,
    color: colors.text.secondary,
    minWidth: 60,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  controlButton: {
    width: 70,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  controlText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
  playButton: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    backgroundColor: colors.accent.blue,
  },
  playText: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
  },
});
