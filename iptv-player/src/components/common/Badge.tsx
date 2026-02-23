/**
 * Badge Components
 *
 * Bilgi badge'leri:
 * - HD/4K/FHD kalite badge
 * - CANLI/LIVE badge (animasyonlu)
 * - Yeni icerik badge
 * - IMDB rating badge
 * - Kategori chip'leri
 * - Dil/altyazi badge
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Pulse } from './AnimatedTransition';

// ─── Quality Badge ──────────────────────────────────────

type QualityLevel = '4K' | 'FHD' | 'HD' | 'SD';

export function QualityBadge({ quality, style }: { quality: QualityLevel; style?: ViewStyle }) {
  const badgeColor = {
    '4K': '#9333EA',   // Mor
    'FHD': '#3B82F6',  // Mavi
    'HD': '#10B981',   // Yesil
    'SD': '#6B7280',   // Gri
  }[quality];

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }, style]}>
      <Text style={styles.badgeText}>{quality}</Text>
    </View>
  );
}

// ─── Live Badge (Animated) ──────────────────────────────

export function LiveBadgeAnimated({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.liveBadge, style]}>
      <Pulse duration={1000} minScale={0.8} active>
        <View style={styles.liveDot} />
      </Pulse>
      <Text style={styles.liveText}>CANLI</Text>
    </View>
  );
}

// ─── Rating Badge ───────────────────────────────────────

export function RatingBadge({
  rating,
  source = 'IMDB',
  style,
}: {
  rating: number;
  source?: 'IMDB' | 'TMDB';
  style?: ViewStyle;
}) {
  const color = rating >= 7 ? '#10B981' : rating >= 5 ? '#F59E0B' : '#F85149';

  return (
    <View style={[styles.ratingBadge, { borderColor: color }, style]}>
      <Text style={[styles.ratingIcon]}>★</Text>
      <Text style={[styles.ratingText, { color }]}>{rating.toFixed(1)}</Text>
      {source && <Text style={styles.ratingSource}>{source}</Text>}
    </View>
  );
}

// ─── New Badge ──────────────────────────────────────────

export function NewBadge({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.newBadge, style]}>
      <Text style={styles.newText}>YENİ</Text>
    </View>
  );
}

// ─── Category Chip ──────────────────────────────────────

export function CategoryChip({
  label,
  selected = false,
  style,
}: {
  label: string;
  selected?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.chip,
        selected && styles.chipSelected,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </View>
  );
}

// ─── Language Badge ─────────────────────────────────────

export function LanguageBadge({
  language,
  type = 'audio',
  style,
}: {
  language: string;
  type?: 'audio' | 'subtitle';
  style?: ViewStyle;
}) {
  const icon = type === 'audio' ? '🔊' : '💬';
  return (
    <View style={[styles.langBadge, style]}>
      <Text style={styles.langIcon}>{icon}</Text>
      <Text style={styles.langText}>{language.toUpperCase()}</Text>
    </View>
  );
}

// ─── Year Badge ─────────────────────────────────────────

export function YearBadge({ year, style }: { year: number; style?: ViewStyle }) {
  return (
    <View style={[styles.yearBadge, style]}>
      <Text style={styles.yearText}>{year}</Text>
    </View>
  );
}

// ─── Duration Badge ─────────────────────────────────────

export function DurationBadge({ minutes, style }: { minutes: number; style?: ViewStyle }) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const label = hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;

  return (
    <View style={[styles.durationBadge, style]}>
      <Text style={styles.durationText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Quality
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Live
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F85149',
    marginRight: 6,
  },
  liveText: {
    color: '#F85149',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Rating
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingIcon: {
    fontSize: 12,
    color: '#F59E0B',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ratingSource: {
    fontSize: 9,
    color: '#8B949E',
    marginLeft: 4,
  },

  // New
  newBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Chip
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#21262D',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },

  // Language
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21262D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  langText: {
    color: '#F0F6FC',
    fontSize: 10,
    fontWeight: '600',
  },

  // Year
  yearBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  yearText: {
    color: '#8B949E',
    fontSize: 12,
    fontWeight: '500',
  },

  // Duration
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#8B949E',
    fontSize: 11,
  },
});
