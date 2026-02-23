/**
 * SettingsSection - Ayarlar ekranindaki bolum baslik + icerik wrapper.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/theme';

interface SettingsSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  icon,
  children,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>
      {icon && `${icon} `}{title}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
