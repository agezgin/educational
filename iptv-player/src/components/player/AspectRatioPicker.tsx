/**
 * Aspect Ratio Picker
 *
 * Ekran orani secimi:
 * - Auto (orijinal)
 * - 16:9 (genis ekran)
 * - 4:3 (klasik)
 * - Fill (ekrani doldur - crop)
 * - Fit (letterbox - tam goster)
 *
 * Tek tusla degistirme (cycle) veya
 * menu ile secim.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/theme/colors';
import { AspectRatio } from '@/core/player/engines';

// ─── Types ──────────────────────────────────────────────

interface AspectRatioPickerProps {
  visible: boolean;
  currentRatio: AspectRatio;
  onSelect: (ratio: AspectRatio) => void;
  onClose: () => void;
}

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  description: string;
  icon: string;
}

// ─── Options ────────────────────────────────────────────

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    value: 'auto',
    label: 'Otomatik',
    description: 'Orijinal oranı koru',
    icon: '🔄',
  },
  {
    value: '16:9',
    label: '16:9',
    description: 'Geniş ekran (standart)',
    icon: '📺',
  },
  {
    value: '4:3',
    label: '4:3',
    description: 'Klasik TV formatı',
    icon: '📟',
  },
  {
    value: 'fill',
    label: 'Doldur',
    description: 'Ekranı doldur (kırpılabilir)',
    icon: '⬜',
  },
  {
    value: 'fit',
    label: 'Sığdır',
    description: 'Tamamını göster (letterbox)',
    icon: '🖼',
  },
];

// ─── Component ──────────────────────────────────────────

export function AspectRatioPicker({
  visible,
  currentRatio,
  onSelect,
  onClose,
}: AspectRatioPickerProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Ekran Oranı</Text>

        {ASPECT_RATIO_OPTIONS.map((option) => {
          const isSelected = currentRatio === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Aspect ratio degerini cycle eder (tek tusla degistirme).
 * Auto -> 16:9 -> 4:3 -> Fill -> Fit -> Auto
 */
export function cycleAspectRatio(current: AspectRatio): AspectRatio {
  const order: AspectRatio[] = ['auto', '16:9', '4:3', 'fill', 'fit'];
  const currentIndex = order.indexOf(current);
  return order[(currentIndex + 1) % order.length];
}

/**
 * Aspect ratio kisaltma metni (OSD'de gosterilir).
 */
export function getAspectRatioLabel(ratio: AspectRatio): string {
  const labels: Record<AspectRatio, string> = {
    'auto': 'OTO',
    '16:9': '16:9',
    '4:3': '4:3',
    'fill': 'DOLDUR',
    'fit': 'SIĞDIR',
  };
  return labels[ratio];
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -150 }],
    zIndex: 100,
  },
  panel: {
    backgroundColor: 'rgba(22, 27, 34, 0.95)',
    borderRadius: 16,
    padding: 16,
    minWidth: 240,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  optionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: colors.accent.blue,
    fontWeight: '700',
  },
  optionDescription: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  checkmark: {
    color: colors.accent.blue,
    fontSize: 18,
    fontWeight: '700',
  },
});
