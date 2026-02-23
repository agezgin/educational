/**
 * EPGGrid - Program rehberi grid gorunumu.
 *
 * TiviMate benzeri grid tabanli EPG.
 * Yatay eksen: Zaman dilimleri (saatler)
 * Dikey eksen: Kanallar
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { colors, typography, spacing, borderRadius, EPG_ROW_HEIGHT, EPG_HOUR_WIDTH } from '@/theme';
import { Channel, EPGProgram } from '@/types';

interface EPGGridProps {
  channels: Channel[];
  epgData: Record<string, EPGProgram[]>;
  /** Baslangic saati (timestamp) */
  startTime: number;
  /** Gosterilecek saat sayisi */
  hoursToShow?: number;
  onProgramPress?: (program: EPGProgram, channel: Channel) => void;
  onChannelPress?: (channel: Channel) => void;
}

/** Zaman dilimi headerlari olusturur */
function generateTimeSlots(startTime: number, hours: number): { label: string; timestamp: number }[] {
  const slots = [];
  for (let i = 0; i < hours; i++) {
    const ts = startTime + i * 3600000;
    const date = new Date(ts);
    slots.push({
      label: `${String(date.getHours()).padStart(2, '0')}:00`,
      timestamp: ts,
    });
  }
  return slots;
}

/** Program genisligini hesaplar (sure bazli) */
function getProgramWidth(program: EPGProgram, startTime: number): number {
  const visibleStart = Math.max(program.startTime, startTime);
  const duration = program.endTime - visibleStart;
  const hourFraction = duration / 3600000;
  return Math.max(hourFraction * EPG_HOUR_WIDTH, 60); // min 60px
}

/** Program offset hesaplar */
function getProgramOffset(program: EPGProgram, startTime: number): number {
  const offset = Math.max(program.startTime - startTime, 0);
  const hourFraction = offset / 3600000;
  return hourFraction * EPG_HOUR_WIDTH;
}

export const EPGGrid: React.FC<EPGGridProps> = memo(({
  channels,
  epgData,
  startTime,
  hoursToShow = 4,
  onProgramPress,
  onChannelPress,
}) => {
  const timeSlots = useMemo(
    () => generateTimeSlots(startTime, hoursToShow),
    [startTime, hoursToShow]
  );

  const endTime = startTime + hoursToShow * 3600000;
  const totalWidth = hoursToShow * EPG_HOUR_WIDTH;

  const renderChannelRow = useCallback(({ item: channel }: { item: Channel }) => {
    const programs = (epgData[channel.id] || []).filter(
      p => p.endTime > startTime && p.startTime < endTime
    );

    const now = Date.now();

    return (
      <View style={styles.row}>
        {/* Kanal ismi (sabit sol kolon) */}
        <FocusableItem
          onPress={() => onChannelPress?.(channel)}
          style={styles.channelCell}
        >
          <Text style={styles.channelName} numberOfLines={2}>
            {channel.name}
          </Text>
        </FocusableItem>

        {/* Programlar (scroll edilir) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: totalWidth }}
        >
          <View style={[styles.programsRow, { width: totalWidth }]}>
            {programs.map(program => {
              const width = getProgramWidth(program, startTime);
              const left = getProgramOffset(program, startTime);
              const isLive = now >= program.startTime && now < program.endTime;

              return (
                <FocusableItem
                  key={program.id}
                  onPress={() => onProgramPress?.(program, channel)}
                  style={[
                    styles.programCell,
                    { width, position: 'absolute', left },
                    isLive && styles.liveProgram,
                  ]}
                >
                  <Text
                    style={[styles.programTitle, isLive && styles.liveProgramText]}
                    numberOfLines={1}
                  >
                    {program.title}
                  </Text>
                </FocusableItem>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }, [epgData, startTime, endTime, totalWidth, onProgramPress, onChannelPress]);

  return (
    <View style={styles.container}>
      {/* Zaman headerlari */}
      <View style={styles.timeHeader}>
        <View style={styles.channelCell}>
          <Text style={styles.headerText}>Kanal</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.timeSlotsRow, { width: totalWidth }]}>
            {timeSlots.map(slot => (
              <View key={slot.timestamp} style={[styles.timeSlot, { width: EPG_HOUR_WIDTH }]}>
                <Text style={styles.timeSlotText}>{slot.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Kanal satirlari */}
      <FlatList
        data={channels}
        renderItem={renderChannelRow}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </View>
  );
});

EPGGrid.displayName = 'EPGGrid';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  timeHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
    height: 40,
  },
  headerText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  timeSlotsRow: {
    flexDirection: 'row',
  },
  timeSlot: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.background.card,
  },
  timeSlotText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  row: {
    flexDirection: 'row',
    height: EPG_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  channelCell: {
    width: 130,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: 0,
    borderWidth: 0,
  },
  channelName: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  programsRow: {
    position: 'relative',
    height: '100%',
  },
  programCell: {
    height: EPG_ROW_HEIGHT - 4,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginHorizontal: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.card,
  },
  liveProgram: {
    backgroundColor: colors.accent.blue + '33', // %20 opacity
    borderColor: colors.accent.blue,
  },
  programTitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  liveProgramText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});
