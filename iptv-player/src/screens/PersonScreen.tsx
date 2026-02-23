/**
 * PersonScreen - Yonetmen / Oyuncu Detay Sayfasi
 *
 * Bir oyuncu veya yonetmene tiklandiginda:
 * - Profil foto, isim, biyografi
 * - Filmografi: Film ve Dizi satirlari
 * - Yonetmenlik eserleri (yonetmen ise)
 * - Oyunculuk eserleri (oyuncu ise)
 * - Her eser icin poster, puan, yil, rol bilgisi
 *
 * Navigasyon: Film/Dizi tiklaninca detay ekranina gider
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
import { FocusableItem } from '@/components/common';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { RootStackParamList } from '@/types';
import {
  getFullPersonData,
  imageUrl,
  TMDBPerson,
  TMDBPersonCredit,
} from '@/services/tmdb';

type PersonScreenProps = NativeStackScreenProps<RootStackParamList, 'PersonDetail'>;

interface PersonData {
  details: TMDBPerson;
  actingCredits: TMDBPersonCredit[];
  directingCredits: TMDBPersonCredit[];
  producingCredits: TMDBPersonCredit[];
  movies: TMDBPersonCredit[];
  tvShows: TMDBPersonCredit[];
  totalCredits: number;
}

export const PersonScreen: React.FC = () => {
  const route = useRoute<PersonScreenProps['route']>();
  const navigation = useNavigation();
  const { personId, personName } = route.params;

  const [data, setData] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getFullPersonData(personId);
        setData(result);
      } catch {
        // Hata durumunda bos kalir
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [personId]);

  const handleCreditPress = useCallback((credit: TMDBPersonCredit) => {
    if (credit.media_type === 'movie') {
      navigation.navigate('MovieDetail' as never, {
        movieId: `movie_${credit.id}`,
      } as never);
    } else {
      navigation.navigate('SeriesDetail' as never, {
        seriesId: `series_${credit.id}`,
      } as never);
    }
  }, [navigation]);

  const renderCredit = useCallback(({ item }: { item: TMDBPersonCredit }) => {
    const year = item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0];
    const title = item.title || item.name || '';

    return (
      <FocusableItem
        onPress={() => handleCreditPress(item)}
        style={styles.creditCard}
      >
        {item.poster_path ? (
          <Image
            source={{ uri: imageUrl.poster(item.poster_path, 'w185')! }}
            style={styles.creditPoster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.creditPoster, styles.creditPosterPlaceholder]}>
            <Text style={styles.placeholderIcon}>
              {item.media_type === 'movie' ? '🎬' : '📺'}
            </Text>
          </View>
        )}

        {/* Rating badge */}
        {item.vote_average > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {item.vote_average.toFixed(1)}</Text>
          </View>
        )}

        <Text style={styles.creditTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.creditMeta}>
          {year && <Text style={styles.creditYear}>{year}</Text>}
          <Text style={styles.creditType}>
            {item.media_type === 'movie' ? 'Film' : 'Dizi'}
          </Text>
        </View>
        {item.character && (
          <Text style={styles.creditRole} numberOfLines={1}>
            {item.character}
          </Text>
        )}
        {item.job && (
          <Text style={styles.creditRole} numberOfLines={1}>
            {item.job}
          </Text>
        )}
      </FocusableItem>
    );
  }, [handleCreditPress]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.blue} />
        <Text style={styles.loadingText}>
          {personName || 'Kisi'} bilgileri yukleniyor...
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Bilgiler yuklenemedi</Text>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.retryButton}>
          <Text style={styles.retryText}>Geri Don</Text>
        </FocusableItem>
      </View>
    );
  }

  const { details, actingCredits, directingCredits, movies, tvShows, totalCredits } = data;
  const age = details.birthday
    ? new Date().getFullYear() - new Date(details.birthday).getFullYear()
    : null;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <FocusableItem
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hasTVPreferredFocus
          >
            <Text style={styles.backText}>{'<'} Geri</Text>
          </FocusableItem>
        </View>

        {/* Profil bilgisi */}
        <View style={styles.profileSection}>
          {/* Profil foto */}
          {details.profile_path ? (
            <Image
              source={{ uri: imageUrl.profile(details.profile_path, 'h632')! }}
              style={styles.profilePhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.profilePhoto, styles.profilePlaceholder]}>
              <Text style={styles.profileInitial}>
                {details.name.charAt(0)}
              </Text>
            </View>
          )}

          {/* Bilgiler */}
          <View style={styles.profileInfo}>
            <Text style={styles.personName}>{details.name}</Text>

            {details.known_for_department && (
              <Text style={styles.department}>
                {departmentLabel(details.known_for_department)}
              </Text>
            )}

            <View style={styles.statsRow}>
              {age && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>{age} yas</Text>
                </View>
              )}
              {details.place_of_birth && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText} numberOfLines={1}>
                    {details.place_of_birth.split(',').pop()?.trim()}
                  </Text>
                </View>
              )}
              <View style={styles.statBadge}>
                <Text style={styles.statText}>{totalCredits} yapim</Text>
              </View>
            </View>

            {/* Biyografi */}
            {details.biography ? (
              <View style={styles.bioSection}>
                <Text
                  style={styles.bioText}
                  numberOfLines={showFullBio ? undefined : 4}
                >
                  {details.biography}
                </Text>
                {details.biography.length > 200 && (
                  <FocusableItem
                    onPress={() => setShowFullBio(!showFullBio)}
                    style={styles.bioToggle}
                  >
                    <Text style={styles.bioToggleText}>
                      {showFullBio ? 'Daha az goster' : 'Devamini oku'}
                    </Text>
                  </FocusableItem>
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* Yonetmenlik eserleri */}
        {directingCredits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Yonetmenlik ({directingCredits.length})
            </Text>
            <FlatList
              horizontal
              data={directingCredits}
              keyExtractor={item => `dir_${item.id}_${item.media_type}`}
              renderItem={renderCredit}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creditList}
            />
          </View>
        )}

        {/* Filmler */}
        {movies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Filmler ({movies.length})
            </Text>
            <FlatList
              horizontal
              data={movies}
              keyExtractor={item => `movie_${item.id}`}
              renderItem={renderCredit}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creditList}
            />
          </View>
        )}

        {/* Diziler */}
        {tvShows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Diziler ({tvShows.length})
            </Text>
            <FlatList
              horizontal
              data={tvShows}
              keyExtractor={item => `tv_${item.id}`}
              renderItem={renderCredit}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creditList}
            />
          </View>
        )}

        {/* Tum oyunculuk */}
        {actingCredits.length > 0 && actingCredits.length !== movies.length + tvShows.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tum Oyunculuk ({actingCredits.length})
            </Text>
            <FlatList
              horizontal
              data={actingCredits}
              keyExtractor={item => `act_${item.id}_${item.media_type}`}
              renderItem={renderCredit}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creditList}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

