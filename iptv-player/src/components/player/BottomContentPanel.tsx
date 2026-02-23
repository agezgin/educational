/**
 * Bottom Content Panel
 *
 * Video oynatilirken alt tusa basinca acilan panel:
 * - Sonraki bolum listesi (dizi icin)
 * - Benzer icerikler (film icin)
 * - Dil/Altyazi secimi kisayolu
 * - Hiz/Kalite secimi
 * - Bolumlere git (dizi)
 *
 * YouTube'daki "yukarı kaydır" paneline benzer.
 * TV'de: Asagi tusu -> Panel acilir
 *         Yukari tusu -> Panel kapanir
 *
 * Animasyonlu: alttan yukari slide
 * Yarim ekran kaplar, video kuculerek devam eder
 */

import React, { useState, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme/colors';

// ─── Types ──────────────────────────────────────────────

export type PanelTab = 'episodes' | 'related' | 'info' | 'settings';

export interface EpisodeItem {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  duration: number;
  thumbnailUrl?: string;
  description?: string;
  /** Izlenme durumu */
  watchProgress?: number;
  /** Su an oynatiyor */
  isPlaying?: boolean;
}

export interface RelatedItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  posterUrl?: string;
  year?: number;
  rating?: number;
}

interface BottomContentPanelProps {
  visible: boolean;
  onClose: () => void;
  /** Dizi icin bolumler */
  episodes?: EpisodeItem[];
  /** Benzer icerikler */
  relatedContent?: RelatedItem[];
  /** Icerik bilgisi */
  contentInfo?: {
    title: string;
    year?: number;
    genres?: string[];
    description?: string;
    rating?: number;
    director?: string;
  };
  /** Bolum secildiginde */
  onEpisodeSelect?: (episode: EpisodeItem) => void;
  /** Benzer icerik secildiginde */
  onRelatedSelect?: (item: RelatedItem) => void;
  /** Ayar secimi */
  onSettingPress?: (setting: 'subtitle' | 'audio' | 'quality' | 'speed') => void;
  /** Mevcut sezon */
  currentSeason?: number;
  /** Sezon listesi */
  seasons?: number[];
  /** Sezon degistirme */
  onSeasonChange?: (season: number) => void;
  /** Aktif altyazi bilgisi */
  currentSubtitleLabel?: string | null;
  /** Aktif ses dili bilgisi */
  currentAudioLabel?: string | null;
  /** Aktif kalite */
  currentQuality?: string;
  /** Aktif hiz */
  currentSpeed?: string;
}

// ─── Component ──────────────────────────────────────────

