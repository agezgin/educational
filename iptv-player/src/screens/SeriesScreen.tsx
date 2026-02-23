/**
 * SeriesScreen - Dizi Listesi + Detay
 *
 * Liste gorunumu: Poster grid (Netflix tarzi)
 * Detay gorunumu: Sezon/Bolum listesi
 */

import React, { useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FocusableItem } from '@/components/common';
import { useVODStore } from '@/store/vodStore';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { Series, RootStackParamList } from '@/types';

type SeriesNav = NativeStackNavigationProp<RootStackParamList, 'SeriesList'>;

const POSTER_WIDTH = 160;
const POSTER_HEIGHT = 240;
const NUM_COLUMNS = 5;

export const SeriesScreen: React.FC = () => {
  const navigation = useNavigation<SeriesNav>();
  const { activeSeries, seriesGroups, activeSeriesGroupId, setActiveSeriesGroup } = useVODStore();

  const handleSeriesPress = useCallback((series: Series) => {
    navigation.navigate('SeriesDetail', { seriesId: series.id });
  }, [navigation]);

  const renderSeries = useCallback(({ item }: { item: Series }) => (
    <FocusableItem
      onPress={() => handleSeriesPress(item)}
      style={styles.posterCard}
    >
      {item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterText} numberOfLines={2}>{item.name}</Text>
        </View>
      )}
      <Text style={styles.seriesTitle} numberOfLines={1}>{item.name}</Text>
      <View style={styles.meta}>
        {item.year && <Text style={styles.metaText}>{item.year}</Text>}
        {item.rating && <Text style={styles.ratingText}>* {item.rating.toFixed(1)}</Text>}
        {item.seasons.length > 0 && (
          <Text style={styles.metaText}>{item.seasons.length} Sezon</Text>
        )}
      </View>
    </FocusableItem>
  ), [handleSeriesPress]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Geri</Text>
        </FocusableItem>
        <Text style={styles.title}>Diziler</Text>
        <FocusableItem
          onPress={() => navigation.navigate('Search', { contentType: 'series' })}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Ara</Text>
        </FocusableItem>
      </View>

      {/* Kategori filtresi */}
      <View style={styles.categories}>
        <FocusableItem
          onPress={() => setActiveSeriesGroup(null)}
          style={[styles.categoryChip, !activeSeriesGroupId && styles.categoryChipActive]}
        >
          <Text style={styles.categoryText}>Tumu</Text>
        </FocusableItem>
        <FocusableItem
          onPress={() => setActiveSeriesGroup('favorites')}
          style={[styles.categoryChip, activeSeriesGroupId === 'favorites' && styles.categoryChipActive]}
        >
          <Text style={styles.categoryText}>Favoriler</Text>
        </FocusableItem>
        {seriesGroups.map(group => (
          <FocusableItem
            key={group.id}
            onPress={() => setActiveSeriesGroup(group.id)}
            style={[styles.categoryChip, activeSeriesGroupId === group.id && styles.categoryChipActive]}
          >
            <Text style={styles.categoryText}>{group.name}</Text>
          </FocusableItem>
        ))}
      </View>

      {/* Dizi grid */}
      <FlatList
        data={activeSeries}
        renderItem={renderSeries}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
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
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  backText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.card,
    borderWidth: 0,
  },
  categoryChipActive: {
    backgroundColor: colors.accent.blue,
  },
  categoryText: {
    ...typography.caption,
    color: colors.text.primary,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  posterCard: {
    width: POSTER_WIDTH,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: borderRadius.md,
  },
  posterPlaceholder: {
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  posterText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  seriesTitle: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.tiny,
    color: colors.text.muted,
  },
  ratingText: {
    ...typography.tiny,
    color: colors.accent.amber,
  },
});
