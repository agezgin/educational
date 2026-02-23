/**
 * PlayerScreen - Canli TV Player (Tam Ekran)
 *
 * OSD davranisi:
 * - OK -> OSD ac/kapat
 * - Yukari/Asagi -> Kanal degistir (OSD acikken de kapaliyken de)
 * - Sol/Sag -> Ses kontrol
 * - 5sn hareketsizlik -> OSD otomatik kapanir
 *
 * Preloading: Ust/alt 2 kanalin stream'i arka planda hazirlanir.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OSDOverlay } from '@/components/player/OSDOverlay';
import { useChannelStore } from '@/store/channelStore';
import { usePlayerStore } from '@/store/playerStore';
import { colors } from '@/theme';
import { RootStackParamList } from '@/types';
import { PreloadManager } from '@/core/player';
import { getCurrentProgram, getNextProgram, getProgramProgress } from '@/core/epg';

type PlayerProps = NativeStackScreenProps<RootStackParamList, 'Player'>;

export const PlayerScreen: React.FC = () => {
  const route = useRoute<PlayerProps['route']>();
  const navigation = useNavigation();
  const { channelId } = route.params;

  const {
    channels,
    activeGroupChannels,
    currentChannel,
    currentChannelIndex,
    setCurrentChannel,
    switchChannelUp,
    switchChannelDown,
    toggleFavorite,
  } = useChannelStore();

  const { osd, showOSD, hideOSD, updateOSD, volume, setVolume } = usePlayerStore();

  const preloadManager = useRef(new PreloadManager(2)).current;

  // Kanal yukleme
  useEffect(() => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
    }
  }, [channelId, channels, setCurrentChannel]);

  // Preload komsu kanallari
  useEffect(() => {
    if (currentChannelIndex >= 0) {
      preloadManager.updatePreloadQueue(activeGroupChannels, currentChannelIndex);
    }
  }, [currentChannelIndex, activeGroupChannels, preloadManager]);

  // OSD bilgilerini guncelle
  useEffect(() => {
    if (currentChannel) {
      updateOSD({
        channelName: currentChannel.name,
        channelLogo: currentChannel.logoUrl,
        channelNumber: currentChannel.number,
        volume,
      });
    }
  }, [currentChannel, volume, updateOSD]);

  const handleOSDTimeout = useCallback(() => {
    hideOSD();
  }, [hideOSD]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video Player Alani */}
      <View style={styles.videoContainer}>
        {/* react-native-video burada olacak */}
        {/* <Video source={{ uri: currentChannel?.url }} ... /> */}
      </View>

      {/* OSD Overlay */}
      <OSDOverlay
        info={osd}
        onTimeout={handleOSDTimeout}
        timeoutMs={5000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
