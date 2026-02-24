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
 *
 * Eklenen:
 * - Global ErrorBoundary (uygulama crash'lerini yakalar)
 * - ThemeProvider (dark/light/amoled tema destegi)
 * - Ekran Koruyucu sistemi (idle timer + gorsel animasyonlar)
 */

import React, { Component, useEffect, useCallback } from 'react';
import { LogBox, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppNavigator } from '@/navigation';
import { useSettingsStore } from '@/store/settingsStore';
import { useChannelStore } from '@/store/channelStore';
import { cacheManager } from '@/core/cache';
import { ThemeProvider } from '@/theme';
import { t } from '@/i18n/translations';
import { colors, typography, spacing } from '@/theme';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { ScreenSaver } from '@/components/screensaver';

// Gelistirme sirasindaki gereksiz uyarilari kapat
LogBox.ignoreLogs(['Require cycle']);

// ─── Error Boundary ─────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>!</Text>
          <Text style={errorStyles.title}>{t('errorAppCrash')}</Text>
          <Text style={errorStyles.message}>{t('errorAppCrashDesc')}</Text>
          {__DEV__ && this.state.error && (
            <Text style={errorStyles.debug}>{this.state.error.message}</Text>
          )}
          <TouchableOpacity style={errorStyles.button} onPress={this.handleRestart}>
            <Text style={errorStyles.buttonText}>{t('restartApp')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.xxl,
  },
  icon: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.status.danger,
    width: 96,
    height: 96,
    lineHeight: 96,
    textAlign: 'center',
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.status.danger,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  debug: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: '80%',
  },
  button: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});

// ─── App ────────────────────────────────────────────────

const App: React.FC = () => {
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const setHasPlaylist = useSettingsStore(s => s.setHasPlaylist);
  const setFirstLaunch = useSettingsStore(s => s.setFirstLaunch);
  const setChannels = useChannelStore(s => s.setChannels);
  const theme = useSettingsStore(s => s.theme);
  const accentColor = useSettingsStore(s => s.accentColor);
  const screensaverStyle = useSettingsStore(s => s.screensaverStyle);
  const screensaverTimeout = useSettingsStore(s => s.screensaverTimeout);

  const handleIdle = useCallback(() => {
    // Ekran koruyucu aktif olacak (isIdle state ile kontrol ediliyor)
  }, []);

  const handleActive = useCallback(() => {
    // Ekran koruyucu kapanacak
  }, []);

  const { isIdle, dismissIdle } = useIdleTimer({
    timeoutMs: screensaverTimeout * 60 * 1000, // dakika -> milisaniye
    onIdle: handleIdle,
    onActive: handleActive,
    enabled: screensaverStyle !== 'off',
  });

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

  return (
    <ErrorBoundary>
      <ThemeProvider mode={theme} accentColor={accentColor}>
        <AppNavigator />
        <ScreenSaver
          visible={isIdle}
          style={screensaverStyle}
          onDismiss={dismissIdle}
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
