/**
 * PlaylistAddScreen - Playlist ekleme ekrani.
 *
 * Iki mod:
 * 1. M3U URL - Direkt M3U/M3U8 playlist URL'i
 * 2. Xtream Codes - Server URL + Kullanici adi + Sifre
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FocusableItem } from '@/components/common';
import { colors, typography, spacing, borderRadius } from '@/theme';

type PlaylistMode = 'm3u' | 'xtream';

export const PlaylistAddScreen: React.FC = () => {
  const navigation = useNavigation();
  const [mode, setMode] = useState<PlaylistMode>('m3u');

  // M3U fields
  const [m3uUrl, setM3uUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');

  // Xtream fields
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSave = useCallback(() => {
    if (mode === 'm3u') {
      if (!m3uUrl.trim()) {
        Alert.alert('Hata', 'Lutfen bir M3U URL girin');
        return;
      }
      // TODO: Store'a kaydet ve parse et
      navigation.goBack();
    } else {
      if (!serverUrl.trim() || !username.trim() || !password.trim()) {
        Alert.alert('Hata', 'Lutfen tum alanlari doldurun');
        return;
      }
      // TODO: Store'a kaydet ve Xtream API'den cek
      navigation.goBack();
    }
  }, [mode, m3uUrl, serverUrl, username, password, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <FocusableItem onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>{'<'} Geri</Text>
        </FocusableItem>
        <Text style={styles.title}>Playlist Ekle</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Mod secimi */}
      <View style={styles.modeSelector}>
        <FocusableItem
          onPress={() => setMode('m3u')}
          style={[styles.modeButton, mode === 'm3u' && styles.modeButtonActive]}
          hasTVPreferredFocus={mode === 'm3u'}
        >
          <Text style={[styles.modeText, mode === 'm3u' && styles.modeTextActive]}>
            M3U URL
          </Text>
        </FocusableItem>
        <FocusableItem
          onPress={() => setMode('xtream')}
          style={[styles.modeButton, mode === 'xtream' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === 'xtream' && styles.modeTextActive]}>
            Xtream Codes
          </Text>
        </FocusableItem>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {mode === 'm3u' ? (
          <>
            <Text style={styles.label}>Playlist Adi (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder="Ornek: Ana Playlist"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.label}>M3U URL</Text>
            <TextInput
              style={styles.input}
              value={m3uUrl}
              onChangeText={setM3uUrl}
              placeholder="http://example.com/playlist.m3u"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://server.com:port"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Kullanici Adi</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Sifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              placeholderTextColor={colors.text.muted}
              secureTextEntry
            />
          </>
        )}

        {/* Kaydet butonu */}
        <FocusableItem onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Kaydet ve Yukle</Text>
        </FocusableItem>
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
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  placeholder: {
    width: 80,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  modeButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 0,
  },
  modeButtonActive: {
    backgroundColor: colors.accent.blue,
  },
  modeText: {
    ...typography.h3,
    color: colors.text.secondary,
  },
  modeTextActive: {
    color: colors.white,
  },
  form: {
    paddingHorizontal: spacing.xxxl,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.active,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saveButton: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.blue,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 0,
  },
  saveText: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
  },
});
