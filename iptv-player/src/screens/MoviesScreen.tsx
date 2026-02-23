/**
 * MoviesScreen - Netflix Tarzi Film Gozatma
 *
 * Eski: Duz poster grid + sol kategori listesi
 * Yeni: Netflix/HBO Max tarzi:
 *   - Hero banner (en populer film)
 *   - "Kaldığın Yerden Devam Et" satiri
 *   - Platform satirlari (Netflix, TOD, Disney+)
 *   - Tur satirlari (Aksiyon, Dram, Komedi)
 *   - "En Yüksek Puanlı" satiri
 *   - "Listem" (favoriler) satiri
 *
 * IPTV kategorileri otomatik olarak akilli satirlara donusturulur.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVODStore } from '@/store/vodStore';
import { colors } from '@/theme';
import { RootStackParamList } from '@/types';
import { NetflixBrowse } from '@/components/vod/NetflixBrowse';
import {
  transformMovieCatalog,
  extractPlatforms,
  CatalogItem,
} from '@/services/catalogTransformer';

type MoviesNav = NativeStackNavigationProp<RootStackParamList, 'Movies'>;

export const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesNav>();
  const { movies, movieGroups, toggleMovieFavorite } = useVODStore();
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  // IPTV kategorilerini Netflix satirlarina donustur
  const rows = useMemo(
    () => transformMovieCatalog(movies, movieGroups),
    [movies, movieGroups],
  );

  // Platformlari cikar
  const platforms = useMemo(
    () => extractPlatforms(movieGroups),
    [movieGroups],
  );

  // Favori ID'leri
  const watchlistIds = useMemo(
    () => new Set(movies.filter(m => m.isFavorite).map(m => m.id)),
    [movies],
  );

  const handleItemPress = useCallback((item: CatalogItem) => {
    navigation.navigate('MovieDetail', { movieId: item.id });
  }, [navigation]);

  const handlePlayPress = useCallback((item: CatalogItem) => {
    navigation.navigate('VODPlayer' as never, {
      contentId: item.id,
      contentType: 'movie',
    } as never);
  }, [navigation]);

  const handleAddToList = useCallback((item: CatalogItem) => {
    toggleMovieFavorite(item.id);
  }, [toggleMovieFavorite]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <NetflixBrowse
        rows={rows}
        platforms={platforms}
        onItemPress={handleItemPress}
        onPlayPress={handlePlayPress}
        onAddToList={handleAddToList}
        activePlatform={activePlatform}
        onPlatformFilter={setActivePlatform}
        watchlistIds={watchlistIds}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
