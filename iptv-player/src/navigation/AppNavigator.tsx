/**
 * AppNavigator - Uygulama navigasyon yapilandirmasi.
 *
 * Akis:
 * Hosgeldin (ilk kez) -> Playlist Ekle -> Ana Ekran
 * Ana Ekran -> Player / Filmler / Diziler / EPG / Ayarlar / Arama
 *
 * Eklenen:
 * - Deep linking konfigurasyonu (iptv:// URL scheme)
 * - Navigation state persistence (son ekrani hatirla)
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  MySeriesScreen,
  PersonScreen,
} from '@/screens';
import { useSettingsStore } from '@/store/settingsStore';
import { RootStackParamList } from '@/types';
import { colors } from '@/theme';
import { cacheManager } from '@/core/cache';

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

/** Deep linking konfigurasyonu */
const linking = {
  prefixes: ['iptv://', 'turkiptv://'],
  config: {
    screens: {
      Home: 'home',
      Player: 'channel/:channelId',
      Movies: 'movies',
      MovieDetail: 'movie/:movieId',
      SeriesList: 'series',
      SeriesDetail: 'series/:seriesId',
      EPG: 'epg',
      Search: 'search',
      MySeries: 'my-series',
      PersonDetail: 'person/:personId',
      Settings: 'settings',
      PlaylistAdd: 'playlist/add',
    },
  },
};

/** Navigation state persistence key */
const NAV_STATE_KEY = 'nav:state';

export const AppNavigator: React.FC = () => {
  const { isFirstLaunch, hasPlaylist } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<any>();

  // Baslangic ekranini belirle
  const initialRoute: keyof RootStackParamList = isFirstLaunch || !hasPlaylist
    ? 'PlaylistAdd'
    : 'Home';

  // Navigation state'i disk'ten yukle
  useEffect(() => {
    const restoreState = () => {
      try {
        const storage = (cacheManager.disk as any).storage;
        if (storage) {
          const savedState = storage.getString(NAV_STATE_KEY);
          if (savedState) {
            const state = JSON.parse(savedState);
            setInitialState(state);
          }
        }
      } catch {
        // State yuklenemezse varsayilani kullan
      } finally {
        setIsReady(true);
      }
    };

    restoreState();
  }, []);

  // Navigation state degistiginde kaydet
  const onStateChange = useCallback((state: any) => {
    try {
      const storage = (cacheManager.disk as any).storage;
      if (storage && state) {
        storage.set(NAV_STATE_KEY, JSON.stringify(state));
      }
    } catch {
      // Kaydetme hatasi - sessizce gec
    }
  }, []);

  if (!isReady) return null;

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={linking}
      initialState={initialState}
      onStateChange={onStateChange}
    >
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

        {/* Takip Edilen Diziler */}
        <Stack.Screen name="MySeries" component={MySeriesScreen} />

        {/* Yonetmen/Oyuncu Detay */}
        <Stack.Screen name="PersonDetail" component={PersonScreen} />

        {/* Ayarlar */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
