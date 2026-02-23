/**
 * MoviesScreen - Film Listesi
 *
 * Netflix tarzı poster grid gorünumu.
 * Sol: Kategori sidebar (Aksiyon, Komedi, Dram, vb.)
 * Sag: Film posterleri grid
 */

import React, { useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FocusableItem } from '@/components/common';
import { useVODStore } from '@/store/vodStore';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { Movie, RootStackParamList } from '@/types';

type MoviesNav = NativeStackNavigationProp<RootStackParamList, 'Movies'>;

const POSTER_WIDTH = 160;
const POSTER_HEIGHT = 240;
const NUM_COLUMNS = 5;

export const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesNav>();
  const { activeMovies, movieGroups, activeMovieGroupId, setActiveMovieGroup } = useVODStore();

  const handleMoviePress = useCallback((movie: Movie) => {
    navigation.navigate('MovieDetail', { movieId: movie.id });
  }, [navigation]);

  const renderMovie = useCallback(({ item }: { item: Movie }) => (
    <FocusableItem
      onPress={() => handleMoviePress(item)}
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
      <Text style={styles.movieTitle} numberOfLines={1}>{item.name}</Text>
      {item.rating && (
        <Text style={styles.movieRating}>* {item.rating.toFixed(1)}</Text>
      )}
      {item.watchProgress && item.watchProgress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressFill, { width: `${Math.min((item.watchProgress / (item.duration || 1)) * 100, 100)}%` }]} />
        </View>
      )}
    </FocusableItem>
  ), [handleMoviePress]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Geri</Text>
        </FocusableItem>
        <Text style={styles.title}>Filmler</Text>
        <FocusableItem
          onPress={() => navigation.navigate('Search', { contentType: 'movie' })}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Ara</Text>
        </FocusableItem>
      </View>

      {/* Kategori filtresi */}
      <View style={styles.categories}>
        <FocusableItem
          onPress={() => setActiveMovieGroup(null)}
          style={[styles.categoryChip, !activeMovieGroupId && styles.categoryChipActive]}
        >
          <Text style={styles.categoryText}>Tumu</Text>
        </FocusableItem>
        <FocusableItem
          onPress={() => setActiveMovieGroup('favorites')}
          style={[styles.categoryChip, activeMovieGroupId === 'favorites' && styles.categoryChipActive]}
        >
          <Text style={styles.categoryText}>Favoriler</Text>
        </FocusableItem>
        {movieGroups.map(group => (
          <FocusableItem
            key={group.id}
            onPress={() => setActiveMovieGroup(group.id)}
            style={[styles.categoryChip, activeMovieGroupId === group.id && styles.categoryChipActive]}
          >
            <Text style={styles.categoryText}>{group.name}</Text>
          </FocusableItem>
        ))}
      </View>

      {/* Film grid */}
      <FlatList
        data={activeMovies}
        renderItem={renderMovie}
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
  movieTitle: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  movieRating: {
    ...typography.tiny,
    color: colors.accent.amber,
  },
  progressContainer: {
    height: 3,
    backgroundColor: colors.progress.track,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.status.danger,
    borderRadius: 2,
  },
});
