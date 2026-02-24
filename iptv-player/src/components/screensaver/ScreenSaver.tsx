/**
 * ScreenSaver - Gorsel Ekran Koruyucu
 *
 * 3 farkli mod:
 * 1. floating  - Kanal logosu + saat, ekranda yavasce suruklenir (burn-in onleme)
 * 2. clock     - Buyuk dijital saat + tarih, yumusakca hareket eder
 * 3. gradient  - Canli renk gecisleri (ambient/aurora efekti) + saat
 *
 * Ozellikler:
 * - Fade-in/out gecisleri
 * - TV kumanda tusuna basilinca aninda kapanir
 * - Burn-in onleme icin pozisyon degisimi
 * - Dusuk GPU kullanimi (native driver animasyonlar)
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { colors, spacing, typography } from '@/theme';
import type { ScreensaverStyle } from '@/hooks/useIdleTimer';

interface ScreenSaverProps {
  /** Ekran koruyucu gorunur mu? */
  visible: boolean;
  /** Ekran koruyucu stili */
  style: ScreensaverStyle;
  /** Kapatildiginda cagirilir */
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Saat Bileşeni ─────────────────────────────────────

function useCurrentTime() {
  const [time, setTime] = React.useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ─── Floating Style ────────────────────────────────────

function FloatingScreenSaver() {
  const time = useCurrentTime();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Ekranda yavasce dolasan animasyon (burn-in onleme)
  useEffect(() => {
    const maxX = SCREEN_WIDTH * 0.5;
    const maxY = SCREEN_HEIGHT * 0.4;

    const animateX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: maxX,
          duration: 25000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -maxX * 0.3,
          duration: 30000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 20000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );

    const animateY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -maxY,
          duration: 20000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: maxY * 0.5,
          duration: 28000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 22000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );

    animateX.start();
    animateY.start();

    return () => {
      animateX.stop();
      animateY.stop();
    };
  }, [translateX, translateY]);

  return (
    <Animated.View
      style={[
        floatingStyles.container,
        {
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Text style={floatingStyles.appName}>TurkIPTV</Text>
      <Text style={floatingStyles.time}>{formatTime(time)}</Text>
      <Text style={floatingStyles.date}>{formatDate(time)}</Text>
    </Animated.View>
  );
}

const floatingStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent.blue,
    marginBottom: spacing.md,
    letterSpacing: 2,
    textShadowColor: 'rgba(59, 130, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    color: colors.text.primary,
    letterSpacing: 4,
    textShadowColor: 'rgba(240, 246, 252, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  date: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.text.secondary,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
});

// ─── Clock Style ───────────────────────────────────────

function ClockScreenSaver() {
  const time = useCurrentTime();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const colonOpacity = useRef(new Animated.Value(1)).current;

  // Yavaz pozisyon degisimi (burn-in onleme)
  useEffect(() => {
    const moveX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 80,
          duration: 45000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -80,
          duration: 45000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const moveY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 40,
          duration: 35000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -40,
          duration: 35000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    moveX.start();
    moveY.start();

    return () => {
      moveX.stop();
      moveY.stop();
    };
  }, [translateX, translateY]);

  // Iki nokta yanip sonme efekti
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(colonOpacity, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(colonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    blink.start();
    return () => blink.stop();
  }, [colonOpacity]);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <Animated.View
      style={[
        clockStyles.container,
        { transform: [{ translateX }, { translateY }] },
      ]}
    >
      <View style={clockStyles.timeRow}>
        <Text style={clockStyles.digit}>{hours}</Text>
        <Animated.Text style={[clockStyles.colon, { opacity: colonOpacity }]}>
          :
        </Animated.Text>
        <Text style={clockStyles.digit}>{minutes}</Text>
        <Text style={clockStyles.seconds}>{seconds}</Text>
      </View>
      <Text style={clockStyles.date}>{formatDate(time)}</Text>
      <View style={clockStyles.divider} />
      <Text style={clockStyles.appName}>TurkIPTV Player</Text>
    </Animated.View>
  );
}

const clockStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  digit: {
    fontSize: 120,
    fontWeight: '100',
    color: colors.text.primary,
    letterSpacing: 2,
    textShadowColor: 'rgba(240, 246, 252, 0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  colon: {
    fontSize: 100,
    fontWeight: '100',
    color: colors.accent.blue,
    marginHorizontal: spacing.xs,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  seconds: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text.muted,
    marginLeft: spacing.sm,
    marginBottom: 18,
  },
  date: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text.secondary,
    marginTop: spacing.lg,
    letterSpacing: 1.5,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: colors.text.muted,
    marginVertical: spacing.lg,
    opacity: 0.3,
  },
  appName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

// ─── Gradient/Aurora Style ─────────────────────────────

