/**
 * SeriesDetailScreen - Dizi Detay Sayfasi
 *
 * TMDB API ile zengin icerik:
 * - Backdrop + Poster
 * - Baslik, yil, sezon/bolum sayisi, puan
 * - Fragman butonu
 * - Sezon secimi (tab'lar)
 * - Bolum listesi (her sezon icin)
 * - Oyuncu kadrosu
 * - Benzer diziler / Oneriler
 * - Yorumlar
 * - Kaldigi yerden devam bilgisi
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FocusableItem, ProgressBar } from '@/components/common';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { RootStackParamList } from '@/types';
import {
  getFullTVShowData,
  getTVSeasonDetails,
  imageUrl,
  TMDBCastMember,
  TMDBVideo,
  TMDBReview,
  TMDBListItem,
  TMDBTVShow,
  TMDBSeason,
  TMDBEpisode,
} from '@/services/tmdb';

type SeriesDetailProps = NativeStackScreenProps<RootStackParamList, 'SeriesDetail'>;

export const SeriesDetailScreen: React.FC = () => {
  const route = useRoute<SeriesDetailProps['route']>();
  const navigation = useNavigation();
  const { seriesId } = route.params;

  const [details, setDetails] = useState<TMDBTVShow | null>(null);
  const [cast, setCast] = useState<TMDBCastMember[]>([]);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [similar, setSimilar] = useState<TMDBListItem[]>([]);
  const [recommendations, setRecommendations] = useState<TMDBListItem[]>([]);
  const [reviews, setReviews] = useState<TMDBReview[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState<TMDBSeason | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);

  const tmdbId = parseInt(seriesId.replace('series_', ''), 10);

  // Dizi verilerini cek
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (isNaN(tmdbId)) return;

        const data = await getFullTVShowData(tmdbId);
        setDetails(data.details);
        setCast(data.cast);
        setTrailer(data.trailer || null);
        setSimilar(data.similar);
        setRecommendations(data.recommendations);
        setReviews(data.reviews);
      } catch (err) {
        console.error('Dizi verisi yuklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tmdbId]);

  // Sezon bolumlerini cek
  useEffect(() => {
    async function loadSeason() {
      if (isNaN(tmdbId)) return;
      try {
        setSeasonLoading(true);
        const season = await getTVSeasonDetails(tmdbId, selectedSeason);
        setSeasonData(season);
      } catch (err) {
        console.error('Sezon verisi yuklenemedi:', err);
      } finally {
        setSeasonLoading(false);
      }
    }
    loadSeason();
  }, [tmdbId, selectedSeason]);

  const handleEpisodePlay = useCallback((episode: TMDBEpisode) => {
    navigation.navigate('VODPlayer', {
      contentId: `${seriesId}_s${episode.season_number}e${episode.episode_number}`,
      contentType: 'episode',
    });
  }, [navigation, seriesId]);

  const handleSimilarPress = useCallback((item: TMDBListItem) => {
    navigation.navigate('SeriesDetail', {
      seriesId: `series_${item.id}`,
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.blue} />
        <Text style={styles.loadingText}>Dizi bilgileri yukleniyor...</Text>
      </View>
    );
  }

  if (!details) return null;

  const year = details.first_air_date?.split('-')[0];
  const genres = details.genres.map(g => g.name).join(', ');

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          {details.backdrop_path && (
            <Image
              source={{ uri: imageUrl.backdrop(details.backdrop_path)! }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          )}
          <View style={styles.backdropOverlay} />
          <FocusableItem onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} Geri</Text>
          </FocusableItem>
        </View>

        {/* Dizi Bilgileri */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            {details.poster_path && (
              <Image
                source={{ uri: imageUrl.poster(details.poster_path, 'w342')! }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}

            <View style={styles.detailsColumn}>
              <Text style={styles.title}>{details.name}</Text>
              {details.original_name !== details.name && (
                <Text style={styles.originalTitle}>{details.original_name}</Text>
              )}

              {/* Meta */}
              <View style={styles.metaRow}>
                {year && <Text style={styles.metaText}>{year}</Text>}
                <Text style={styles.metaText}>
                  {details.number_of_seasons} Sezon
                </Text>
                <Text style={styles.metaText}>
                  {details.number_of_episodes} Bolum
                </Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>* {details.vote_average.toFixed(1)}</Text>
                  <Text style={styles.voteCount}>({details.vote_count} oy)</Text>
                </View>
              </View>

              {/* Turler */}
              <View style={styles.genreRow}>
                {details.genres.map(genre => (
                  <View key={genre.id} style={styles.genreChip}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>

              {/* Durum */}
              <Text style={styles.statusText}>
                Durum: {details.status === 'Returning Series' ? 'Devam Ediyor' :
                         details.status === 'Ended' ? 'Tamamlandi' : details.status}
              </Text>

              {/* Yapimci */}
              {details.created_by.length > 0 && (
                <Text style={styles.creatorText}>
                  Yapimci: {details.created_by.map(c => c.name).join(', ')}
                </Text>
              )}

              {/* Yayin kanallari */}
              {details.networks.length > 0 && (
                <Text style={styles.networkText}>
                  Kanal: {details.networks.map(n => n.name).join(', ')}
                </Text>
              )}

              {/* Aksiyon butonlari */}
              <View style={styles.actionRow}>
                {trailer && (
                  <FocusableItem onPress={() => {}} style={styles.trailerButton} hasTVPreferredFocus>
                    <Text style={styles.trailerText}>Fragman</Text>
                  </FocusableItem>
                )}
                <FocusableItem onPress={() => {}} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>* Favori</Text>
                </FocusableItem>
              </View>
            </View>
          </View>

          {/* Ozet */}
          {details.overview && (
            <Text style={styles.overview}>{details.overview}</Text>
          )}
        </View>

        {/* Sezon Secimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bolumler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs}>
            {Array.from({ length: details.number_of_seasons }, (_, i) => i + 1).map(seasonNum => (
              <FocusableItem
                key={seasonNum}
                onPress={() => setSelectedSeason(seasonNum)}
                style={[
                  styles.seasonTab,
                  selectedSeason === seasonNum && styles.seasonTabActive,
                ]}
              >
                <Text style={[
                  styles.seasonTabText,
                  selectedSeason === seasonNum && styles.seasonTabTextActive,
                ]}>
                  Sezon {seasonNum}
                </Text>
              </FocusableItem>
            ))}
          </ScrollView>

          {/* Bolum Listesi */}
          {seasonLoading ? (
            <ActivityIndicator size="small" color={colors.accent.blue} style={styles.seasonLoader} />
          ) : (
            seasonData?.episodes?.map(episode => (
              <FocusableItem
                key={episode.id}
                onPress={() => handleEpisodePlay(episode)}
                style={styles.episodeCard}
              >
                <View style={styles.episodeContent}>
                  {/* Episode thumbnail */}
                  {episode.still_path ? (
                    <Image
                      source={{ uri: imageUrl.backdrop(episode.still_path, 'w780')! }}
                      style={styles.episodeThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.episodeThumbnail, styles.thumbnailPlaceholder]}>
                      <Text style={styles.episodeNumberBig}>{episode.episode_number}</Text>
                    </View>
                  )}

                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                      {episode.episode_number}. {episode.name}
                    </Text>
                    <View style={styles.episodeMeta}>
                      {episode.runtime > 0 && (
                        <Text style={styles.episodeMetaText}>{episode.runtime} dk</Text>
                      )}
                      {episode.vote_average > 0 && (
                        <Text style={styles.episodeRating}>* {episode.vote_average.toFixed(1)}</Text>
                      )}
                      {episode.air_date && (
                        <Text style={styles.episodeMetaText}>{episode.air_date}</Text>
                      )}
                    </View>
                    {episode.overview && (
                      <Text style={styles.episodeOverview} numberOfLines={2}>
                        {episode.overview}
                      </Text>
                    )}
                  </View>
                </View>
              </FocusableItem>
            ))
          )}
        </View>

        {/* Oyuncular */}
        {cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oyuncular</Text>
            <FlatList
              horizontal
              data={cast}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.castCard}>
                  {item.profile_path ? (
                    <Image
                      source={{ uri: imageUrl.profile(item.profile_path)! }}
                      style={styles.castPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.castPhoto, styles.castPhotoPlaceholder]}>
                      <Text style={styles.castInitial}>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
                </View>
              )}
              contentContainerStyle={styles.castList}
            />
          </View>
        )}

        {/* Oneriler + Benzer */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onerilen Diziler</Text>
            <FlatList
              horizontal
              data={recommendations}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FocusableItem onPress={() => handleSimilarPress(item)} style={styles.similarCard}>
                  {item.poster_path ? (
                    <Image
                      source={{ uri: imageUrl.poster(item.poster_path, 'w185')! }}
                      style={styles.similarPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.similarPoster, styles.posterPlaceholder]}>
                      <Text style={styles.placeholderText}>{item.name}</Text>
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={1}>{item.name || item.title}</Text>
                  <Text style={styles.similarMeta}>* {item.vote_average.toFixed(1)}</Text>
                </FocusableItem>
              )}
              contentContainerStyle={styles.similarList}
            />
          </View>
        )}

        {/* Yorumlar */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yorumlar ({reviews.length})</Text>
            {reviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{review.author}</Text>
                  {review.author_details.rating && (
                    <Text style={styles.reviewRating}>* {review.author_details.rating}/10</Text>
                  )}
                </View>
                <Text style={styles.reviewContent} numberOfLines={4}>{review.content}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary, marginTop: spacing.lg },

  backdropContainer: { height: 350, position: 'relative' },
  backdrop: { width: '100%', height: '100%' },
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 17, 23, 0.6)' },
  backButton: { position: 'absolute', top: spacing.xl, left: spacing.xl, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 0, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backText: { ...typography.body, color: colors.white },

  infoSection: { marginTop: -60, paddingHorizontal: spacing.xxl, zIndex: 1 },
  infoRow: { flexDirection: 'row', gap: spacing.xl },
  poster: { width: 180, height: 270, borderRadius: borderRadius.lg },
  detailsColumn: { flex: 1, paddingTop: spacing.md },
  title: { ...typography.h1, color: colors.text.primary },
  originalTitle: { ...typography.body, color: colors.text.muted, fontStyle: 'italic', marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
  metaText: { ...typography.body, color: colors.text.secondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingText: { ...typography.h3, color: colors.accent.amber },
  voteCount: { ...typography.caption, color: colors.text.muted },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  genreChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round, backgroundColor: colors.background.active, borderWidth: 1, borderColor: colors.background.card },
  genreText: { ...typography.caption, color: colors.text.secondary },
  statusText: { ...typography.body, color: colors.accent.green, marginTop: spacing.md },
  creatorText: { ...typography.body, color: colors.text.secondary, marginTop: spacing.xs },
  networkText: { ...typography.caption, color: colors.text.muted, marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  trailerButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.status.danger, borderRadius: borderRadius.md, borderWidth: 0 },
  trailerText: { ...typography.h3, color: colors.white, textAlign: 'center' },
  actionButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.background.card, borderRadius: borderRadius.md, borderWidth: 0 },
  actionButtonText: { ...typography.body, color: colors.text.primary, textAlign: 'center' },
  overview: { ...typography.body, color: colors.text.secondary, lineHeight: 26, marginTop: spacing.xl },

  section: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl },
  sectionTitle: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.md },

  // Sezon tab'lari
  seasonTabs: { marginBottom: spacing.lg },
  seasonTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.round, backgroundColor: colors.background.card, marginRight: spacing.sm, borderWidth: 0 },
  seasonTabActive: { backgroundColor: colors.accent.blue },
  seasonTabText: { ...typography.body, color: colors.text.secondary },
  seasonTabTextActive: { color: colors.white, fontWeight: '600' },
  seasonLoader: { marginVertical: spacing.xl },

  // Bolumler
  episodeCard: { marginBottom: spacing.md, borderRadius: borderRadius.md, borderWidth: 0 },
  episodeContent: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  episodeThumbnail: { width: 180, height: 100, borderRadius: borderRadius.md },
  thumbnailPlaceholder: { backgroundColor: colors.background.active, justifyContent: 'center', alignItems: 'center' },
  episodeNumberBig: { ...typography.h1, color: colors.text.muted },
  episodeInfo: { flex: 1 },
  episodeTitle: { ...typography.h3, color: colors.text.primary },
  episodeMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  episodeMetaText: { ...typography.caption, color: colors.text.muted },
  episodeRating: { ...typography.caption, color: colors.accent.amber },
  episodeOverview: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs, lineHeight: 20 },

  // Cast
  castList: { gap: spacing.md },
  castCard: { width: 100, alignItems: 'center' },
  castPhoto: { width: 80, height: 80, borderRadius: 40 },
  castPhotoPlaceholder: { backgroundColor: colors.background.active, justifyContent: 'center', alignItems: 'center' },
  castInitial: { ...typography.h2, color: colors.text.muted },
  castName: { ...typography.caption, color: colors.text.primary, marginTop: spacing.xs, textAlign: 'center' },
  castCharacter: { ...typography.tiny, color: colors.text.muted, textAlign: 'center' },

  // Similar
  similarList: { gap: spacing.md },
  similarCard: { width: 130, borderRadius: borderRadius.md, borderWidth: 0, backgroundColor: 'transparent' },
  similarPoster: { width: 130, height: 195, borderRadius: borderRadius.md },
  posterPlaceholder: { backgroundColor: colors.background.card, justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
  placeholderText: { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
  similarTitle: { ...typography.caption, color: colors.text.primary, marginTop: spacing.xs },
  similarMeta: { ...typography.tiny, color: colors.accent.amber },

  // Reviews
  reviewCard: { backgroundColor: colors.background.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reviewAuthor: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  reviewRating: { ...typography.caption, color: colors.accent.amber },
  reviewContent: { ...typography.body, color: colors.text.secondary, lineHeight: 24 },

  bottomSpacer: { height: spacing.xxxl },
});
