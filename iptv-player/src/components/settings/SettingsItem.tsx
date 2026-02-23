/**
 * SettingsItem - Ayarlar ekranindaki tek satir component.
 *
 * Tipleri:
 * - navigation: Alt sayfaya yonlendirme (>)
 * - toggle: Acik/Kapali switch
 * - select: Secim listesi
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface SettingsItemProps {
  label: string;
  value?: string;
  type?: 'navigation' | 'toggle' | 'select';
  isEnabled?: boolean;
  onPress: () => void;
}

export const SettingsItem: React.FC<SettingsItemProps> = memo(({
  label,
  value,
  type = 'navigation',
  isEnabled,
  onPress,
}) => (
  <FocusableItem onPress={onPress} style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        {type === 'toggle' && (
          <View style={[styles.toggle, isEnabled && styles.toggleActive]}>
            <View style={[styles.toggleDot, isEnabled && styles.toggleDotActive]} />
          </View>
        )}
        {value && <Text style={styles.value}>{value}</Text>}
        {type === 'navigation' && <Text style={styles.arrow}>{'>'}</Text>}
      </View>
    </View>
  </FocusableItem>
));

SettingsItem.displayName = 'SettingsItem';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    ...typography.body,
    color: colors.text.secondary,
  },
  arrow: {
    ...typography.body,
    color: colors.text.muted,
    fontSize: 20,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.active,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.accent.blue,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.secondary,
  },
  toggleDotActive: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },
});
