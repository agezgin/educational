/**
 * AppNavigator - Uygulama navigasyon yapilandirmasi.
 *
 * Akis:
 * Hosgeldin (ilk kez) -> Playlist Ekle -> Ana Ekran
 * Ana Ekran -> Player / Filmler / Diziler / EPG / Ayarlar / Arama
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  PlayerScreen,
  MoviesScreen,
  SeriesScreen,
  MovieDetailScreen,
  SeriesDetailScreen,
  EPGScreen,
  SettingsScreen,
  PlaylistAddScreen,
  SearchScreen,
} from '@/screens';
import { useSettingsStore } from '@/store/settingsStore';
import { RootStackParamList } from '@/types';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Navigasyon temasi - koyu tema varsayilan */
const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent.blue,
    background: colors.background.primary,
    card: colors.background.card,
    text: colors.text.primary,
    border: colors.background.card,
    notification: colors.status.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

/** Ortak ekran ayarlari - TV icin headerless */
const screenOptions = {
  headerShown: false,
  animation: 'fade' as const,
  animationDuration: 150,
};

export const AppNavigator: React.FC = () => {
  const { isFirstLaunch, hasPlaylist } = useSettingsStore();

  // Baslangic ekranini belirle
  const initialRoute: keyof RootStackParamList = isFirstLaunch || !hasPlaylist
    ? 'PlaylistAdd'
    : 'Home';

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={screenOptions}
      >
        {/* Playlist Ekleme (ilk acilis veya ayarlardan) */}
        <Stack.Screen name="PlaylistAdd" component={PlaylistAddScreen} />

        {/* Ana Ekran - Kanal Listesi */}
        <Stack.Screen name="Home" component={HomeScreen} />

        {/* Canli TV Player */}
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ animation: 'none' }} // Aninda gecis
        />

        {/* Filmler */}
        <Stack.Screen name="Movies" component={MoviesScreen} />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />

        {/* Diziler */}
        <Stack.Screen name="SeriesList" component={SeriesScreen} />
        <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />

        {/* EPG - Program Rehberi */}
        <Stack.Screen name="EPG" component={EPGScreen} />

        {/* Arama */}
        <Stack.Screen name="Search" component={SearchScreen} />

        {/* Ayarlar */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