// ─── Helpers ────────────────────────────────────────────

function departmentLabel(department: string): string {
  const labels: Record<string, string> = {
    Acting: 'Oyuncu',
    Directing: 'Yonetmen',
    Writing: 'Senarist',
    Production: 'Yapimci',
    Camera: 'Goruntu Yonetmeni',
    Editing: 'Kurgucu',
    Sound: 'Ses Tasarimcisi',
    Art: 'Sanat Yonetmeni',
    'Costume & Make-Up': 'Kostum ve Makyaj',
    'Visual Effects': 'Gorsel Efekt',
    Crew: 'Ekip',
  };
  return labels[department] || department;
}

// ─── Styles ─────────────────────────────────────────────

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

  // Header
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Profile
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  profilePhoto: {
    width: 180,
    height: 240,
    borderRadius: borderRadius.lg,
  },
  profilePlaceholder: {
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 48,
    color: colors.text.muted,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    paddingTop: spacing.md,
  },
  personName: {
    ...typography.h1,
    color: colors.text.primary,
  },
  department: {
    ...typography.body,
    color: colors.accent.blue,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  statBadge: {
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  statText: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Bio
  bioSection: {
    marginTop: spacing.lg,
  },
  bioText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  bioToggle: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  bioToggleText: {
    ...typography.caption,
    color: colors.accent.blue,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  creditList: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },

  // Credit card
  creditCard: {
    width: 140,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  creditPoster: {
    width: 140,
    height: 210,
    borderRadius: borderRadius.md,
  },
  creditPosterPlaceholder: {
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  creditTitle: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  creditMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  creditYear: {
    ...typography.tiny,
    color: colors.text.muted,
  },
  creditType: {
    ...typography.tiny,
    color: colors.text.muted,
    backgroundColor: colors.background.card,
    paddingHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  creditRole: {
    ...typography.tiny,
    color: colors.accent.blue,
    marginTop: 2,
  },

  bottomSpacer: {
    height: spacing.xxxl,
  },
});