function GradientScreenSaver() {
  const time = useCurrentTime();

  // Coklu renk katmani animasyonlari
  const layer1Opacity = useRef(new Animated.Value(0.3)).current;
  const layer2Opacity = useRef(new Animated.Value(0.5)).current;
  const layer3Opacity = useRef(new Animated.Value(0.2)).current;
  const layer1X = useRef(new Animated.Value(0)).current;
  const layer1Y = useRef(new Animated.Value(0)).current;
  const layer2X = useRef(new Animated.Value(0)).current;
  const layer2Y = useRef(new Animated.Value(0)).current;
  const layer3X = useRef(new Animated.Value(0)).current;
  const layer3Y = useRef(new Animated.Value(0)).current;
  const layer1Scale = useRef(new Animated.Value(1)).current;
  const layer2Scale = useRef(new Animated.Value(1.2)).current;
  const layer3Scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Katman 1 - Mavi blob
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(layer1Opacity, {
          toValue: 0.6,
          duration: 8000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer1Opacity, {
          toValue: 0.2,
          duration: 8000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a1x = Animated.loop(
      Animated.sequence([
        Animated.timing(layer1X, {
          toValue: 200,
          duration: 18000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer1X, {
          toValue: -150,
          duration: 22000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a1y = Animated.loop(
      Animated.sequence([
        Animated.timing(layer1Y, {
          toValue: -100,
          duration: 15000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer1Y, {
          toValue: 120,
          duration: 20000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a1s = Animated.loop(
      Animated.sequence([
        Animated.timing(layer1Scale, {
          toValue: 1.4,
          duration: 12000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer1Scale, {
          toValue: 0.9,
          duration: 12000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );

    // Katman 2 - Mor blob
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(layer2Opacity, {
          toValue: 0.3,
          duration: 10000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer2Opacity, {
          toValue: 0.7,
          duration: 10000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a2x = Animated.loop(
      Animated.sequence([
        Animated.timing(layer2X, {
          toValue: -180,
          duration: 20000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer2X, {
          toValue: 160,
          duration: 25000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a2y = Animated.loop(
      Animated.sequence([
        Animated.timing(layer2Y, {
          toValue: 150,
          duration: 17000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer2Y, {
          toValue: -80,
          duration: 23000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a2s = Animated.loop(
      Animated.sequence([
        Animated.timing(layer2Scale, {
          toValue: 0.8,
          duration: 14000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer2Scale, {
          toValue: 1.5,
          duration: 14000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );

    // Katman 3 - Turkuaz blob
    const a3 = Animated.loop(
      Animated.sequence([
        Animated.timing(layer3Opacity, {
          toValue: 0.5,
          duration: 12000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer3Opacity, {
          toValue: 0.15,
          duration: 12000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a3x = Animated.loop(
      Animated.sequence([
        Animated.timing(layer3X, {
          toValue: 140,
          duration: 22000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer3X, {
          toValue: -200,
          duration: 18000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a3y = Animated.loop(
      Animated.sequence([
        Animated.timing(layer3Y, {
          toValue: -130,
          duration: 19000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer3Y, {
          toValue: 100,
          duration: 21000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const a3s = Animated.loop(
      Animated.sequence([
        Animated.timing(layer3Scale, {
          toValue: 1.3,
          duration: 16000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(layer3Scale, {
          toValue: 0.7,
          duration: 16000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );

    const allAnims = [a1, a1x, a1y, a1s, a2, a2x, a2y, a2s, a3, a3x, a3y, a3s];
    allAnims.forEach(a => a.start());

    return () => allAnims.forEach(a => a.stop());
  }, [
    layer1Opacity, layer1X, layer1Y, layer1Scale,
    layer2Opacity, layer2X, layer2Y, layer2Scale,
    layer3Opacity, layer3X, layer3Y, layer3Scale,
  ]);

  const blobSize = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.7;

  return (
    <View style={gradientStyles.container}>
      {/* Renk katmanlari */}
      <Animated.View
        style={[
          gradientStyles.blob,
          {
            width: blobSize,
            height: blobSize,
            borderRadius: blobSize / 2,
            backgroundColor: '#3B82F6',
            opacity: layer1Opacity,
            transform: [
              { translateX: layer1X },
              { translateY: layer1Y },
              { scale: layer1Scale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          gradientStyles.blob,
          {
            width: blobSize * 0.85,
            height: blobSize * 0.85,
            borderRadius: (blobSize * 0.85) / 2,
            backgroundColor: '#8B5CF6',
            opacity: layer2Opacity,
            transform: [
              { translateX: layer2X },
              { translateY: layer2Y },
              { scale: layer2Scale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          gradientStyles.blob,
          {
            width: blobSize * 0.75,
            height: blobSize * 0.75,
            borderRadius: (blobSize * 0.75) / 2,
            backgroundColor: '#06B6D4',
            opacity: layer3Opacity,
            transform: [
              { translateX: layer3X },
              { translateY: layer3Y },
              { scale: layer3Scale },
            ],
          },
        ]}
      />

      {/* Saat (uzerinde) */}
      <View style={gradientStyles.clockOverlay}>
        <Text style={gradientStyles.time}>{formatTime(time)}</Text>
        <Text style={gradientStyles.date}>{formatDate(time)}</Text>
      </View>
    </View>
  );
}

const gradientStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  clockOverlay: {
    alignItems: 'center',
    zIndex: 10,
  },
  time: {
    fontSize: 88,
    fontWeight: '200',
    color: colors.white,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  date: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.md,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
});

// ─── Ana ScreenSaver Bileşeni ──────────────────────────

export const ScreenSaver: React.FC<ScreenSaverProps> = ({
  visible,
  style: ssStyle,
  onDismiss,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 1500 : 400,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Ekran koruyucu gorunur degilse veya kapaliysa render etme
  if (!visible && ssStyle === 'off') return null;

  const renderContent = () => {
    switch (ssStyle) {
      case 'floating':
        return <FloatingScreenSaver />;
      case 'clock':
        return <ClockScreenSaver />;
      case 'gradient':
        return <GradientScreenSaver />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
        !visible && styles.hidden,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {renderContent()}

      {/* Kapatma ipucu */}
      {visible && (
        <View style={styles.dismissHint}>
          <Text style={styles.dismissText}>Herhangi bir tusa basin</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  hidden: {
    pointerEvents: 'none',
  },
  dismissHint: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    opacity: 0.3,
  },
  dismissText: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 1,
  },
});