export const BottomContentPanel: React.FC<BottomContentPanelProps> = memo(({
  visible,
  onClose,
  episodes,
  relatedContent,
  contentInfo,
  onEpisodeSelect,
  onRelatedSelect,
  onSettingPress,
  currentSeason,
  seasons,
  onSeasonChange,
  currentSubtitleLabel,
  currentAudioLabel,
  currentQuality,
  currentSpeed,
}) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [activeTab, setActiveTab] = useState<PanelTab>(
    episodes && episodes.length > 0 ? 'episodes' : 'related',
  );
  const { height: screenHeight } = Dimensions.get('window');
  const panelHeight = screenHeight * 0.55;

  // Animasyon
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : panelHeight,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible, panelHeight, slideAnim]);

  if (!visible) return null;

  // Tab'lar
  const tabs: { key: PanelTab; label: string; icon: string; show: boolean }[] = [
    { key: 'episodes', label: 'Bölümler', icon: '📋', show: !!episodes && episodes.length > 0 },
    { key: 'related', label: 'Benzer', icon: '🔗', show: !!relatedContent && relatedContent.length > 0 },
    { key: 'info', label: 'Bilgi', icon: 'ℹ️', show: !!contentInfo },
    { key: 'settings', label: 'Ayarlar', icon: '⚙️', show: true },
  ].filter((t) => t.show);

  return (
    <Animated.View
      style={[
        styles.container,
        { height: panelHeight, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Handle bar (sag/sol cizgi) */}
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive,
            ]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Kapat butonu */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Icerik */}
      <View style={styles.content}>
        {/* Bolumler */}
        {activeTab === 'episodes' && episodes && (
          <View style={styles.episodesSection}>
            {/* Sezon secici */}
            {seasons && seasons.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonRow}>
                {seasons.map((season) => (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.seasonChip,
                      currentSeason === season && styles.seasonChipActive,
                    ]}
                    onPress={() => onSeasonChange?.(season)}
                  >
                    <Text style={[
                      styles.seasonText,
                      currentSeason === season && styles.seasonTextActive,
                    ]}>Sezon {season}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Bolum listesi */}
            <FlatList
              data={episodes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.episodeItem,
                    item.isPlaying && styles.episodeItemPlaying,
                  ]}
                  onPress={() => onEpisodeSelect?.(item)}
                >
                  {/* Thumbnail */}
                  <View style={styles.episodeThumb}>
                    {item.isPlaying && (
                      <View style={styles.playingIndicator}>
                        <Text style={styles.playingIcon}>▶</Text>
                      </View>
                    )}
                    {/* Progress overlay */}
                    {item.watchProgress !== undefined && item.watchProgress > 0 && (
                      <View style={styles.episodeProgressTrack}>
                        <View style={[styles.episodeProgressFill, { width: `${item.watchProgress}%` }]} />
                      </View>
                    )}
                  </View>

                  {/* Bilgi */}
                  <View style={styles.episodeInfo}>
                    <Text style={[
                      styles.episodeTitle,
                      item.isPlaying && styles.episodeTitlePlaying,
                    ]} numberOfLines={1}>
                      {item.episodeNumber}. {item.title}
                    </Text>
                    {item.description && (
                      <Text style={styles.episodeDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text style={styles.episodeDuration}>
                      {Math.round(item.duration / 60)} dk
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Benzer icerikler */}
        {activeTab === 'related' && relatedContent && (
          <FlatList
            data={relatedContent}
            keyExtractor={(item) => item.id}
            numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.relatedItem}
                onPress={() => onRelatedSelect?.(item)}
              >
                <View style={styles.relatedPoster}>
                  <Text style={styles.relatedPosterIcon}>
                    {item.type === 'movie' ? '🎬' : '📺'}
                  </Text>
                </View>
                <Text style={styles.relatedTitle} numberOfLines={2}>{item.title}</Text>
                {item.year && (
                  <Text style={styles.relatedYear}>{item.year}</Text>
                )}
                {item.rating && (
                  <Text style={styles.relatedRating}>★ {item.rating.toFixed(1)}</Text>
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.relatedGrid}
          />
        )}

        {/* Icerik bilgisi */}
        {activeTab === 'info' && contentInfo && (
          <ScrollView style={styles.infoSection}>
            <Text style={styles.infoTitle}>{contentInfo.title}</Text>
            <View style={styles.infoMeta}>
              {contentInfo.year && (
                <Text style={styles.infoMetaItem}>{contentInfo.year}</Text>
              )}
              {contentInfo.rating && (
                <Text style={styles.infoRating}>★ {contentInfo.rating.toFixed(1)}</Text>
              )}
              {contentInfo.director && (
                <Text style={styles.infoMetaItem}>Yönetmen: {contentInfo.director}</Text>
              )}
            </View>
            {contentInfo.genres && (
              <View style={styles.genreRow}>
                {contentInfo.genres.map((genre) => (
                  <View key={genre} style={styles.genreChip}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
            {contentInfo.description && (
              <Text style={styles.infoDescription}>{contentInfo.description}</Text>
            )}
          </ScrollView>
        )}

        {/* Ayarlar */}
        {activeTab === 'settings' && (
          <View style={styles.settingsSection}>
            {[
              {
                key: 'subtitle' as const,
                icon: '💬',
                label: 'Altyazı',
                desc: 'Dil seçimi ve ayarlar',
                current: currentSubtitleLabel || 'Kapalı',
              },
              {
                key: 'audio' as const,
                icon: '🔊',
                label: 'Ses Dili',
                desc: 'Ses kanalı değiştir',
                current: currentAudioLabel || 'Varsayılan',
              },
              {
                key: 'quality' as const,
                icon: '📺',
                label: 'Kalite',
                desc: 'Video kalitesi ayarla',
                current: currentQuality || 'Otomatik',
              },
              {
                key: 'speed' as const,
                icon: '⚡',
                label: 'Hız',
                desc: 'Oynatma hızı değiştir',
                current: currentSpeed || '1x',
              },
            ].map((setting) => (
              <TouchableOpacity
                key={setting.key}
                style={styles.settingItem}
                onPress={() => onSettingPress?.(setting.key)}
              >
                <Text style={styles.settingIcon}>{setting.icon}</Text>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  <Text style={styles.settingDesc}>{setting.desc}</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingCurrent}>{setting.current}</Text>
                  <Text style={styles.settingArrow}>{'›'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

BottomContentPanel.displayName = 'BottomContentPanel';

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(13, 17, 23, 0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 200,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363D',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 4,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.accent.blue,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: colors.text.secondary,
    fontSize: 16,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Episodes
  episodesSection: {
    flex: 1,
  },
  seasonRow: {
    maxHeight: 40,
    marginBottom: 10,
  },
  seasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#21262D',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  seasonChipActive: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  seasonText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  seasonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  episodeItemPlaying: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  episodeThumb: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  playingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 2,
  },
  episodeProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  episodeProgressFill: {
    height: '100%',
    backgroundColor: colors.accent.blue,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  episodeTitlePlaying: {
    color: colors.accent.blue,
    fontWeight: '700',
  },
  episodeDesc: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  episodeDuration: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 4,
  },

  // Related
  relatedGrid: {
    gap: 12,
  },
  relatedItem: {
    flex: 1,
    maxWidth: '25%',
    padding: 6,
  },
  relatedPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 10,
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedPosterIcon: {
    fontSize: 24,
  },
  relatedTitle: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  relatedYear: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  relatedRating: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Info
  infoSection: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  infoMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoMetaItem: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  infoRating: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  genreChip: {
    backgroundColor: '#21262D',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  genreText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  infoDescription: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Settings
  settingsSection: {
    gap: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 14,
  },
  settingIcon: {
    fontSize: 22,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  settingDesc: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingCurrent: {
    color: colors.accent.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  settingArrow: {
    color: colors.text.muted,
    fontSize: 24,
  },
});
