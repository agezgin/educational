/**
 * SubtitleOverlay - Video uzerinde altyazi gosterimi.
 *
 * Ozellikler:
 * - Alt ortada konumlanma (TV standardi)
 * - Okunabilir font (beyaz metin, siyah golge)
 * - Birden fazla satir destegi
 * - Boyut ayarlanabilir
 * - Arka plan opacity ayarlanabilir
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SubtitleCue, getActiveCue } from '@/core/subtitle';
import { colors, spacing } from '@/theme';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTimeMs: number;
  fontSize?: number;
  /** Altyazi arka plan opakligi (0-1) */
  backgroundOpacity?: number;
  /** Alttan mesafe */
  bottomOffset?: number;
  visible?: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = memo(({
  cues,
  currentTimeMs,
  fontSize = 22,
  backgroundOpacity = 0.7,
  bottomOffset = 60,
  visible = true,
}) => {
  const activeCue = useMemo(
    () => getActiveCue(cues, currentTimeMs),
    [cues, currentTimeMs]
  );

  if (!visible || !activeCue) return null;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <View style={[
        styles.background,
        { backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})` },
      ]}>
        <Text style={[styles.text, { fontSize }]}>
          {activeCue.text}
        </Text>
      </View>
    </View>
  );
});

SubtitleOverlay.displayName = 'SubtitleOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  background: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    maxWidth: '80%',
  },
  text: {
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    lineHeight: 30,
  },
});
