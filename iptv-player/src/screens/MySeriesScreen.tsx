/**
 * My Series Screen (Takip Edilen Diziler)
 *
 * Netflix "My List" + Trakt.tv karisi ekran:
 *
 * Layout:
 * +--------------------------------------------------------+
 * |  Dizilerim                          [Stats] [Takvim]   |
 * +--------------------------------------------------------+
 * |  [Izleniyor] [Tamamlandi] [Beklemede] [Izlenecek] [+] |
 * +--------------------------------------------------------+
 * |                                                         |
 * |  +--------+  Breaking Bad         S5 B12    ████░ %85  |
 * |  |        |  Izleniyor - Yeni bolum!        ★ 9.5     |
 * |  | POSTER |  Son: 2 gun once                           |
 * |  +--------+                                             |
 * |                                                         |
 * |  +--------+  The Witcher           S3 B4    ██░░░ %40  |
 * |  |        |  Izleniyor                      ★ 8.1     |
 * |  | POSTER |  Son: 1 hafta once                         |
 * |  +--------+                                             |
 * |                                                         |
 * |  +--------+  Peaky Blinders        Tamamlandi  ✓      |
 * |  | POSTER |  6 sezon - 36 bolum    ★★★★★ 9.1         |
 * |  +--------+                                             |
 * +--------------------------------------------------------+
 * |  Streak: 5 gun | Bu ay: 23 bolum | Toplam: 142 saat   |
 * +--------------------------------------------------------+
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import {
  useSeriesTrackingStore,
  TrackedSeries,
  SeriesStatus,
} from '@/store/seriesTrackingStore';
import {
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  calculateSeriesProgress,
  calculateWatchStreak,
} from '@/services/seriesTracker';

// ─── Filter Tabs ────────────────────────────────────────

const STATUS_TABS: { key: SeriesStatus | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: '📋' },
  { key: 'watching', label: 'İzleniyor', icon: '▶' },
  { key: 'completed', label: 'Bitti', icon: '✓' },
  { key: 'on_hold', label: 'Beklemede', icon: '⏸' },
  { key: 'plan_to_watch', label: 'İzlenecek', icon: '📌' },
  { key: 'dropped', label: 'Bırakıldı', icon: '✕' },
];

// ─── Component ──────────────────────────────────────────

export function MySeriesScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<SeriesStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'lastWatched' | 'name' | 'rating' | 'progress'>('lastWatched');
  const { width: screenWidth } = Dimensions.get('window');

  const { trackedSeries, getByStatus, getStats } = useSeriesTrackingStore();

  // Filtrelenmis ve siralanmis liste
  const filteredSeries = useMemo(() => {
    let list = activeTab === 'all' ? trackedSeries : getByStatus(activeTab);

    // Siralama
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'lastWatched':
          return b.lastWatchedAt - a.lastWatchedAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'progress':
          return calculateSeriesProgress(b) - calculateSeriesProgress(a);
        default:
          return 0;
      }
    });
  }, [trackedSeries, activeTab, sortBy, getByStatus]);

  // Istatistikler
  const stats = useMemo(() => getStats(), [trackedSeries, getStats]);
  const streak = useMemo(() => calculateWatchStreak(trackedSeries), [trackedSeries]);

  // Zaman formatla
  const getTimeAgo = useCallback((timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    if (weeks < 4) return `${weeks} hafta önce`;
    return `${Math.floor(days / 30)} ay önce`;
  }, []);

  // Dizi karti
  const renderSeriesItem = useCallback(({ item }: { item: TrackedSeries }) => {
    const progress = calculateSeriesProgress(item);
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.seriesCard}
        onPress={() => navigation.navigate('SeriesDetail', { seriesId: item.seriesId })}
        activeOpacity={0.7}
      >
        {/* Poster */}
        <View style={styles.posterContainer}>
          <View style={styles.poster}>
            <Text style={styles.posterPlaceholder}>
              {item.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>

          {/* Yeni bolum badge */}
          {item.hasNewEpisode && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          )}
        </View>

        {/* Bilgi */}
        <View style={styles.infoSection}>
          {/* Baslik satiri */}
          <View style={styles.titleRow}>
            <Text style={styles.seriesName} numberOfLines={1}>{item.name}</Text>
            {item.rating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Durum + Sezon/Bolum */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
              <Text style={[styles.statusIcon, { color: statusColor }]}>{statusIcon}</Text>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            {item.status !== 'plan_to_watch' && (
              <Text style={styles.episodeInfo}>
                S{item.currentSeason} B{item.currentEpisode}
              </Text>
            )}

            {item.year && (
              <Text style={styles.yearText}>{item.year}</Text>
            )}
          </View>

          {/* Ilerleme cubugu */}
          {item.status !== 'plan_to_watch' && (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: item.status === 'completed' ? '#10B981' : colors.accent.blue,
                  },
                ]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          {/* Alt bilgi */}
          <View style={styles.metaRow}>
            {item.totalWatchedEpisodes > 0 && (
              <Text style={styles.metaText}>
                {item.totalWatchedEpisodes} bölüm izlendi
              </Text>
            )}
            {item.lastWatchedAt > 0 && (
              <Text style={styles.metaText}>
                {getTimeAgo(item.lastWatchedAt)}
              </Text>
            )}
          </View>

          {/* Kullanici puani */}
          {item.userRating !== null && (
            <View style={styles.userRatingRow}>
              <Text style={styles.userRatingLabel}>Puanın:</Text>
              {Array.from({ length: 10 }, (_, i) => (
                <Text
                  key={`star_${i}`}
                  style={[
                    styles.userRatingStar,
                    i < (item.userRating || 0) && styles.userRatingStarFilled,
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Sag ok */}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }, [navigation, getTimeAgo]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dizilerim</Text>
          <Text style={styles.headerSubtitle}>{stats.totalTracked} dizi takip ediliyor</Text>
        </View>

        <View style={styles.headerActions}>
          {/* Siralama */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const sortOptions: typeof sortBy[] = ['lastWatched', 'name', 'rating', 'progress'];
              const nextIndex = (sortOptions.indexOf(sortBy) + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex]);
            }}
          >
            <Text style={styles.sortIcon}>↕</Text>
            <Text style={styles.sortLabel}>
              {sortBy === 'lastWatched' ? 'Son' : sortBy === 'name' ? 'A-Z' : sortBy === 'rating' ? 'Puan' : '%'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Durum tab'lari */}
      <FlatList
        data={STATUS_TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
        keyExtractor={(item) => item.key}
        renderItem={({ item: tab }) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'all'
            ? stats.totalTracked
            : stats[tab.key === 'plan_to_watch' ? 'planToWatch' : tab.key as keyof typeof stats] as number || 0;

          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Dizi listesi */}
      <FlatList
        data={filteredSeries}
        renderItem={renderSeriesItem}
        keyExtractor={(item) => item.seriesId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'Henüz dizi takip etmiyorsunuz' : `"${getStatusLabel(activeTab as SeriesStatus)}" listesi boş`}
            </Text>
            <Text style={styles.emptyHint}>
              Dizi detay sayfasından "Takip Et" butonuna basarak dizileri listenize ekleyin
            </Text>
          </View>
        }
      />

      {/* Alt istatistik cubugu */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{streak.currentStreak}</Text>
          <Text style={styles.statLabel}>gün seri</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📺</Text>
          <Text style={styles.statValue}>{stats.episodesThisMonth}</Text>
          <Text style={styles.statLabel}>bu ay</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⏱</Text>
          <Text style={styles.statValue}>{stats.totalWatchTimeHours}</Text>
          <Text style={styles.statLabel}>saat toplam</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>✓</Text>
          <Text style={styles.statValue}>{stats.totalEpisodesWatched}</Text>
          <Text style={styles.statLabel}>bölüm</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { color: colors.text.primary, fontSize: 26, fontWeight: '800' },
  headerSubtitle: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#30363D' },
  sortIcon: { color: colors.accent.blue, fontSize: 14 },
  sortLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '500' },

  // Tabs
  tabBar: { maxHeight: 48, marginBottom: 8 },
  tabBarContent: { paddingHorizontal: 20, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background.card, gap: 6, borderWidth: 1, borderColor: '#30363D' },
  tabActive: { backgroundColor: colors.accent.blue, borderColor: colors.accent.blue },
  tabIcon: { fontSize: 13 },
  tabLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '500' },
  tabLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  tabCount: { backgroundColor: '#30363D', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  tabCountTextActive: { color: '#FFFFFF' },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },

  // Series Card
  seriesCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 14 },
  posterContainer: { position: 'relative' },
  poster: { width: 75, height: 112, borderRadius: 12, backgroundColor: '#21262D', justifyContent: 'center', alignItems: 'center' },
  posterPlaceholder: { color: colors.text.muted, fontSize: 20, fontWeight: '800' },
  newBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#F85149', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // Info
  infoSection: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seriesName: { color: colors.text.primary, fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingStar: { color: '#F59E0B', fontSize: 13 },
  ratingValue: { color: '#F59E0B', fontSize: 13, fontWeight: '700' },

  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, gap: 4 },
  statusIcon: { fontSize: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  episodeInfo: { color: colors.text.secondary, fontSize: 13, fontWeight: '500' },
  yearText: { color: colors.text.muted, fontSize: 12 },

  // Progress
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#21262D', borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { color: colors.text.muted, fontSize: 11, fontWeight: '600', minWidth: 30, textAlign: 'right' },

  // Meta
  metaRow: { flexDirection: 'row', gap: 12 },
  metaText: { color: colors.text.muted, fontSize: 11 },

  // User Rating
  userRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  userRatingLabel: { color: colors.text.muted, fontSize: 10, marginRight: 4 },
  userRatingStar: { fontSize: 10, color: '#30363D' },
  userRatingStarFilled: { color: '#F59E0B' },

  arrow: { color: colors.text.muted, fontSize: 24 },

  // Empty
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyHint: { color: colors.text.muted, fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 20 },

  // Stats Bar
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: colors.background.card, paddingVertical: 14, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statIcon: { fontSize: 14 },
  statValue: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.text.muted, fontSize: 11 },
  statDivider: { width: 1, height: 24, backgroundColor: '#21262D' },
});
