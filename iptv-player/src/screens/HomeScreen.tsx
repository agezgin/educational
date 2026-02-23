/**
 * HomeScreen - Ana Ekran (Kanal Listesi)
 *
 * Sol: Kategori sidebar (Favoriler, Tumu, Haber, Spor, Filmler, Diziler...)
 * Sag: Virtualized kanal listesi + EPG bilgisi
 * Ust: Header (TurkIPTV Player + Ayarlar + Arama)
 *
 * 2 TIKLA KURALI: Kategori sec -> Kanal sec = Izlemeye basla
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategorySidebar } from '@/components/channel/CategorySidebar';
import { ChannelList } from '@/components/channel/ChannelList';
import { FocusableItem } from '@/components/common';
import { useChannelStore } from '@/store/channelStore';
import { colors, typography, spacing } from '@/theme';
import { Channel, RootStackParamList } from '@/types';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNav>();

  const {
    groups,
    activeGroupId,
    activeGroupChannels,
    currentChannel,
    favoriteIds,
    setActiveGroup,
    setCurrentChannel,
  } = useChannelStore();

  const handleChannelPress = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    navigation.navigate('Player', { channelId: channel.id });
  }, [navigation, setCurrentChannel]);

  const handleNavigateMovies = useCallback(() => {
    navigation.navigate('Movies');
  }, [navigation]);

  const handleNavigateSeries = useCallback(() => {
    navigation.navigate('SeriesList');
  }, [navigation]);

  const handleNavigateSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateSearch = useCallback(() => {
    navigation.navigate('Search', {});
  }, [navigation]);

  const handleNavigateEPG = useCallback(() => {
    navigation.navigate('EPG');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={handleNavigateEPG} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>EPG</Text>
        </FocusableItem>

        <Text style={styles.title}>TurkIPTV Player</Text>

        <View style={styles.headerRight}>
          <FocusableItem onPress={handleNavigateSearch} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Ara</Text>
          </FocusableItem>
          <FocusableItem onPress={handleNavigateSettings} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Ayarlar</Text>
          </FocusableItem>
        </View>
      </View>

      {/* Icerik: Sidebar + Liste */}
      <View style={styles.content}>
        <CategorySidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroup}
          favoriteCount={favoriteIds.size}
          onNavigateMovies={handleNavigateMovies}
          onNavigateSeries={handleNavigateSeries}
        />

        <View style={styles.channelListContainer}>
          <ChannelList
            channels={activeGroupChannels}
            currentChannelId={currentChannel?.id}
            onChannelPress={handleChannelPress}
          />
        </View>
      </View>

      {/* Footer: Kumanda navigasyon ipuclari */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{'<> Gezin'}</Text>
        <Text style={styles.footerText}>OK Izle</Text>
        <Text style={styles.footerText}>* Favori Ekle</Text>
        <Text style={styles.footerText}>{'<- Geri'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  headerButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  channelListContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.card,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
