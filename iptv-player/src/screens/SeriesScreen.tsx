/**
 * SeriesScreen - Netflix Tarzi Dizi Gozatma
 *
 * Netflix/HBO Max tarzi:
 *   - Hero banner (en populer dizi)
 *   - "Kaldığın Yerden Devam Et" satiri
 *   - Gun satirlari: "Cuma Aksami" (IPTV'nin "TR - CUMA DIZILERI" kategorisinden)
 *   - Platform satirlari (Netflix, TOD, Disney+)
 *   - Tur satirlari
 *   - "Listem" (favoriler)
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
  transformSeriesCatalog,
  extractPlatforms,
  CatalogItem,
} from '@/services/catalogTransformer';

type SeriesNav = NativeStackNavigationProp<RootStackParamList, 'SeriesList'>;

export const SeriesScreen: React.FC = () => {
  const navigation = useNavigation<SeriesNav>();
  const { seriesList, seriesGroups, toggleSeriesFavorite } = useVODStore();
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  // IPTV kategorilerini Netflix satirlarina donustur
  const rows = useMemo(
    () => transformSeriesCatalog(seriesList, seriesGroups),
    [seriesList, seriesGroups],
  );

  // Platformlari cikar
  const platforms = useMemo(
    () => extractPlatforms(seriesGroups),
    [seriesGroups],
  );

  // Favori ID'leri
  const watchlistIds = useMemo(
    () => new Set(seriesList.filter(s => s.isFavorite).map(s => s.id)),
    [seriesList],
  );

  const handleItemPress = useCallback((item: CatalogItem) => {
    navigation.navigate('SeriesDetail', { seriesId: item.id });
  }, [navigation]);

  const handleAddToList = useCallback((item: CatalogItem) => {
    toggleSeriesFavorite(item.id);
  }, [toggleSeriesFavorite]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <NetflixBrowse
        rows={rows}
        platforms={platforms}
        onItemPress={handleItemPress}
        onPlayPress={handleItemPress}
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
