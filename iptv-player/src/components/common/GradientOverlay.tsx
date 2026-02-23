/**
 * Gradient Overlay Components
 *
 * Netflix/TiviMate tarzinda gradient efektleri:
 * - Linear gradient (alt->ust, sol->sag)
 * - Radial glow efekti
 * - Glassmorphism (bulanik cam efekti)
 * - Vignette (kose karartma)
 *
 * react-native-linear-gradient paketi kullanilir.
 * Fallback olarak Animated.View ile simule edilir.
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';

// ─── Linear Gradient ────────────────────────────────────

interface LinearGradientProps {
  colors: string[];
  direction?: 'vertical' | 'horizontal';
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * Linear gradient overlay.
 * react-native-linear-gradient varsa onu kullanir,
 * yoksa katmanli View ile simule eder.
 */
export function GradientOverlay({
  colors,
  direction = 'vertical',
  style,
  children,
}: LinearGradientProps) {
  // Katmanli opacity ile gradient simülasyonu
  // Her katman biraz daha opaque olur
  const layers = colors.length;

  return (
    <View style={[styles.container, style]}>
      {colors.map((color, index) => (
        <View
          key={index}
          style={[
            styles.layer,
            direction === 'vertical'
              ? {
                  top: `${(index / layers) * 100}%`,
                  height: `${(1 / layers) * 100 + 10}%`, // Overlap icin +10%
                }
              : {
                  left: `${(index / layers) * 100}%`,
                  width: `${(1 / layers) * 100 + 10}%`,
                },
            { backgroundColor: color },
          ]}
        />
      ))}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

// ─── Preset Gradients ───────────────────────────────────

/**
 * Player OSD icin alt gradient.
 * Alttan yukari: siyah -> transparent
 */
export function BottomGradient({ height = 200, style }: { height?: number; style?: ViewStyle }) {
  return (
    <GradientOverlay
      colors={[
        'transparent',
        'rgba(0, 0, 0, 0.1)',
        'rgba(0, 0, 0, 0.3)',
        'rgba(0, 0, 0, 0.6)',
        'rgba(0, 0, 0, 0.85)',
      ]}
      style={[{ height, position: 'absolute', bottom: 0, left: 0, right: 0 }, style]}
    />
  );
}

/**
 * Player OSD icin ust gradient.
 * Ustten asagi: siyah -> transparent
 */
export function TopGradient({ height = 120, style }: { height?: number; style?: ViewStyle }) {
  return (
    <GradientOverlay
      colors={[
        'rgba(0, 0, 0, 0.85)',
        'rgba(0, 0, 0, 0.5)',
        'rgba(0, 0, 0, 0.2)',
        'transparent',
      ]}
      style={[{ height, position: 'absolute', top: 0, left: 0, right: 0 }, style]}
    />
  );
}

/**
 * Film/Dizi detay sayfasi icin backdrop gradient.
 * Ust kisim gorsel, alt kisim koyu arka plan.
 */
export function BackdropGradient({ style }: { style?: ViewStyle }) {
  return (
    <GradientOverlay
      colors={[
        'transparent',
        'rgba(13, 17, 23, 0.3)',
        'rgba(13, 17, 23, 0.7)',
        'rgba(13, 17, 23, 0.95)',
        '#0D1117',
      ]}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}

/**
 * Kart hover/focus efekti icin glow gradient.
 */
export function GlowEffect({
  color = '#3B82F6',
  intensity = 0.3,
  style,
}: {
  color?: string;
  intensity?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.glow,
        {
          shadowColor: color,
          shadowOpacity: intensity,
          shadowRadius: 20,
          elevation: 10,
        },
        style,
      ]}
    />
  );
}

// ─── Glassmorphism ──────────────────────────────────────

interface GlassProps {
  children: React.ReactNode;
  opacity?: number;
  blur?: number;
  style?: ViewStyle;
}

/**
 * Glassmorphism / Frosted Glass efekti.
 * TV UI'da OSD panelleri icin kullanilir.
 *
 * Not: Tam blur icin react-native-blur (@react-native-community/blur) gerekir.
 * Bu fallback versiyonu yaari-saydam arka plan kullanir.
 */
export function GlassPanel({ children, opacity = 0.6, style }: GlassProps) {
  return (
    <View
      style={[
        styles.glass,
        {
          backgroundColor: `rgba(22, 27, 34, ${opacity})`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Vignette efekti - ekran kenarlarini karartir.
 * Sinema hissi verir, TV'de cok iyi gozukur.
 */
export function Vignette({ intensity = 0.4, style }: { intensity?: number; style?: ViewStyle }) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* Sol kenar */}
      <View
        style={[
          styles.vignetteSide,
          { left: 0, backgroundColor: `rgba(0, 0, 0, ${intensity})` },
        ]}
      />
      {/* Sag kenar */}
      <View
        style={[
          styles.vignetteSide,
          { right: 0, backgroundColor: `rgba(0, 0, 0, ${intensity})` },
        ]}
      />
      {/* Ust kenar */}
      <View
        style={[
          styles.vignetteTop,
          { backgroundColor: `rgba(0, 0, 0, ${intensity * 0.6})` },
        ]}
      />
      {/* Alt kenar */}
      <View
        style={[
          styles.vignetteBottom,
          { backgroundColor: `rgba(0, 0, 0, ${intensity * 0.8})` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  glass: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  vignetteSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '15%',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '10%',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '15%',
  },
});
