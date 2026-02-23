/**
 * TurkIPTV Player - Ana Uygulama Giris Noktasi
 *
 * Baslangic stratejisi (dokumandan):
 * 1. Cache'den son playlist'i yukle (aninda)
 * 2. UI'i goster (< 2sn)
 * 3. Arka planda guncel veriyi cek
 * 4. Degisiklik varsa sessizce guncelle
 *
 * Splash screen YOK - direkt iceriye gec.
 */

import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { AppNavigator } from '@/navigation';
import { useSettingsStore } from '@/store/settingsStore';
import { useChannelStore } from '@/store/channelStore';
import { cacheManager } from '@/core/cache';

// Gelistirme sirasindaki gereksiz uyarilari kapat
LogBox.ignoreLogs(['Require cycle']);

const App: React.FC = () => {
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const setHasPlaylist = useSettingsStore(s => s.setHasPlaylist);
  const setFirstLaunch = useSettingsStore(s => s.setFirstLaunch);
  const setChannels = useChannelStore(s => s.setChannels);

  useEffect(() => {
    async function bootstrap() {
      // 1. Ayarlari cache'den yukle
      loadSettings();

      // 2. Kanal listesini cache'den yukle (hizli baslatma)
      const { channels, hasData } = await cacheManager.warmup();

      if (hasData) {
        setChannels(channels);
        setHasPlaylist(true);
        setFirstLaunch(false);
      }

      // 3. TODO: Arka planda guncel playlist'i cek ve guncelle
      // backgroundSync();
    }

    bootstrap();
  }, [loadSettings, setHasPlaylist, setFirstLaunch, setChannels]);

  return <AppNavigator />;
};

export default App;
