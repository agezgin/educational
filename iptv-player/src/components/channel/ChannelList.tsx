/**
 * ChannelList - Virtualized kanal listesi.
 *
 * Performans optimizasyonlari (dokumandan):
 * - FlatList ile virtualized rendering (sadece gorunenler render edilir)
 * - windowSize=5 (5 sayfa oncesi/sonrasi)
 * - maxToRenderPerBatch=10
 * - initialNumToRender=15
 * - removeClippedSubviews (gorunmeyen DOM'lari kaldir)
 * - getItemLayout (sabit yukseklik = instant scroll hesaplama)
 */

import React, { memo, useCallback, useRef } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { ChannelItem } from './ChannelItem';
import { colors, typography, spacing, CHANNEL_ITEM_HEIGHT } from '@/theme';
import { Channel, EPGProgram } from '@/types';

interface ChannelListProps {
  channels: Channel[];
  epgData?: Record<string, EPGProgram[]>;
  currentChannelId?: string;
  onChannelPress: (channel: Channel) => void;
}

const ITEM_HEIGHT = CHANNEL_ITEM_HEIGHT + spacing.sm; // item + margin

export const ChannelList: React.FC<ChannelListProps> = memo(({
  channels,
  epgData,
  currentChannelId,
  onChannelPress,
}) => {
  const listRef = useRef<FlatList>(null);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Channel) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Channel; index: number }) => {
      const programs = epgData?.[item.id];
      const now = Date.now();
      const currentProgram = programs?.find(p => now >= p.startTime && now < p.endTime);
      const nextProgram = programs?.find(p => p.startTime > now);

      return (
        <ChannelItem
          channel={item}
          currentProgram={currentProgram}
          nextProgram={nextProgram}
          onPress={onChannelPress}
          isCurrent={item.id === currentChannelId}
          hasTVPreferredFocus={index === 0}
        />
      );
    },
    [epgData, currentChannelId, onChannelPress]
  );

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Bu kategoride kanal bulunamadi</Text>
    </View>
  ), []);

  return (
    <FlatList
      ref={listRef}
      data={channels}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      windowSize={5}
      maxToRenderPerBatch={10}
      initialNumToRender={15}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.listContent}
    />
  );
});

ChannelList.displayName = 'ChannelList';

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
