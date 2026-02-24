/**
 * Theme Context - Runtime tema degistirme
 *
 * 3 tema destegi: dark (varsayilan), light, amoled
 * Renk paleti tema'ya gore otomatik degisir.
 * Responsive sizing: TV ekran boyutuna gore olcekleme.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { colors, lightOverrides, amoledOverrides, accentColors } from './colors';
import { ThemeMode, AccentColor } from '@/types';

// ─── Theme Colors Type ──────────────────────────────────

interface ThemeColors {
  background: {
    primary: string;
    card: string;
    active: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: typeof colors.accent;
  status: typeof colors.status;
  focus: typeof colors.focus;
  progress: typeof colors.progress;
  transparent: string;
  white: string;
  black: string;
}

interface ThemeContextValue {
  /** Aktif tema modu */
  mode: ThemeMode;
  /** Aktif vurgu rengi */
  accentColor: AccentColor;
  /** Tema renkleri */
  colors: ThemeColors;
  /** Responsive font scale (TV ekran boyutuna gore) */
  fontScale: number;
  /** Responsive spacing scale */
  spacingScale: number;
  /** Koyu tema mi? */
  isDark: boolean;
}

// ─── Theme Resolver ─────────────────────────────────────

function resolveThemeColors(mode: ThemeMode): ThemeColors {
  const base: ThemeColors = {
    background: { ...colors.background },
    text: { ...colors.text },
    accent: colors.accent,
    status: colors.status,
    focus: colors.focus,
    progress: colors.progress,
    transparent: colors.transparent,
    white: colors.white,
    black: colors.black,
  };

  if (mode === 'light') {
    return {
      ...base,
      background: { ...base.background, ...lightOverrides.background },
      text: { ...base.text, ...lightOverrides.text },
    };
  }

  if (mode === 'amoled') {
    return {
      ...base,
      background: { ...base.background, ...amoledOverrides.background },
    };
  }

  return base; // dark (varsayilan)
}

/** TV ekran boyutuna gore olcek faktoru hesapla */
function calculateScales(): { fontScale: number; spacingScale: number } {
  const { width } = Dimensions.get('window');

  // Referans: 1920px (Full HD TV)
  // Daha buyuk ekranlar icin scale up, kucukler icin scale down
  if (width >= 3840) return { fontScale: 1.5, spacingScale: 1.5 };   // 4K
  if (width >= 2560) return { fontScale: 1.25, spacingScale: 1.25 }; // QHD
  if (width >= 1920) return { fontScale: 1.0, spacingScale: 1.0 };   // FHD
  if (width >= 1280) return { fontScale: 0.85, spacingScale: 0.85 }; // HD
  return { fontScale: 0.75, spacingScale: 0.75 };                     // SD
}

// ─── Context ────────────────────────────────────────────

const defaultScales = calculateScales();

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  accentColor: 'blue',
  colors: resolveThemeColors('dark'),
  fontScale: defaultScales.fontScale,
  spacingScale: defaultScales.spacingScale,
  isDark: true,
});

// ─── Provider ───────────────────────────────────────────

interface ThemeProviderProps {
  mode: ThemeMode;
  accentColor?: AccentColor;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  mode,
  accentColor = 'blue',
  children,
}) => {
  const value = useMemo<ThemeContextValue>(() => {
    const themeColors = resolveThemeColors(mode);
    const scales = calculateScales();

    return {
      mode,
      accentColor,
      colors: themeColors,
      fontScale: scales.fontScale,
      spacingScale: scales.spacingScale,
      isDark: mode !== 'light',
    };
  }, [mode, accentColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Responsive font boyutu hesapla */
export function responsiveFont(baseSize: number, scale: number): number {
  return Math.round(baseSize * scale);
}

/** Responsive spacing hesapla */
export function responsiveSpacing(baseSpacing: number, scale: number): number {
  return Math.round(baseSpacing * scale);
}
