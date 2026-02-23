/**
 * ChannelItem - Kanal listesindeki tek kanal ogesi.
 *
 * Tasarim (dokumandan):
 * +-------------------------------------+
 * | CANLI   TRT 1 HD                     |
 * |  +---------+  Su an: Ana Haber       |
 * |  |  LOGO   |  20:00 - 21:00         |
 * |  |  TRT 1  |  Sonra: Spor Bulteni   |
 * |  +---------+                         |
 * |  =============================== %75 |
 * +-------------------------------------+
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FocusableItem, ProgressBar, LiveBadge } from '@/components/common';
import { colors, typography, spacing, borderRadius, CHANNEL_ITEM_HEIGHT } from '@/theme';
import { Channel, EPGProgram } from '@/types';
import { getProgramProgress } from '@/core/epg';

interface ChannelItemProps {
  channel: Channel;
  currentProgram?: EPGProgram;
  nextProgram?: EPGProgram;
  onPress: (channel: Channel) => void;
  onLongPress?: (channel: Channel) => void;
  isCurrent?: boolean;
  hasTVPreferredFocus?: boolean;
}

export const ChannelItem: React.FC<ChannelItemProps> = memo(({
  channel,
  currentProgram,
  nextProgram,
  onPress,
  isCurrent = false,
  hasTVPreferredFocus = false,
}) => {
  const handlePress = useCallback(() => onPress(channel), [channel, onPress]);

  const progress = currentProgram ? getProgramProgress(currentProgram) : 0;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <FocusableItem
      onPress={handlePress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.container, isCurrent && styles.currentContainer]}
    >
      <View style={styles.content}>
        {/* Sol: Logo */}
        <View style={styles.logoContainer}>
          {channel.logoUrl ? (
            <Image
              source={{ uri: channel.logoUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>
                {channel.name.substring(0, 3).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Sag: Bilgiler */}
        <View style={styles.info}>
          <View style={styles.header}>
            {currentProgram?.isLive && <LiveBadge />}
            <Text style={styles.channelName} numberOfLines={1}>
              {channel.name}
            </Text>
            {channel.isFavorite && (
              <Text style={styles.favoriteStar}>*</Text>
            )}
          </View>

          {currentProgram ? (
            <>
              <Text style={styles.programTitle} numberOfLines={1}>
                Su an: {currentProgram.title}
              </Text>
              <Text style={styles.programTime}>
                {formatTime(currentProgram.startTime)} - {formatTime(currentProgram.endTime)}
              </Text>
              {nextProgram && (
                <Text style={styles.nextProgram} numberOfLines={1}>
                  Sonra: {nextProgram.title}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.programTitle} numberOfLines={1}>
              {channel.groupTitle}
            </Text>
          )}

          {/* Progress bar */}
          {currentProgram && (
            <ProgressBar progress={progress} style={styles.progressBar} />
          )}
        </View>
      </View>
    </FocusableItem>
  );
});

ChannelItem.displayName = 'ChannelItem';

const styles = StyleSheet.create({
  container: {
    height: CHANNEL_ITEM_HEIGHT,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  currentContainer: {
    borderColor: colors.accent.green,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  logoContainer: {
    width: 70,
    height: 70,
    marginRight: spacing.md,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  channelName: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  favoriteStar: {
    color: colors.accent.amber,
    fontSize: 18,
  },
  programTitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  programTime: {
    ...typography.caption,
    color: colors.text.muted,
  },
  nextProgram: {
    ...typography.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  progressBar: {
    marginTop: spacing.xs,
  },
});
