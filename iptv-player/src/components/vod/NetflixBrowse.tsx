/**
 * NetflixBrowse - Netflix/HBO Max Tarzi Icerik Gozatma
 *
 * IPTV'nin duz kategori listesi yerine:
 * - Hero banner (tam ekran backdrop, baslik, puan, 2 buton)
 * - Yatay poster satirlari (her biri kendi kategorisi)
 * - Kaldigi yerden devam satiri (backdrop kartlar + progress bar)
 * - Platform filtresi (Netflix, TOD, Disney+ chip'leri)
 * - Smooth D-Pad navigasyon (satirlar arasi + satir ici)
 *
 * Performans:
 * - FlatList ile lazy render
 * - windowSize=3 (gorunen + 1 ust + 1 alt satir)
 * - Image caching (posterler onceden yuklenir)
 */

import React, { useState, useCallback, useRef, memo, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';
import type { CatalogRow, CatalogItem, PlatformInfo } from '@/services/catalogTransformer';

// ─── Types ──────────────────────────────────────────────

interface NetflixBrowseProps {
  rows: CatalogRow[];
  platforms?: PlatformInfo[];
  onItemPress: (item: CatalogItem) => void;
  onPlayPress?: (item: CatalogItem) => void;
  onAddToList?: (item: CatalogItem) => void;
  onLikePress?: (item: CatalogItem) => void;
  /** Aktif platform filtresi */
  activePlatform?: string | null;
  onPlatformFilter?: (platform: string | null) => void;
  /** "Daha Sonra Izle" listesindeki ID'ler */
  watchlistIds?: Set<string>;
  /** Begenilen icerik ID'leri */
  likedIds?: Set<string>;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POSTER_WIDTH = 150;
const POSTER_HEIGHT = 225;
const BACKDROP_WIDTH = 260;
const BACKDROP_HEIGHT = 146;

// ─── Hero Banner ────────────────────────────────────────

const HeroBanner: React.FC<{
  items: CatalogItem[];
  onItemPress: (item: CatalogItem) => void;
  onPlayPress?: (item: CatalogItem) => void;
  onAddToList?: (item: CatalogItem) => void;
  isInWatchlist?: boolean;
}> = memo(({ items, onItemPress, onPlayPress, onAddToList, isInWatchlist }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Items degistiginde index'i sifirla
  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  const item = items[activeIndex] || items[0];
  if (!item) return null;

  return (
    <View style={styles.heroContainer}>
      {/* Backdrop gorsel */}
      {(item.backdropUrl || item.posterUrl) && (
        <Image
          source={{ uri: item.backdropUrl || item.posterUrl }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      )}
      {/* Gradient overlay */}
      <View style={styles.heroGradient} />

      {/* Icerik bilgisi */}
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle} numberOfLines={2}>{item.name}</Text>
        <View style={styles.heroMeta}>
          {item.year && <Text style={styles.heroYear}>{item.year}</Text>}
          {item.rating && (
            <View style={styles.heroRatingBadge}>
              <Text style={styles.heroRating}>★ {item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.genre && <Text style={styles.heroGenre}>{item.genre}</Text>}
          {item.platform && (
            <View style={styles.heroPlatformBadge}>
              <Text style={styles.heroPlatformText}>{item.platform}</Text>
            </View>
          )}
        </View>

        {/* Butonlar */}
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroPlayButton}
            onPress={() => onPlayPress?.(item)}
          >
            <Text style={styles.heroPlayText}>▶  Izle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroInfoButton}
            onPress={() => onItemPress(item)}
          >
            <Text style={styles.heroInfoText}>ℹ  Detay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroListButton, isInWatchlist && styles.heroListButtonActive]}
            onPress={() => onAddToList?.(item)}
          >
            <Text style={styles.heroListText}>
              {isInWatchlist ? '✓  Listemde' : '+  Listeye Ekle'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sayfa indicator'lari */}
      {items.length > 1 && (
        <View style={styles.heroDots}>
          {items.map((heroItem, i) => (
            <TouchableOpacity
              key={heroItem.id}
              style={[styles.heroDot, i === activeIndex && styles.heroDotActive]}
              onPress={() => setActiveIndex(i)}
            />
          ))}
        </View>
      )}
    </View>
  );
});
HeroBanner.displayName = 'HeroBanner';

// ─── Poster Card ────────────────────────────────────────

const PosterCard: React.FC<{
  item: CatalogItem;
  onPress: () => void;
  onLongPress?: () => void;
  isInWatchlist?: boolean;
  isLiked?: boolean;
  style?: 'poster' | 'backdrop';
}> = memo(({ item, onPress, onLongPress, isInWatchlist, isLiked, style = 'poster' }) => {
  const isPoster = style === 'poster';
  const cardWidth = isPoster ? POSTER_WIDTH : BACKDROP_WIDTH;
  const cardHeight = isPoster ? POSTER_HEIGHT : BACKDROP_HEIGHT;
  const imageUrl = isPoster ? item.posterUrl : (item.backdropUrl || item.posterUrl);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Gorsel */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: cardWidth, height: cardHeight, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardPlaceholder, { width: cardWidth, height: cardHeight }]}>
          <Text style={styles.cardPlaceholderText} numberOfLines={2}>{item.name}</Text>
        </View>
      )}

      {/* Progress bar (devam et icin) */}
      {item.progress !== undefined && item.progress > 0 && (
        <View style={styles.cardProgressTrack}>
          <View style={[styles.cardProgressFill, { width: `${Math.min(item.progress * 100, 100)}%` }]} />
        </View>
      )}

      {/* Platform badge */}
      {item.platform && (
        <View style={styles.cardPlatformBadge}>
          <Text style={styles.cardPlatformText}>{item.platform}</Text>
        </View>
      )}

      {/* Watchlist / Like badges */}
      {isInWatchlist && (
        <View style={styles.cardWatchlistBadge}>
          <Text style={styles.cardBadgeIcon}>🕐</Text>
        </View>
      )}

      {/* Rating badge */}
      {item.rating && item.rating > 0 && (
        <View style={styles.cardRatingBadge}>
          <Text style={styles.cardRatingText}>★ {item.rating.toFixed(1)}</Text>
        </View>
      )}

      {/* Baslik */}
      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>

      {/* Meta */}
      <View style={styles.cardMeta}>
        {item.year && <Text style={styles.cardMetaText}>{item.year}</Text>}
        {item.genre && <Text style={styles.cardMetaText} numberOfLines={1}>{item.genre}</Text>}
      </View>
    </TouchableOpacity>
  );
});
PosterCard.displayName = 'PosterCard';

