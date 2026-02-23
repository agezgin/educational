/**
 * EPGScreen - Program Rehberi Ekrani
 *
 * TiviMate benzeri grid EPG.
 * Kirmizi tus: Bugun | Yesil tus: Yarin
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EPGGrid } from '@/components/epg/EPGGrid';
import { FocusableItem } from '@/components/common';
import { useChannelStore } from '@/store/channelStore';
import { colors, typography, spacing } from '@/theme';
import { Channel, EPGProgram, RootStackParamList } from '@/types';

type EPGNav = NativeStackNavigationProp<RootStackParamList, 'EPG'>;

export const EPGScreen: React.FC = () => {
  const navigation = useNavigation<EPGNav>();
  const { channels, setCurrentChannel } = useChannelStore();

  const [dayOffset, setDayOffset] = useState(0);

  // Baslangic saati: Bugun saat 00:00 + gun offset
  const startTime = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime() + dayOffset * 86400000;
  }, [dayOffset]);

  const dayLabel = useMemo(() => {
    if (dayOffset === 0) return 'Bugun';
    if (dayOffset === 1) return 'Yarin';
    const date = new Date(Date.now() + dayOffset * 86400000);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  }, [dayOffset]);

  const handleProgramPress = useCallback((program: EPGProgram, channel: Channel) => {
    if (program.isLive) {
      setCurrentChannel(channel);
      navigation.navigate('Player', { channelId: channel.id });
    }
  }, [navigation, setCurrentChannel]);

  const handleChannelPress = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    navigation.navigate('Player', { channelId: channel.id });
  }, [navigation, setCurrentChannel]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>{'<'} Geri</Text>
        </FocusableItem>

        <Text style={styles.title}>Program Rehberi</Text>

        <View style={styles.dayNav}>
          <FocusableItem
            onPress={() => setDayOffset(Math.max(0, dayOffset - 1))}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>{'<'}</Text>
          </FocusableItem>
          <Text style={styles.dayLabel}>{dayLabel}</Text>
          <FocusableItem
            onPress={() => setDayOffset(Math.min(7, dayOffset + 1))}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>{'>'}</Text>
          </FocusableItem>
        </View>
      </View>

      {/* EPG Grid */}
      <EPGGrid
        channels={channels.slice(0, 50)} // Performans icin ilk 50 kanal
        epgData={{}}
        startTime={startTime}
        hoursToShow={6}
        onProgramPress={handleProgramPress}
        onChannelPress={handleChannelPress}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{'<> Gezin'}</Text>
        <Text style={styles.footerText}>OK Izle</Text>
        <Text style={styles.footerText}>[K] Bugun</Text>
        <Text style={styles.footerText}>[Y] Yarin</Text>
        <Text style={styles.footerText}>{'<- Geri'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  headerButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayLabel: {
    ...typography.h3,
    color: colors.accent.blue,
    minWidth: 80,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.card,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
