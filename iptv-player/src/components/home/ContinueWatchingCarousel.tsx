/**
 * Continue Watching Carousel
 *
 * Netflix tarzinda "Kaldığın Yerden Devam Et" karuzeli:
 * - Yarim kalan filmler/diziler
 * - Ilerleme cizgisi (mavi progress bar)
 * - Poster + baslik + ilerleme yuzdesi
 * - TV D-Pad ile yatay navigasyon
 * - Tek tus ile devam etme
 * - Uzun basinca listeden kaldir
 *
 * Home ekraninin en ustunde gosterilir.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '@/theme/colors';
import { WatchHistory } from '@/services/recommendations';

// ─── Types ──────────────────────────────────────────────

interface ContinueWatchingProps {
  items: WatchHistory[];
  onItemPress: (item: WatchHistory) => void;
  onItemRemove?: (item: WatchHistory) => void;
}

// ─── Component ──────────────────────────────────────────

export function ContinueWatchingCarousel({
  items,
  onItemPress,
  onItemRemove,
}: ContinueWatchingProps) {
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');

  // Poster boyutu
  const ITEM_WIDTH = 185;
  const ITEM_HEIGHT = 120;
  const ITEM_SPACING = 14;

  const renderItem = useCallback(({ item, index }: { item: WatchHistory; index: number }) => {
    const progressPercent = Math.min(item.progress, 100);
    const remainingMinutes = item.duration
      ? Math.round(((100 - item.progress) / 100) * item.duration / 60)
      : 0;

    return (
      <TouchableOpacity
        key={item.contentId}
        style={[
          styles.card,
          { width: ITEM_WIDTH, marginRight: ITEM_SPACING },
          index === 0 && { marginLeft: 24 },
        ]}
        onPress={() => onItemPress(item)}
        onLongPress={() => onItemRemove?.(item)}
        activeOpacity={0.8}
      >
        {/* Poster / Thumbnail */}
        <View style={[styles.thumbnail, { height: ITEM_HEIGHT }]}>
          {/* Gradient overlay */}
          <View style={styles.thumbnailOverlay} />

          {/* Icerik tipi ikonu */}
          <View style={styles.typeIndicator}>
            <Text style={styles.typeIcon}>
              {item.contentType === 'movie' ? '🎬' : '📺'}
            </Text>
          </View>

          {/* Kalan sure */}
          {remainingMinutes > 0 && (
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingText}>{remainingMinutes} dk kaldı</Text>
            </View>
          )}

          {/* Oynat ikonu */}
          <View style={styles.playIcon}>
            <Text style={styles.playIconText}>▶</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>

        {/* Baslik */}
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>

        {/* Alt bilgi */}
        {item.contentType === 'series' && item.seasonNumber && (
          <Text style={styles.subtitle}>
            S{item.seasonNumber}:B{item.episodeNumber}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [onItemPress, onItemRemove, ITEM_WIDTH, ITEM_SPACING, ITEM_HEIGHT]);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Baslik */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Kaldığın Yerden Devam Et</Text>
        <Text style={styles.itemCount}>{items.length} içerik</Text>
      </View>

      {/* Yatay karusel */}
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.contentId}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingRight: 24 }}
      />
    </View>
  );
}

// ─── Recommendation Carousel ────────────────────────────

interface RecommendationCarouselProps {
  title: string;
  items: Array<{
    contentId: string;
    contentType: string;
    title: string;
    posterUrl?: string;
    score?: number;
  }>;
  onItemPress: (item: any) => void;
}

/**
 * Genel oneri karuzeli.
 * "Senin İçin", "Benzer Filmler", tur bazli bolumler icin kullanilir.
 */
export function RecommendationCarousel({
  title,
  items,
  onItemPress,
}: RecommendationCarouselProps) {
  const POSTER_WIDTH = 130;
  const POSTER_HEIGHT = 195;
  const SPACING = 12;

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.posterCard,
        { width: POSTER_WIDTH, marginRight: SPACING },
        index === 0 && { marginLeft: 24 },
      ]}
      onPress={() => onItemPress(item)}
      activeOpacity={0.8}
    >
      {/* Poster */}
      <View style={[styles.poster, { width: POSTER_WIDTH, height: POSTER_HEIGHT }]}>
        {/* Skor badge */}
        {item.score && item.score > 70 && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.score}%</Text>
          </View>
        )}

        {/* Tip ikonu */}
        <View style={styles.posterTypeIcon}>
          <Text style={{ fontSize: 12 }}>
            {item.contentType === 'movie' ? '🎬' : '📺'}
          </Text>
        </View>
      </View>

      {/* Baslik */}
      <Text style={styles.posterTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  ), [onItemPress, POSTER_WIDTH, POSTER_HEIGHT, SPACING]);

  if (items.length === 0) return null;

  return (
    <View style={styles.carouselSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.contentId}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={POSTER_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingRight: 24 }}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  itemCount: {
    color: colors.text.muted,
    fontSize: 13,
  },

  // Continue Watching Card
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  thumbnail: {
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  typeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  typeIcon: {
    fontSize: 14,
  },
  remainingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  remainingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 2,
  },

  // Progress Bar
  progressTrack: {
    height: 3,
    backgroundColor: '#30363D',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.blue,
    borderRadius: 1.5,
  },

  // Title
  title: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  // Recommendation Carousel
  carouselSection: {
    marginBottom: 28,
  },
  posterCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  poster: {
    borderRadius: 12,
    backgroundColor: '#21262D',
    position: 'relative',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  posterTypeIcon: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterTitle: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});