// ─── Content Row ────────────────────────────────────────

const ContentRow: React.FC<{
  row: CatalogRow;
  onItemPress: (item: CatalogItem) => void;
  onLongPress?: (item: CatalogItem) => void;
  watchlistIds?: Set<string>;
  likedIds?: Set<string>;
}> = memo(({ row, onItemPress, onLongPress, watchlistIds, likedIds }) => {
  return (
    <View style={styles.rowContainer}>
      {/* Satir basligi */}
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        {row.subtitle && <Text style={styles.rowSubtitle}>{row.subtitle}</Text>}
        {row.items.length > 10 && (
          <Text style={styles.rowSeeAll}>Tumunu Gor ›</Text>
        )}
      </View>

      {/* Yatay kart listesi */}
      <FlatList
        horizontal
        data={row.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            onPress={() => onItemPress(item)}
            onLongPress={() => onLongPress?.(item)}
            isInWatchlist={watchlistIds?.has(item.id)}
            isLiked={likedIds?.has(item.id)}
            style={row.style === 'backdrop' ? 'backdrop' : 'poster'}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowList}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={3}
      />
    </View>
  );
});
ContentRow.displayName = 'ContentRow';

// ─── Platform Filter Bar ────────────────────────────────

const PlatformFilterBar: React.FC<{
  platforms: PlatformInfo[];
  active: string | null;
  onSelect: (platform: string | null) => void;
}> = memo(({ platforms, active, onSelect }) => {
  if (platforms.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.platformBar}
      contentContainerStyle={styles.platformBarContent}
    >
      <TouchableOpacity
        style={[styles.platformChip, !active && styles.platformChipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.platformChipText, !active && styles.platformChipTextActive]}>
          Tumu
        </Text>
      </TouchableOpacity>

      {platforms.map(platform => (
        <TouchableOpacity
          key={platform.name}
          style={[
            styles.platformChip,
            active === platform.name && styles.platformChipActive,
            active === platform.name && { borderColor: platform.color },
          ]}
          onPress={() => onSelect(platform.name === active ? null : platform.name)}
        >
          <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
            <Text style={styles.platformIconText}>{platform.icon}</Text>
          </View>
          <Text style={[
            styles.platformChipText,
            active === platform.name && styles.platformChipTextActive,
          ]}>
            {platform.name}
          </Text>
          <Text style={styles.platformCount}>{platform.contentCount}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});
PlatformFilterBar.displayName = 'PlatformFilterBar';

// ─── Main Component ─────────────────────────────────────

export const NetflixBrowse: React.FC<NetflixBrowseProps> = memo(({
  rows,
  platforms,
  onItemPress,
  onPlayPress,
  onAddToList,
  onLikePress,
  activePlatform,
  onPlatformFilter,
  watchlistIds,
  likedIds,
}) => {
  // Hero row'u ayir
  const heroRow = useMemo(() => rows.find(r => r.type === 'hero'), [rows]);
  const contentRows = useMemo(() => rows.filter(r => r.type !== 'hero'), [rows]);

  // Platform filtresine gore satirlari filtrele
  const filteredRows = useMemo(() =>
    activePlatform
      ? contentRows.filter(r =>
          r.type === 'platform' ? r.title.includes(activePlatform) :
          r.type === 'continue_watching' || r.type === 'favorites' ||
          r.items.some(i => i.platform === activePlatform),
        )
      : contentRows,
    [contentRows, activePlatform],
  );

  const renderRow = useCallback(({ item: row }: { item: CatalogRow }) => (
    <ContentRow
      row={row}
      onItemPress={onItemPress}
      onLongPress={onAddToList}
      watchlistIds={watchlistIds}
      likedIds={likedIds}
    />
  ), [onItemPress, onAddToList, watchlistIds, likedIds]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRows}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        ListHeaderComponent={
          <>
            {/* Hero Banner */}
            {heroRow && (
              <HeroBanner
                items={heroRow.items}
                onItemPress={onItemPress}
                onPlayPress={onPlayPress}
                onAddToList={onAddToList}
                isInWatchlist={heroRow.items[0] && watchlistIds?.has(heroRow.items[0].id)}
              />
            )}

            {/* Platform filtresi */}
            {platforms && platforms.length > 0 && onPlatformFilter && (
              <PlatformFilterBar
                platforms={platforms}
                active={activePlatform || null}
                onSelect={onPlatformFilter}
              />
            )}
          </>
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews
      />
    </View>
  );
});

NetflixBrowse.displayName = 'NetflixBrowse';

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Hero
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulated gradient with multiple overlays
    borderBottomWidth: 0,
    shadowColor: colors.background.primary,
    shadowOffset: { width: 0, height: 80 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 48,
    right: 48,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  heroYear: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  heroRatingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroRating: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  heroGenre: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  heroPlatformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroPlatformText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  heroPlayButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 6,
  },
  heroPlayText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  heroInfoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroInfoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroListButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroListButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  heroListText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  heroDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },

  // Content Row
  rowContainer: {
    marginBottom: 24,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 48,
    marginBottom: 12,
    gap: 8,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: colors.text.muted,
    fontSize: 13,
  },
  rowSeeAll: {
    color: colors.accent.blue,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  rowList: {
    paddingHorizontal: 48,
    gap: 12,
  },

  // Card
  card: {
    position: 'relative',
  },
  cardPlaceholder: {
    backgroundColor: '#161B22',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  cardPlaceholderText: {
    color: colors.text.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  cardProgressTrack: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  cardPlatformBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardPlatformText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardWatchlistBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  cardBadgeIcon: {
    fontSize: 14,
  },
  cardRatingBadge: {
    position: 'absolute',
    bottom: 50,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardRatingText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  cardMetaText: {
    color: colors.text.muted,
    fontSize: 11,
  },

  // Platform filter
  platformBar: {
    marginVertical: 16,
  },
  platformBarContent: {
    paddingHorizontal: 48,
    gap: 10,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 8,
  },
  platformChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: colors.accent.blue,
  },
  platformChipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  platformChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  platformIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformIconText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  platformCount: {
    color: colors.text.muted,
    fontSize: 11,
  },
});
