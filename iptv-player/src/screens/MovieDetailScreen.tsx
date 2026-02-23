/**
 * MovieDetailScreen - Film Detay Sayfasi
 *
 * TMDB API ile zengin icerik:
 * - Backdrop + Poster gorsel
 * - Baslik, yil, sure, puan, tur
 * - Ozet/aciklama
 * - Fragman butonu (YouTube)
 * - Oyuncu kadrosu (yatay scroll)
 * - Benzer filmler / Oneriler
 * - Koleksiyon (seri filmleri)
 * - Yorumlar
 * - Altyazi secimi
 * - Ses dili secimi
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
  getFullMovieData,
  imageUrl,
  TMDBCastMember,
  TMDBVideo,
  TMDBReview,
  TMDBListItem,
  TMDBCollection,
  TMDBMovie,
  TMDBCrewMember,
} from '@/services/tmdb';

type MovieDetailProps = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

interface MovieData {
  details: TMDBMovie;
  cast: TMDBCastMember[];
  director?: TMDBCrewMember;
  trailer?: TMDBVideo;
  allVideos: TMDBVideo[];
  similar: TMDBListItem[];
  recommendations: TMDBListItem[];
  reviews: TMDBReview[];
  collection: TMDBCollection | null;
}

export const MovieDetailScreen: React.FC = () => {
  const route = useRoute<MovieDetailProps['route']>();
  const navigation = useNavigation();
  const { movieId } = route.params;

  const [data, setData] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TMDB'den veri cek
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // movieId'den TMDB ID'yi cikar (orn: "movie_123" -> 123)
        const tmdbId = parseInt(movieId.replace('movie_', ''), 10);
        if (isNaN(tmdbId)) throw new Error('Gecersiz film ID');

        const result = await getFullMovieData(tmdbId);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Film bilgileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [movieId]);

  const handlePlay = useCallback(() => {
    navigation.navigate('VODPlayer' as never, {
      contentId: movieId,
      contentType: 'movie',
    } as never);
  }, [navigation, movieId]);

  const handleTrailer = useCallback(() => {
    if (data?.trailer) {
      // YouTube trailer URL'i
      // Uygulama icinde WebView veya YouTube player ile acilabilir
    }
  }, [data]);

  const handleSimilarPress = useCallback((item: TMDBListItem) => {
    navigation.navigate('MovieDetail' as never, {
      movieId: `movie_${item.id}`,
    } as never);
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.blue} />
        <Text style={styles.loadingText}>Film bilgileri yukleniyor...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'Bir hata olustu'}</Text>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.retryButton}>
          <Text style={styles.retryText}>Geri Don</Text>
        </FocusableItem>
      </View>
    );
  }

  const { details, cast, director, trailer, similar, recommendations, reviews, collection } = data;
  const year = details.release_date?.split('-')[0];
  const hours = Math.floor(details.runtime / 60);
  const mins = details.runtime % 60;
  const genres = details.genres.map(g => g.name).join(', ');

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop Gorsel */}
        <View style={styles.backdropContainer}>
          {details.backdrop_path && (
            <Image
              source={{ uri: imageUrl.backdrop(details.backdrop_path)! }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          )}
          <View style={styles.backdropOverlay} />

          {/* Geri butonu */}
          <FocusableItem
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'<'} Geri</Text>
          </FocusableItem>
        </View>

        {/* Film Bilgileri */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            {/* Poster */}
            {details.poster_path && (
              <Image
                source={{ uri: imageUrl.poster(details.poster_path, 'w342')! }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}

            {/* Detaylar */}
            <View style={styles.detailsColumn}>
              <Text style={styles.title}>{details.title}</Text>
              {details.original_title !== details.title && (
                <Text style={styles.originalTitle}>{details.original_title}</Text>
              )}
              {details.tagline ? (
                <Text style={styles.tagline}>"{details.tagline}"</Text>
              ) : null}

              {/* Meta bilgiler */}
              <View style={styles.metaRow}>
                {year && <Text style={styles.metaText}>{year}</Text>}
                {details.runtime > 0 && (
                  <Text style={styles.metaText}>{hours}s {mins}dk</Text>
                )}
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>
                    * {details.vote_average.toFixed(1)}
                  </Text>
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

              {/* Yonetmen */}
              {director && (
                <Text style={styles.directorText}>Yonetmen: {director.name}</Text>
              )}

              {/* Diller */}
              {details.spoken_languages.length > 0 && (
                <Text style={styles.languagesText}>
                  Diller: {details.spoken_languages.map(l => l.name).join(', ')}
                </Text>
              )}

              {/* Aksiyon butonlari */}
              <View style={styles.actionRow}>
                <FocusableItem
                  onPress={handlePlay}
                  style={styles.playButton}
                  hasTVPreferredFocus
                >
                  <Text style={styles.playText}>Izle</Text>
                </FocusableItem>

                {trailer && (
                  <FocusableItem onPress={handleTrailer} style={styles.trailerButton}>
                    <Text style={styles.trailerText}>Fragman</Text>
                  </FocusableItem>
                )}

                <FocusableItem onPress={() => {}} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>* Favori</Text>
                </FocusableItem>

                <FocusableItem onPress={() => {}} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Altyazi</Text>
                </FocusableItem>
              </View>
            </View>
          </View>

          {/* Ozet */}
          {details.overview && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ozet</Text>
              <Text style={styles.overview}>{details.overview}</Text>
            </View>
          )}
        </View>

        {/* Oyuncu Kadrosu */}
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
                      <Text style={styles.castInitial}>
                        {item.name.charAt(0)}
                      </Text>
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

        {/* Koleksiyon / Seri Filmleri */}
        {collection && collection.parts.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{collection.name}</Text>
            <FlatList
              horizontal
              data={collection.parts}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FocusableItem
                  onPress={() => handleSimilarPress(item)}
                  style={styles.similarCard}
                >
                  {item.poster_path ? (
                    <Image
                      source={{ uri: imageUrl.poster(item.poster_path, 'w185')! }}
                      style={styles.similarPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.similarPoster, styles.posterPlaceholder]}>
                      <Text style={styles.placeholderText}>{item.title}</Text>
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {item.title || item.name}
                  </Text>
                  <Text style={styles.similarMeta}>
                    * {item.vote_average.toFixed(1)}
                    {item.release_date ? ` - ${item.release_date.split('-')[0]}` : ''}
                  </Text>
                </FocusableItem>
              )}
              contentContainerStyle={styles.similarList}
            />
          </View>
        )}

        {/* Benzer Filmler */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onerilen Filmler</Text>
            <FlatList
              horizontal
              data={recommendations}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FocusableItem
                  onPress={() => handleSimilarPress(item)}
                  style={styles.similarCard}
                >
                  {item.poster_path ? (
                    <Image
                      source={{ uri: imageUrl.poster(item.poster_path, 'w185')! }}
                      style={styles.similarPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.similarPoster, styles.posterPlaceholder]}>
                      <Text style={styles.placeholderText}>{item.title}</Text>
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {item.title || item.name}
                  </Text>
                  <Text style={styles.similarMeta}>
                    * {item.vote_average.toFixed(1)}
                  </Text>
                </FocusableItem>
              )}
              contentContainerStyle={styles.similarList}
            />
          </View>
        )}

        {/* Benzer Filmler (icerik bazli) */}
        {similar.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benzer Filmler</Text>
            <FlatList
              horizontal
              data={similar}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FocusableItem
                  onPress={() => handleSimilarPress(item)}
                  style={styles.similarCard}
                >
                  {item.poster_path ? (
                    <Image
                      source={{ uri: imageUrl.poster(item.poster_path, 'w185')! }}
                      style={styles.similarPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.similarPoster, styles.posterPlaceholder]}>
                      <Text style={styles.placeholderText}>{item.title}</Text>
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {item.title || item.name}
                  </Text>
                  <Text style={styles.similarMeta}>
                    * {item.vote_average.toFixed(1)}
                  </Text>
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
                    <Text style={styles.reviewRating}>
                      * {review.author_details.rating}/10
                    </Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={styles.reviewContent} numberOfLines={6}>
                  {review.content}
                </Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.status.danger,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.blue,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  retryText: {
    ...typography.body,
    color: colors.white,
  },

  // Backdrop
  backdropContainer: {
    height: 400,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 17, 23, 0.6)',
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.white,
  },

  // Info
  infoSection: {
    marginTop: -80,
    paddingHorizontal: spacing.xxl,
    zIndex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  poster: {
    width: 200,
    height: 300,
    borderRadius: borderRadius.lg,
  },
  detailsColumn: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  originalTitle: {
    ...typography.body,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.accent.amber,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  metaText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    ...typography.h3,
    color: colors.accent.amber,
  },
  voteCount: {
    ...typography.caption,
    color: colors.text.muted,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.active,
    borderWidth: 1,
    borderColor: colors.background.card,
  },
  genreText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  directorText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  languagesText: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  playButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.blue,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  playText: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
  },
  trailerButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.status.danger,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  trailerText: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    borderWidth: 0,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  overview: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 26,
  },

  // Cast
  castList: {
    gap: spacing.md,
  },
  castCard: {
    width: 100,
    alignItems: 'center',
  },
  castPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  castPhotoPlaceholder: {
    backgroundColor: colors.background.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castInitial: {
    ...typography.h2,
    color: colors.text.muted,
  },
  castName: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  castCharacter: {
    ...typography.tiny,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Similar / Recommendations
  similarList: {
    gap: spacing.md,
  },
  similarCard: {
    width: 130,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  similarPoster: {
    width: 130,
    height: 195,
    borderRadius: borderRadius.md,
  },
  posterPlaceholder: {
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  similarTitle: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  similarMeta: {
    ...typography.tiny,
    color: colors.accent.amber,
  },

  // Reviews
  reviewCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewAuthor: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  reviewRating: {
    ...typography.caption,
    color: colors.accent.amber,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.text.muted,
  },
  reviewContent: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  bottomSpacer: {
    height: spacing.xxxl,
  },
});
