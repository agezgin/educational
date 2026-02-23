/**
 * Playback Speed Picker
 *
 * Oynatma hizi kontrolu:
 * - 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 3x
 * - Tek tusla cycle (1x -> 1.25x -> 1.5x -> 2x -> 1x)
 * - OSD'de mevcut hiz gostergesi
 * - Ses pitch correction (hizda ses bozulmasin)
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/theme/colors';

// ─── Types ──────────────────────────────────────────────

interface PlaybackSpeedPickerProps {
  visible: boolean;
  currentSpeed: number;
  onSelectSpeed: (speed: number) => void;
  onClose: () => void;
}

// ─── Speed Options ──────────────────────────────────────

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x', description: 'Çok yavaş' },
  { value: 0.5, label: '0.5x', description: 'Yavaş' },
  { value: 0.75, label: '0.75x', description: 'Biraz yavaş' },
  { value: 1.0, label: '1x', description: 'Normal' },
  { value: 1.25, label: '1.25x', description: 'Biraz hızlı' },
  { value: 1.5, label: '1.5x', description: 'Hızlı' },
  { value: 1.75, label: '1.75x', description: 'Daha hızlı' },
  { value: 2.0, label: '2x', description: 'Çok hızlı' },
  { value: 3.0, label: '3x', description: 'Maksimum' },
];

/** Hizli degistirme icin cycle siralamasi */
const QUICK_CYCLE_SPEEDS = [1.0, 1.25, 1.5, 2.0];

// ─── Component ──────────────────────────────────────────

export const PlaybackSpeedPicker: React.FC<PlaybackSpeedPickerProps> = memo(({
  visible,
  currentSpeed,
  onSelectSpeed,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Oynatma Hızı</Text>

        <View style={styles.speedGrid}>
          {SPEED_OPTIONS.map((option) => {
            const isSelected = Math.abs(currentSpeed - option.value) < 0.01;
            const isNormal = option.value === 1.0;

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.speedOption,
                  isSelected && styles.speedOptionSelected,
                  isNormal && !isSelected && styles.speedOptionNormal,
                ]}
                onPress={() => {
                  onSelectSpeed(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.speedLabel,
                  isSelected && styles.speedLabelSelected,
                  isNormal && !isSelected && styles.speedLabelNormal,
                ]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Text style={styles.speedCheck}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hizli bilgi */}
        <Text style={styles.hint}>
          Kumandada uzun basarak hızlıca değiştirebilirsiniz
        </Text>
      </View>
    </View>
  );
});

PlaybackSpeedPicker.displayName = 'PlaybackSpeedPicker';

// ─── Utility Functions ──────────────────────────────────

/**
 * Mevcut hizdan sonraki hiza cycle et.
 * 1x -> 1.25x -> 1.5x -> 2x -> 1x
 */
export function cyclePlaybackSpeed(current: number): number {
  const currentIndex = QUICK_CYCLE_SPEEDS.findIndex(
    (s) => Math.abs(s - current) < 0.01,
  );

  if (currentIndex === -1) {
    // Cycle listesinde degilse 1x'e don
    return 1.0;
  }

  return QUICK_CYCLE_SPEEDS[(currentIndex + 1) % QUICK_CYCLE_SPEEDS.length];
}

/**
 * Hiz badge metni (OSD'de gosterilir).
 * Normal hizda gosterme, diger hizlarda goster.
 */
export function getSpeedBadgeLabel(speed: number): string | null {
  if (Math.abs(speed - 1.0) < 0.01) return null; // Normal hizda badge yok
  return `${speed}x`;
}

/**
 * Ses pitch duzeltme degeri.
 * Hiz arttikca ses incelmesini onler.
 */
export function getAudioPitchCorrection(speed: number): number {
  // 1.0 = normal pitch, hiz ne olursa olsun pitch 1.0 kalir
  // Bu deger player engine'e gonderilir
  return 1.0;
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -180 }],
    zIndex: 100,
  },
  panel: {
    backgroundColor: 'rgba(22, 27, 34, 0.95)',
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  speedGrid: {
    gap: 3,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  speedOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  speedOptionNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  speedLabel: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  speedLabelSelected: {
    color: colors.accent.blue,
    fontWeight: '700',
  },
  speedLabelNormal: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  speedCheck: {
    color: colors.accent.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: colors.text.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
