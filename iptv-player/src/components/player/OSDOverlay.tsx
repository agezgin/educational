/**
 * OSD (On Screen Display) Overlay - Player uzerindeki bilgi katmani.
 *
 * Davranisi:
 * - OK tusuna basinca acilir
 * - 5sn hareketsizlik -> otomatik kapanir
 * - Yukari/Asagi -> Kanal degistir (OSD kapaliyken de calisir)
 * - Sol/Sag -> Ses kontrol
 *
 * Gorsel:
 * +-----------------------------------------------------+
 * | ^ CH+                                                |
 * |  +-------+  TRT 1 HD                    20:00       |
 * |  | LOGO  |  Ana Haber Bulteni                       |
 * |  | TRT 1 |  ================--------- %65           |
 * |  +-------+  Sonra: Spor Bulteni (21:00)             |
 * | v CH-                                     Vol 85%    |
 * +-----------------------------------------------------+
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { ProgressBar } from '@/components/common';
import { colors, typography, spacing, borderRadius, OSD_HEIGHT } from '@/theme';
import { OSDInfo } from '@/types';
import { t } from '@/i18n/translations';

interface OSDOverlayProps {
  info: OSDInfo;
  onTimeout: () => void;
  timeoutMs?: number;
}

export const OSDOverlay: React.FC<OSDOverlayProps> = memo(({
  info,
  onTimeout,
  timeoutMs = 5000,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (info.visible) {
      // OSD goster
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Otomatik gizle
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onTimeout());
      }, timeoutMs);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => clearTimeout(timeoutRef.current);
  }, [info.visible, fadeAnim, onTimeout, timeoutMs]);

  if (!info.visible) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${info.channelName}, ${t('volume')} ${info.volume}%`}
    >
      {/* Kanal yukari gostergesi */}
      <Text style={styles.channelSwitch} accessibilityLabel={t('channelUp')}>CH+</Text>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {info.channelLogo ? (
            <Image
              source={{ uri: info.channelLogo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>
                {info.channelName.substring(0, 3).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Bilgiler */}
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.channelName}>{info.channelName}</Text>
            {info.channelNumber && (
              <Text style={styles.time}>#{info.channelNumber}</Text>
            )}
          </View>

          {info.currentProgram && (
            <>
              <Text style={styles.programTitle}>{info.currentProgram.title}</Text>
              <ProgressBar
                progress={info.currentProgram.progress}
                height={6}
                style={styles.progressBar}
              />
              {info.nextProgram && (
                <Text style={styles.nextProgram}>
                  {t('next')}: {info.nextProgram.title} ({formatTime(info.nextProgram.startTime)})
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Alt bilgi */}
      <View style={styles.footer}>
        <Text style={styles.channelSwitch} accessibilityLabel={t('channelDown')}>CH-</Text>
        <Text style={styles.volumeText}>Vol {info.volume}%</Text>
      </View>
    </Animated.View>
  );
});

OSDOverlay.displayName = 'OSDOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    height: OSD_HEIGHT,
    backgroundColor: colors.background.overlay,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  channelSwitch: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 60,
    height: 60,
    marginRight: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  channelName: {
    ...typography.h2,
    color: colors.text.primary,
  },
  time: {
    ...typography.body,
    color: colors.text.muted,
  },
  programTitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  progressBar: {
    marginBottom: spacing.xs,
  },
  nextProgram: {
    ...typography.caption,
    color: colors.text.muted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
