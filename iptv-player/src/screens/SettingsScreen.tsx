/**
 * SettingsScreen - Ayarlar Ekrani
 *
 * Bolumler:
 * - Playlist Yonetimi
 * - Gorunum (Tema, Renk, Font, Liste stili)
 * - Oynatma (Kalite, Buffer, HW Decoding, OSD)
 * - Ekran Koruyucu (Stil, Bekleme suresi)
 * - Ebeveyn Kontrolu
 * - Dil
 * - Hakkinda
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { FocusableItem } from '@/components/common';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, typography, spacing } from '@/theme';

const THEME_LABELS = { dark: 'Koyu', light: 'Acik', amoled: 'AMOLED Siyah' };
const ACCENT_LABELS = { blue: 'Mavi', red: 'Kirmizi', green: 'Yesil', orange: 'Turuncu' };
const FONT_LABELS = { normal: 'Normal', large: 'Buyuk' };
const LIST_LABELS = { list: 'Liste', grid: 'Grid' };
const LANG_LABELS = { tr: 'Turkce', en: 'English', de: 'Deutsch' };
const QUALITY_LABELS = { auto: 'Otomatik', '1080p': '1080p', '720p': '720p', '480p': '480p' };
const SCREENSAVER_STYLE_LABELS = {
  fireplace: 'Somine', snowfall: 'Kar Yagisi', starryNight: 'Yildizli Gece',
  aurora: 'Kuzey Isiklari', clock: 'Saat', off: 'Kapali',
};
const SCREENSAVER_TIMEOUT_LABELS = { 3: '3 dk', 5: '5 dk', 10: '10 dk', 15: '15 dk', 30: '30 dk' };

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const settings = useSettingsStore();

  const cycleTheme = useCallback(() => {
    const themes = ['dark', 'light', 'amoled'] as const;
    const idx = themes.indexOf(settings.theme);
    settings.setTheme(themes[(idx + 1) % themes.length]);
  }, [settings]);

  const cycleAccent = useCallback(() => {
    const accents = ['blue', 'red', 'green', 'orange'] as const;
    const idx = accents.indexOf(settings.accentColor);
    settings.setAccentColor(accents[(idx + 1) % accents.length]);
  }, [settings]);

  const cycleFontSize = useCallback(() => {
    settings.setFontSize(settings.fontSize === 'normal' ? 'large' : 'normal');
  }, [settings]);

  const cycleListStyle = useCallback(() => {
    settings.setListStyle(settings.listStyle === 'list' ? 'grid' : 'list');
  }, [settings]);

  const cycleLanguage = useCallback(() => {
    const langs = ['tr', 'en', 'de'] as const;
    const idx = langs.indexOf(settings.language);
    settings.setLanguage(langs[(idx + 1) % langs.length]);
  }, [settings]);

  const cycleQuality = useCallback(() => {
    const quals = ['auto', '1080p', '720p', '480p'] as const;
    const idx = quals.indexOf(settings.defaultQuality);
    settings.setDefaultQuality(quals[(idx + 1) % quals.length]);
  }, [settings]);

  const cycleBuffer = useCallback(() => {
    const bufs = [2, 5, 10] as const;
    const idx = bufs.indexOf(settings.bufferDuration);
    settings.setBufferDuration(bufs[(idx + 1) % bufs.length]);
  }, [settings]);

  const cycleOSD = useCallback(() => {
    const timeouts = [3, 5, 10] as const;
    const idx = timeouts.indexOf(settings.osdTimeout);
    settings.setOsdTimeout(timeouts[(idx + 1) % timeouts.length]);
  }, [settings]);

  const cycleScreensaverStyle = useCallback(() => {
    const styles = ['fireplace', 'snowfall', 'starryNight', 'aurora', 'clock', 'off'] as const;
    const idx = styles.indexOf(settings.screensaverStyle);
    settings.setScreensaverStyle(styles[(idx + 1) % styles.length]);
  }, [settings]);

  const cycleScreensaverTimeout = useCallback(() => {
    const timeouts = [3, 5, 10, 15, 30] as const;
    const idx = timeouts.indexOf(settings.screensaverTimeout);
    settings.setScreensaverTimeout(timeouts[(idx + 1) % timeouts.length]);
  }, [settings]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Geri</Text>
        </FocusableItem>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Playlist Yonetimi */}
        <SettingsSection title="Playlist Yonetimi">
          <SettingsItem
            label="Playlist Ekle (M3U URL)"
            onPress={() => navigation.navigate('PlaylistAdd')}
          />
          <SettingsItem
            label="Playlist Ekle (Xtream Codes)"
            onPress={() => navigation.navigate('PlaylistAdd')}
          />
          <SettingsItem label="Playlistlerim" onPress={() => {}} />
          <SettingsItem label="EPG Kaynagi Ayarla" onPress={() => {}} />
        </SettingsSection>

        {/* Gorunum */}
        <SettingsSection title="Gorunum">
          <SettingsItem
            label="Tema"
            value={THEME_LABELS[settings.theme]}
            type="select"
            onPress={cycleTheme}
          />
          <SettingsItem
            label="Vurgu Rengi"
            value={ACCENT_LABELS[settings.accentColor]}
            type="select"
            onPress={cycleAccent}
          />
          <SettingsItem
            label="Font Boyutu"
            value={FONT_LABELS[settings.fontSize]}
            type="select"
            onPress={cycleFontSize}
          />
          <SettingsItem
            label="Kanal Listesi Stili"
            value={LIST_LABELS[settings.listStyle]}
            type="select"
            onPress={cycleListStyle}
          />
        </SettingsSection>

        {/* Oynatma */}
        <SettingsSection title="Oynatma">
          <SettingsItem
            label="Varsayilan Kalite"
            value={QUALITY_LABELS[settings.defaultQuality]}
            type="select"
            onPress={cycleQuality}
          />
          <SettingsItem
            label="Buffer Suresi"
            value={`${settings.bufferDuration}sn`}
            type="select"
            onPress={cycleBuffer}
          />
          <SettingsItem
            label="Hardware Decoding"
            type="toggle"
            isEnabled={settings.hardwareDecoding}
            onPress={() => settings.setHardwareDecoding(!settings.hardwareDecoding)}
          />
          <SettingsItem
            label="OSD Sure"
            value={`${settings.osdTimeout}sn`}
            type="select"
            onPress={cycleOSD}
          />
        </SettingsSection>

        {/* Ekran Koruyucu */}
        <SettingsSection title="Ekran Koruyucu">
          <SettingsItem
            label="Koruyucu Stili"
            value={SCREENSAVER_STYLE_LABELS[settings.screensaverStyle]}
            type="select"
            onPress={cycleScreensaverStyle}
          />
          {settings.screensaverStyle !== 'off' && (
            <SettingsItem
              label="Bekleme Suresi"
              value={SCREENSAVER_TIMEOUT_LABELS[settings.screensaverTimeout]}
              type="select"
              onPress={cycleScreensaverTimeout}
            />
          )}
        </SettingsSection>

        {/* Ebeveyn Kontrolu */}
        <SettingsSection title="Ebeveyn Kontrolu">
          <SettingsItem label="PIN Ayarla" onPress={() => {}} />
          <SettingsItem label="Kilitli Kategoriler" onPress={() => {}} />
        </SettingsSection>

        {/* Dil */}
        <SettingsSection title="Dil">
          <SettingsItem
            label="Uygulama Dili"
            value={LANG_LABELS[settings.language]}
            type="select"
            onPress={cycleLanguage}
          />
        </SettingsSection>

        {/* Hakkinda */}
        <SettingsSection title="Hakkinda">
          <SettingsItem label="Surum" value="1.0.0" onPress={() => {}} />
          <SettingsItem label="Guncelleme Kontrol" onPress={() => {}} />
          <SettingsItem label="Geri Bildirim Gonder" onPress={() => {}} />
        </SettingsSection>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>^v Gezin</Text>
        <Text style={styles.footerText}>OK Sec</Text>
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
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  backText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  placeholder: {
    width: 80,
  },
  scrollView: {
    flex: 1,
    paddingTop: spacing.lg,
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
