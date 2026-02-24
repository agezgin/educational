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
 *
 * Eklenen: Loading state, Error state, Retry butonu
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OSDOverlay } from '@/components/player/OSDOverlay';
import { useChannelStore } from '@/store/channelStore';
import { usePlayerStore } from '@/store/playerStore';
import { colors, typography, spacing } from '@/theme';
import { RootStackParamList } from '@/types';
import { PreloadManager } from '@/core/player';
import { getCurrentProgram, getNextProgram, getProgramProgress } from '@/core/epg';
import { t } from '@/i18n/translations';

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

  const { osd, state: playerState, showOSD, hideOSD, updateOSD, volume, setVolume, setState } = usePlayerStore();

  const preloadManager = useRef(new PreloadManager(2)).current;

  // Kanal yukleme
  useEffect(() => {
    setState('loading');
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
      setState('playing');
    } else {
      setState('error');
    }
  }, [channelId, channels, setCurrentChannel, setState]);

  // Preload komsu kanallari
  useEffect(() => {
    if (currentChannelIndex >= 0) {
      preloadManager.updatePreloadQueue(activeGroupChannels, currentChannelIndex);
    }
  }, [currentChannelIndex, activeGroupChannels, preloadManager]);

  // Cleanup preload manager on unmount
  useEffect(() => {
    return () => {
      preloadManager.dispose();
    };
  }, [preloadManager]);

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

  const handleRetry = useCallback(() => {
    setState('loading');
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
      setState('playing');
    }
  }, [channelId, channels, setCurrentChannel, setState]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video Player Alani */}
      <View style={styles.videoContainer}>
        {/* react-native-video burada olacak */}
        {/* <Video source={{ uri: currentChannel?.url }} ... /> */}

        {/* Loading State */}
        {playerState === 'loading' && (
          <View style={styles.stateOverlay} accessible={true} accessibilityLabel={t('loadingChannel')}>
            <ActivityIndicator size="large" color={colors.accent.blue} />
            <Text style={styles.stateText}>{t('loadingChannel')}</Text>
          </View>
        )}

        {/* Error State */}
        {playerState === 'error' && (
          <View style={styles.stateOverlay} accessible={true} accessibilityLabel={t('noChannelLoaded')}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.stateText}>{t('noChannelLoaded')}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('retry')}
            >
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  stateOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.status.danger,
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.status.danger,
    overflow: 'hidden',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent.blue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
