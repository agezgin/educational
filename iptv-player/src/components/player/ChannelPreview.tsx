/**
 * Channel Preview (Quick Zapping)
 *
 * Hizli kanal degistirme onizlemesi:
 * - Kanal yukari/asagi tusuna basinca gosterilir
 * - Kucuk overlay (ekranin ustunde veya altinda)
 * - Kanal logosu + adi + EPG bilgisi
 * - 2 saniye sonra otomatik degisir
 * - OK/Enter ile hemen degistir
 * - Geri ile iptal
 *
 * < 1.5 saniye gecis hedefi icin.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/i18n/translations';

// ─── Types ──────────────────────────────────────────────

interface ChannelPreviewProps {
  visible: boolean;
  direction: 'up' | 'down' | null;
  channelName: string;
  channelNumber: number;
  channelLogo?: string;
  currentProgram?: string;
  nextProgram?: string;
  programProgress?: number;
}

interface NumberInputOverlayProps {
  visible: boolean;
  digits: string;
}

// ─── Channel Preview Component ──────────────────────────

export function ChannelPreview({
  visible,
  direction,
  channelName,
  channelNumber,
  currentProgram,
  nextProgram,
  programProgress,
}: ChannelPreviewProps) {
  if (!visible) return null;

  const { width: screenWidth } = Dimensions.get('window');

  return (
    <View style={[
      styles.container,
      direction === 'up' ? styles.positionTop : styles.positionBottom,
    ]}>
      <View
        style={styles.previewCard}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`${channelNumber} ${channelName}${currentProgram ? `, ${currentProgram}` : ''}`}
      >
        {/* Yon gostergesi */}
        <View style={styles.directionIndicator}>
          <Text style={styles.directionArrow}>
            {direction === 'up' ? '▲' : '▼'}
          </Text>
        </View>

        {/* Kanal numarasi */}
        <View style={styles.channelNumber}>
          <Text style={styles.channelNumberText}>{channelNumber}</Text>
        </View>

        {/* Kanal bilgisi */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>{channelName}</Text>
          {currentProgram && (
            <Text style={styles.currentProgram} numberOfLines={1}>
              {currentProgram}
            </Text>
          )}
          {nextProgram && (
            <Text style={styles.nextProgram} numberOfLines={1}>
              {t('next')}: {nextProgram}
            </Text>
          )}
        </View>

        {/* Program ilerlemesi */}
        {programProgress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${programProgress}%` }]} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Number Input Overlay ───────────────────────────────

/**
 * Kanal numarasi girisi gostergesi.
 * Kumandanin numpad'i ile kanal secimi.
 * Buyuk rakamlar ekranin sag ustunde.
 */
export function NumberInputOverlay({ visible, digits }: NumberInputOverlayProps) {
  if (!visible || !digits) return null;

  return (
    <View style={styles.numberContainer}>
      <View style={styles.numberBox}>
        <Text style={styles.numberDigits}>{digits}</Text>
        <View style={styles.numberUnderline} />
      </View>
    </View>
  );
}

// ─── Channel Switch Animation ───────────────────────────

/**
 * Kanal gecis animasyonu icin bilgi.
 * Kisa sureli: kanal adi + numara gosterilir.
 */
export function ChannelSwitchBanner({
  channelName,
  channelNumber,
  visible,
}: {
  channelName: string;
  channelNumber: number;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <View style={styles.switchBanner}>
      <Text style={styles.switchNumber}>{channelNumber}</Text>
      <View style={styles.switchDivider} />
      <Text style={styles.switchName}>{channelName}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // Channel Preview
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
  },
  positionTop: {
    top: 24,
  },
  positionBottom: {
    bottom: 80,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 27, 34, 0.92)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 14,
  },
  directionIndicator: {
    width: 28,
    alignItems: 'center',
  },
  directionArrow: {
    color: colors.accent.blue,
    fontSize: 18,
  },
  channelNumber: {
    backgroundColor: colors.accent.blue,
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  currentProgram: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 3,
  },
  nextProgram: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    width: 60,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#30363D',
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.blue,
    borderRadius: 1.5,
  },

  // Number Input
  numberContainer: {
    position: 'absolute',
    top: 40,
    right: 40,
    zIndex: 200,
  },
  numberBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: colors.accent.blue,
  },
  numberDigits: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },
  numberUnderline: {
    width: '100%',
    height: 3,
    backgroundColor: colors.accent.blue,
    borderRadius: 1.5,
    marginTop: 6,
  },

  // Switch Banner
  switchBanner: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  switchNumber: {
    color: colors.accent.blue,
    fontSize: 32,
    fontWeight: '800',
  },
  switchDivider: {
    width: 2,
    height: 28,
    backgroundColor: '#30363D',
    marginHorizontal: 16,
  },
  switchName: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
});
