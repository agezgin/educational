/**
 * TasteMatch - "Bunu Begendiysen" Benzer Icerik Onerisi
 *
 * Kullanici bir filmi/diziyi begendiyse:
 * - Ayni turden oneriler
 * - Ayni yonetmenin yapitlari
 * - Ayni oyuncularin diger yapitlari
 * - "Senin zevkine %87 uyumlu" skor gostergesi
 *
 * Ayrica MovieDetailScreen'de:
 * - "Bunu Begendim" butonu (kalp ikonu)
 * - "Daha Sonra Izle" butonu (saat ikonu)
 * - Izlenme durumu badge'leri:
 *   - "45 dk kaldi" (devam)
 *   - "Izlendi" (tamamlandi)
 *   - "Yarida Birakildi"
 *
 * Minimalist, guzel UI.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { colors } from '@/theme/colors';
import type { WatchProgress } from '@/store/watchlistStore';
import { getWatchStatusLabel, getWatchPercent } from '@/store/watchlistStore';

// ─── Watch Status Badge ─────────────────────────────────

export const WatchStatusBadge: React.FC<{
  progress?: WatchProgress;
  size?: 'small' | 'medium';
}> = memo(({ progress, size = 'small' }) => {
  if (!progress || progress.status === 'unwatched') return null;

  const label = getWatchStatusLabel(progress);
  const percent = getWatchPercent(progress);
  const isSmall = size === 'small';

  const badgeColor =
    progress.status === 'completed' ? '#10B981' :
    progress.status === 'watching' ? '#3B82F6' :
    '#F59E0B';

  return (
    <View style={[styles.statusBadge, isSmall && styles.statusBadgeSmall]}>
      {/* Progress ring (gorsel gosterge) */}
      {progress.status === 'watching' && (
        <View style={styles.miniProgress}>
          <View style={[styles.miniProgressFill, { width: `${percent}%` }]} />
        </View>
      )}
      {progress.status === 'completed' && (
        <Text style={[styles.statusIcon, { color: badgeColor }]}>✓</Text>
      )}
      {progress.status === 'abandoned' && (
        <Text style={[styles.statusIcon, { color: badgeColor }]}>⏸</Text>
      )}
      <Text style={[
        styles.statusText,
        isSmall && styles.statusTextSmall,
        { color: badgeColor },
      ]}>
        {label}
      </Text>
    </View>
  );
});
WatchStatusBadge.displayName = 'WatchStatusBadge';

// ─── Like Button ────────────────────────────────────────

export const LikeButton: React.FC<{
  isLiked: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}> = memo(({ isLiked, onPress, size = 'medium' }) => {
  const sizeMap = { small: 28, medium: 36, large: 44 };
  const iconSize = { small: 14, medium: 18, large: 22 };
  const dim = sizeMap[size];

  return (
    <TouchableOpacity
      style={[
        styles.likeButton,
        { width: dim, height: dim, borderRadius: dim / 2 },
        isLiked && styles.likeButtonActive,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.likeIcon,
        { fontSize: iconSize[size] },
        isLiked && styles.likeIconActive,
      ]}>
        {isLiked ? '♥' : '♡'}
      </Text>
    </TouchableOpacity>
  );
});
LikeButton.displayName = 'LikeButton';

// ─── Watchlist Button ───────────────────────────────────

export const WatchlistButton: React.FC<{
  isInWatchlist: boolean;
  onPress: () => void;
  variant?: 'icon' | 'full';
}> = memo(({ isInWatchlist, onPress, variant = 'full' }) => {
  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={[styles.watchlistIcon, isInWatchlist && styles.watchlistIconActive]}
        onPress={onPress}
      >
        <Text style={styles.watchlistIconText}>
          {isInWatchlist ? '✓' : '+'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.watchlistButton, isInWatchlist && styles.watchlistButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.watchlistButtonIcon}>
        {isInWatchlist ? '✓' : '🕐'}
      </Text>
      <Text style={[
        styles.watchlistButtonText,
        isInWatchlist && styles.watchlistButtonTextActive,
      ]}>
        {isInWatchlist ? 'Listemde' : 'Daha Sonra Izle'}
      </Text>
    </TouchableOpacity>
  );
});
WatchlistButton.displayName = 'WatchlistButton';

// ─── Taste Match Score ──────────────────────────────────

export const TasteMatchScore: React.FC<{
  score: number; // 0-100
}> = memo(({ score }) => {
  if (score <= 0) return null;

  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#F59E0B' :
    '#8B949E';

  return (
    <View style={styles.tasteScore}>
      <Text style={[styles.tasteScoreText, { color }]}>{score}% Uyumlu</Text>
    </View>
  );
});
TasteMatchScore.displayName = 'TasteMatchScore';

