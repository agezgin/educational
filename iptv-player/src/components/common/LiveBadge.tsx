/**
 * LiveBadge - CANLI yayin gostergesi.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme';

export const LiveBadge: React.FC = () => (
  <View style={styles.badge}>
    <View style={styles.dot} />
    <Text style={styles.text}>CANLI</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.live,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  text: {
    ...typography.tiny,
    color: colors.white,
    fontWeight: '700',
  },
});
