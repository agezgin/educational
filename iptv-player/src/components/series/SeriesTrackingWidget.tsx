/**
 * Series Tracking Widget
 *
 * Dizi detay sayfasina eklenen takip widget'lari:
 *
 * 1. TrackButton - "Takip Et" / "Takiptesin" butonu
 * 2. EpisodeCheckList - Bolum izlendi check listesi
 * 3. StatusPicker - Durum secimi (Izleniyor/Bekleme/vb.)
 * 4. UserRatingInput - Kullanici puan girisi (1-10 yildiz)
 * 5. SeasonProgressBar - Sezon ilerleme cubugu
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/theme/colors';
import {
  useSeriesTrackingStore,
  SeriesStatus,
} from '@/store/seriesTrackingStore';
import {
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  calculateSeasonProgress,
} from '@/services/seriesTracker';

// ─── Track Button ───────────────────────────────────────

interface TrackButtonProps {
  seriesId: string;
  seriesName: string;
  posterUrl?: string;
  totalSeasons: number;
  genre?: string;
  year?: number;
  rating?: number;
}

/**
 * Ana takip butonu.
 * Takip etmiyorsa: "Takip Et" (mavi)
 * Takipteyse: "Takipte ✓" (yesil) + durum secici
 */
export const TrackButton: React.FC<TrackButtonProps> = memo(({
  seriesId,
  seriesName,
  posterUrl,
  totalSeasons,
  genre,
  year,
  rating,
}) => {
  const { isTracked, trackSeries, untrackSeries, getTrackedSeries } = useSeriesTrackingStore();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const tracked = isTracked(seriesId);
  const trackedInfo = tracked ? getTrackedSeries(seriesId) : null;

  const handlePress = useCallback(() => {
    if (tracked) {
      setShowStatusPicker(!showStatusPicker);
    } else {
      trackSeries({
        seriesId,
        name: seriesName,
        posterUrl,
        status: 'watching',
        currentSeason: 1,
        currentEpisode: 0,
        totalSeasons,
        totalEpisodesInSeason: 0,
        userRating: null,
        notes: '',
        genre,
        year,
        rating,
      });
    }
  }, [tracked, seriesId, seriesName, posterUrl, totalSeasons, genre, year, rating, showStatusPicker, trackSeries]);

  const handleLongPress = useCallback(() => {
    if (tracked) {
      untrackSeries(seriesId);
    }
  }, [tracked, seriesId, untrackSeries]);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.trackButton,
          tracked && styles.trackButtonTracked,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.trackButtonIcon,
          tracked && styles.trackButtonIconTracked,
        ]}>
          {tracked ? '✓' : '+'}
        </Text>
        <Text style={[
          styles.trackButtonText,
          tracked && styles.trackButtonTextTracked,
        ]}>
          {tracked ? 'Takipte' : 'Takip Et'}
        </Text>
        {tracked && trackedInfo && (
          <Text style={styles.trackButtonStatus}>
            ({getStatusLabel(trackedInfo.status)})
          </Text>
        )}
      </TouchableOpacity>

      {/* Durum secici */}
      {showStatusPicker && tracked && (
        <StatusPicker
          seriesId={seriesId}
          currentStatus={trackedInfo?.status || 'watching'}
          onClose={() => setShowStatusPicker(false)}
        />
      )}
    </View>
  );
});

TrackButton.displayName = 'TrackButton';

// ─── Status Picker ──────────────────────────────────────

interface StatusPickerProps {
  seriesId: string;
  currentStatus: SeriesStatus;
  onClose: () => void;
}

const STATUS_OPTIONS: { key: SeriesStatus; label: string; icon: string }[] = [
  { key: 'watching', label: 'İzleniyor', icon: '▶' },
  { key: 'completed', label: 'Tamamlandı', icon: '✓' },
  { key: 'on_hold', label: 'Beklemede', icon: '⏸' },
  { key: 'plan_to_watch', label: 'İzlenecek', icon: '📌' },
  { key: 'dropped', label: 'Bırakıldı', icon: '✕' },
];