// ─── "Bunu Begendiysen" Section ─────────────────────────

interface SimilarItem {
  id: string;
  name: string;
  posterUrl?: string;
  type: 'movie' | 'series';
  year?: number;
  rating?: number;
  matchScore?: number;
  matchReason?: string; // "Ayni yonetmen", "Ayni tur", vb.
}

export const TasteRecommendations: React.FC<{
  title?: string;
  items: SimilarItem[];
  onItemPress: (item: SimilarItem) => void;
  onLikePress?: (item: SimilarItem) => void;
  likedIds?: Set<string>;
}> = memo(({ title = 'Bunu Begendiysen', items, onItemPress, onLikePress, likedIds }) => {
  if (items.length === 0) return null;

  return (
    <View style={styles.tasteSection}>
      <Text style={styles.tasteSectionTitle}>{title}</Text>

      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tasteCard}
            onPress={() => onItemPress(item)}
          >
            {/* Poster */}
            {item.posterUrl ? (
              <Image
                source={{ uri: item.posterUrl }}
                style={styles.tastePoster}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.tastePoster, styles.tastePosterPlaceholder]}>
                <Text style={styles.tastePlaceholderText}>{item.name.charAt(0)}</Text>
              </View>
            )}

            {/* Match score */}
            {item.matchScore && item.matchScore > 0 && (
              <TasteMatchScore score={item.matchScore} />
            )}

            {/* Like button */}
            {onLikePress && (
              <View style={styles.tasteCardLike}>
                <LikeButton
                  isLiked={likedIds?.has(item.id) || false}
                  onPress={() => onLikePress(item)}
                  size="small"
                />
              </View>
            )}

            {/* Bilgi */}
            <Text style={styles.tasteCardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.tasteCardMeta}>
              {item.year && <Text style={styles.tasteCardYear}>{item.year}</Text>}
              {item.rating && (
                <Text style={styles.tasteCardRating}>★ {item.rating.toFixed(1)}</Text>
              )}
            </View>

            {/* Eslesme nedeni */}
            {item.matchReason && (
              <Text style={styles.matchReason} numberOfLines={1}>{item.matchReason}</Text>
            )}
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tasteList}
      />
    </View>
  );
});
TasteRecommendations.displayName = 'TasteRecommendations';

// ─── Poster Progress Overlay ────────────────────────────

/**
 * Poster uzerinde izleme durumu gostergesi.
 * Film/dizi kartinin ustune konulur.
 */
export const PosterProgressOverlay: React.FC<{
  progress?: WatchProgress;
}> = memo(({ progress }) => {
  if (!progress || progress.status === 'unwatched') return null;

  const percent = getWatchPercent(progress);

  return (
    <View style={styles.posterOverlay}>
      {/* Alt progress bar */}
      <View style={styles.posterProgressTrack}>
        <View style={[
          styles.posterProgressFill,
          { width: `${Math.min(percent, 100)}%` },
          progress.status === 'completed' && styles.posterProgressCompleted,
        ]} />
      </View>

      {/* Status badge */}
      {progress.status === 'completed' && (
        <View style={styles.posterCompletedBadge}>
          <Text style={styles.posterCompletedText}>✓</Text>
        </View>
      )}
    </View>
  );
});
PosterProgressOverlay.displayName = 'PosterProgressOverlay';

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // Watch status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniProgress: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  statusIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextSmall: {
    fontSize: 10,
  },

  // Like button
  likeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  likeIcon: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  likeIconActive: {
    color: '#EF4444',
  },

  // Watchlist button
  watchlistIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  watchlistIconActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  watchlistIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  watchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  watchlistButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  watchlistButtonIcon: {
    fontSize: 16,
  },
  watchlistButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  watchlistButtonTextActive: {
    color: '#93C5FD',
  },

  // Taste match score
  tasteScore: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tasteScoreText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Taste recommendations section
  tasteSection: {
    marginVertical: 16,
  },
  tasteSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  tasteList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  tasteCard: {
    width: 140,
    position: 'relative',
  },
  tastePoster: {
    width: 140,
    height: 210,
    borderRadius: 8,
  },
  tastePosterPlaceholder: {
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tastePlaceholderText: {
    color: colors.text.muted,
    fontSize: 28,
    fontWeight: '700',
  },
  tasteCardLike: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  tasteCardTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  tasteCardMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  tasteCardYear: {
    color: colors.text.muted,
    fontSize: 11,
  },
  tasteCardRating: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  matchReason: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Poster progress overlay
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  posterProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  posterProgressFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  posterProgressCompleted: {
    backgroundColor: '#10B981',
  },
  posterCompletedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterCompletedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
