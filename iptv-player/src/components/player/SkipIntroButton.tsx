/**
 * Skip Intro / Outro Button
 *
 * Netflix tarzinda "Giriş Atla" butonu:
 * - Dizi girisi basladiginda otomatik gosterilir
 * - "Girişi Atla" / "Jeneriği Atla" / "Sonraki Bölüm"
 * - Animasyonlu belirme (sag alttan slide)
 * - 5 saniye sonra otomatik kaybolur
 * - Tek tusla atlama
 * - Sonraki bolume gecis butonu
 *
 * Intro tespiti:
 * - Manuel zaman aralikları (provider verisi)
 * - Ortalama intro suresi hesaplama (genelde 60-90s)
 * - Kullanici geri bildirimi ile ogrenme
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '@/theme/colors';

// ─── Types ──────────────────────────────────────────────

export interface IntroSegment {
  /** Intro baslangic zamani (saniye) */
  start: number;
  /** Intro bitis zamani (saniye) */
  end: number;
  /** Segment tipi */
  type: 'intro' | 'outro' | 'recap';
}

export interface SkipIntroProps {
  currentTime: number;
  duration: number;
  /** Intro/outro segment bilgileri */
  segments?: IntroSegment[];
  /** Atlama islemi */
  onSkip: (targetTime: number) => void;
  /** Sonraki bolume gec */
  onNextEpisode?: () => void;
  /** Mevcut bolum bilgisi */
  episodeInfo?: {
    season: number;
    episode: number;
    hasNext: boolean;
  };
}

// ─── Component ──────────────────────────────────────────

export const SkipIntroButton: React.FC<SkipIntroProps> = memo(({
  currentTime,
  duration,
  segments,
  onSkip,
  onNextEpisode,
  episodeInfo,
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [activeSegment, setActiveSegment] = useState<IntroSegment | null>(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aktif segment'i bul
  useEffect(() => {
    if (!segments || segments.length === 0) {
      // Segment bilgisi yoksa varsayilan intro tahmin et
      // Genelde 0-90 saniye arasi intro olur
      if (currentTime >= 5 && currentTime <= 90) {
        setActiveSegment({
          start: 0,
          end: estimateIntroEnd(duration),
          type: 'intro',
        });
        return;
      }

      setActiveSegment(null);
      return;
    }

    const current = segments.find(
      (seg) => currentTime >= seg.start && currentTime <= seg.end,
    );

    setActiveSegment(current || null);
  }, [currentTime, segments, duration]);

  // Sonraki bolum butonu (son 30 saniye)
  useEffect(() => {
    if (
      episodeInfo?.hasNext &&
      duration > 0 &&
      currentTime >= duration - 30 &&
      currentTime < duration
    ) {
      setShowNextEpisode(true);
    } else {
      setShowNextEpisode(false);
    }
  }, [currentTime, duration, episodeInfo]);

  // Animasyon: goster/gizle
  useEffect(() => {
    const shouldShow = activeSegment !== null || showNextEpisode;

    if (shouldShow) {
      // Goster
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Otomatik gizle (10 saniye)
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      autoHideRef.current = setTimeout(() => {
        hideButton();
      }, 10000);
    } else {
      hideButton();
    }

    return () => {
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, [activeSegment, showNextEpisode]);

  const hideButton = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Icerik belirleme
  const getButtonContent = (): { label: string; icon: string } | null => {
    if (showNextEpisode) {
      return {
        label: episodeInfo
          ? `Sonraki Bölüm (S${episodeInfo.season}B${episodeInfo.episode + 1})`
          : 'Sonraki Bölüm',
        icon: '⏭',
      };
    }

    if (activeSegment) {
      switch (activeSegment.type) {
        case 'intro':
          return { label: 'Girişi Atla', icon: '⏩' };
        case 'outro':
          return { label: 'Jeneriği Atla', icon: '⏩' };
        case 'recap':
          return { label: 'Özeti Atla', icon: '⏩' };
      }
    }

    return null;
  };

  const content = getButtonContent();
  if (!content) return null;

  const handlePress = () => {
    if (showNextEpisode) {
      onNextEpisode?.();
    } else if (activeSegment) {
      onSkip(activeSegment.end);
    }
    hideButton();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          showNextEpisode && styles.buttonNextEpisode,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>{content.icon}</Text>
        <Text style={styles.buttonLabel}>{content.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

SkipIntroButton.displayName = 'SkipIntroButton';

// ─── Intro Detection Helpers ────────────────────────────

/**
 * Intro bitis zamanini tahmin et.
 * Film: genelde intro yok veya 5-10s logo
 * Dizi: genelde 60-90s intro
 */
function estimateIntroEnd(duration: number): number {
  if (duration <= 0) return 30;

  // Kisa icerik (< 15dk) -> kisa intro
  if (duration < 900) return 30;

  // Normal bolum (15-60dk) -> standart intro
  if (duration < 3600) return 75;

  // Uzun icerik (film) -> logo skip
  return 15;
}

/**
 * Kullanici skip davranislarindan intro sure tahmini ogrenme.
 * Her skip yapildiginda zamani kaydeder.
 */
export function learnIntroPattern(
  seriesId: string,
  skipTimestamps: number[],
): IntroSegment | null {
  if (skipTimestamps.length < 3) return null;

  // En sik atlanan zaman araligi
  const sorted = skipTimestamps.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Ortalama +/- 10 saniye icindeki atlamalar
  const inRange = sorted.filter((t) => Math.abs(t - median) <= 10);

  if (inRange.length >= 2) {
    const avgEnd = Math.round(inRange.reduce((a, b) => a + b, 0) / inRange.length);
    return {
      start: 0,
      end: avgEnd,
      type: 'intro',
    };
  }

  return null;
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    zIndex: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    // Golge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonNextEpisode: {
    backgroundColor: colors.accent.blue,
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonLabel: {
    color: '#0D1117',
    fontSize: 15,
    fontWeight: '700',
  },
});
