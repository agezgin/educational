/**
 * Tipografi sistemi - 3 metre kuralina uygun font boyutlari.
 * TV ekraninda okunabilirlik oncelikli.
 */

import { TextStyle } from 'react-native';

const fontFamily = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const typography = {
  /** Buyuk baslik - ekran basliklari */
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  } as TextStyle,

  /** Orta baslik - bolum basliklari */
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  } as TextStyle,

  /** Kucuk baslik - kanal adi */
  h3: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  } as TextStyle,

  /** Normal metin - aciklamalar */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } as TextStyle,

  /** Kucuk metin - zaman bilgisi, etiketler */
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,

  /** Cok kucuk - badge, sayac */
  tiny: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  } as TextStyle,
} as const;

/** Buyuk font modu icin carpan (Ayarlar > Font Boyutu: Buyuk) */
export const LARGE_FONT_SCALE = 1.25;