export function StatusPicker({ seriesId, currentStatus, onClose }: StatusPickerProps) {
  const { updateStatus } = useSeriesTrackingStore();

  return (
    <View style={styles.statusPicker}>
      {STATUS_OPTIONS.map((option) => {
        const isSelected = currentStatus === option.key;
        const statusColor = getStatusColor(option.key);

        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.statusOption, isSelected && styles.statusOptionSelected]}
            onPress={() => {
              updateStatus(seriesId, option.key);
              onClose();
            }}
          >
            <Text style={[styles.statusOptionIcon, { color: statusColor }]}>{option.icon}</Text>
            <Text style={[
              styles.statusOptionLabel,
              isSelected && { color: statusColor, fontWeight: '700' },
            ]}>{option.label}</Text>
            {isSelected && <Text style={[styles.statusCheck, { color: statusColor }]}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── User Rating Input ──────────────────────────────────

interface UserRatingProps {
  seriesId: string;
}

export const UserRatingInput: React.FC<UserRatingProps> = memo(({ seriesId }) => {
  const { getTrackedSeries, setUserRating } = useSeriesTrackingStore();
  const tracked = getTrackedSeries(seriesId);

  if (!tracked) return null;

  const currentRating = tracked.userRating || 0;

  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>Puanınız</Text>
      <View style={styles.ratingStars}>
        {Array.from({ length: 10 }, (_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setUserRating(seriesId, i + 1 === currentRating ? null : i + 1)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              i < currentRating && styles.starFilled,
            ]}>★</Text>
          </TouchableOpacity>
        ))}
        {currentRating > 0 && (
          <Text style={styles.ratingNumber}>{currentRating}/10</Text>
        )}
      </View>
    </View>
  );
});

UserRatingInput.displayName = 'UserRatingInput';

// ─── Episode Check Item ─────────────────────────────────

interface EpisodeCheckItemProps {
  seriesId: string;
  season: number;
  episode: number;
  title: string;
  duration: number;
}

/**
 * Bolum izlendi check item.
 * Bolum listesinde her satirin yaninda check kutusu.
 */
export const EpisodeCheckItem: React.FC<EpisodeCheckItemProps> = memo(({
  seriesId,
  season,
  episode,
  title,
  duration,
}) => {
  const { isEpisodeWatched, markEpisodeWatched, markEpisodeUnwatched, getEpisodeProgress } = useSeriesTrackingStore();
  const watched = isEpisodeWatched(seriesId, season, episode);
  const progress = getEpisodeProgress(seriesId, season, episode);

  const handleToggle = useCallback(() => {
    if (watched) {
      markEpisodeUnwatched(seriesId, season, episode);
    } else {
      markEpisodeWatched(seriesId, season, episode, duration);
    }
  }, [watched, seriesId, season, episode, duration, markEpisodeWatched, markEpisodeUnwatched]);

  return (
    <TouchableOpacity style={styles.episodeCheck} onPress={handleToggle}>
      {/* Check kutusu */}
      <View style={[styles.checkbox, watched && styles.checkboxChecked]}>
        {watched && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Bolum bilgisi */}
      <View style={styles.episodeCheckInfo}>
        <Text style={[styles.episodeCheckTitle, watched && styles.episodeCheckTitleWatched]}>
          {episode}. {title}
        </Text>

        {/* Ilerleme cubugu (yarim izlenmisse) */}
        {progress && !progress.watched && progress.progressPercent > 0 && (
          <View style={styles.episodeProgressRow}>
            <View style={styles.episodeMiniProgress}>
              <View style={[styles.episodeMiniProgressFill, { width: `${progress.progressPercent}%` }]} />
            </View>
            <Text style={styles.episodeProgressText}>{progress.progressPercent}%</Text>
          </View>
        )}
      </View>

      {/* Sure */}
      <Text style={styles.episodeDuration}>{Math.round(duration / 60)}dk</Text>
    </TouchableOpacity>
  );
});

EpisodeCheckItem.displayName = 'EpisodeCheckItem';

// ─── Season Progress Bar ────────────────────────────────

interface SeasonProgressBarProps {
  seriesId: string;
  season: number;
  totalEpisodes: number;
}

export const SeasonProgressBar: React.FC<SeasonProgressBarProps> = memo(({
  seriesId,
  season,
  totalEpisodes,
}) => {
  const { getTrackedSeries, markSeasonWatched } = useSeriesTrackingStore();
  const tracked = getTrackedSeries(seriesId);

  if (!tracked) return null;

  const progress = calculateSeasonProgress(tracked.watchedEpisodes, season, totalEpisodes);

  return (
    <View style={styles.seasonProgress}>
      <View style={styles.seasonProgressHeader}>
        <Text style={styles.seasonProgressLabel}>
          Sezon {season}: {progress.watched}/{progress.total} bölüm
        </Text>
        {progress.percent < 100 && (
          <TouchableOpacity
            onPress={() => markSeasonWatched(seriesId, season, totalEpisodes, 2700)}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Tümünü İzledim</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.seasonProgressTrack}>
        <View style={[
          styles.seasonProgressFill,
          {
            width: `${progress.percent}%`,
            backgroundColor: progress.percent === 100 ? '#10B981' : colors.accent.blue,
          },
        ]} />
      </View>
    </View>
  );
});

SeasonProgressBar.displayName = 'SeasonProgressBar';

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // Track Button
  trackButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent.blue, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, gap: 8 },
  trackButtonTracked: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  trackButtonIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  trackButtonIconTracked: { color: '#10B981' },
  trackButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  trackButtonTextTracked: { color: '#10B981' },
  trackButtonStatus: { color: 'rgba(16, 185, 129, 0.7)', fontSize: 12 },

  // Status Picker
  statusPicker: { backgroundColor: colors.background.card, borderRadius: 14, marginTop: 8, padding: 6, borderWidth: 1, borderColor: '#30363D' },
  statusOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, gap: 10 },
  statusOptionSelected: { backgroundColor: 'rgba(255,255,255,0.05)' },
  statusOptionIcon: { fontSize: 14 },
  statusOptionLabel: { flex: 1, color: colors.text.secondary, fontSize: 14 },
  statusCheck: { fontSize: 16, fontWeight: '700' },

  // Rating
  ratingContainer: { marginTop: 10 },
  ratingLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 6 },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starButton: { padding: 2 },
  star: { fontSize: 22, color: '#30363D' },
  starFilled: { color: '#F59E0B' },
  ratingNumber: { color: '#F59E0B', fontSize: 14, fontWeight: '700', marginLeft: 8 },

  // Episode Check
  episodeCheck: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#30363D', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  episodeCheckInfo: { flex: 1 },
  episodeCheckTitle: { color: colors.text.primary, fontSize: 14 },
  episodeCheckTitleWatched: { color: colors.text.muted, textDecorationLine: 'line-through' },
  episodeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  episodeMiniProgress: { width: 60, height: 3, backgroundColor: '#21262D', borderRadius: 1.5 },
  episodeMiniProgressFill: { height: '100%', backgroundColor: colors.accent.blue, borderRadius: 1.5 },
  episodeProgressText: { color: colors.text.muted, fontSize: 10 },
  episodeDuration: { color: colors.text.muted, fontSize: 12 },

  // Season Progress
  seasonProgress: { marginVertical: 6 },
  seasonProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  seasonProgressLabel: { color: colors.text.secondary, fontSize: 13 },
  markAllButton: { backgroundColor: 'rgba(59, 130, 246, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  markAllText: { color: colors.accent.blue, fontSize: 11, fontWeight: '600' },
  seasonProgressTrack: { height: 4, backgroundColor: '#21262D', borderRadius: 2 },
  seasonProgressFill: { height: '100%', borderRadius: 2 },
});
