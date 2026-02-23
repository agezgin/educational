/**
 * Spacing sistemi - TV ekrani icin optimize edilmis.
 * 3 metre mesafeden okunabilirlik kurali uygulanir.
 */

export const spacing = {
  /** 4px - ikon ic bosluk */
  xs: 4,
  /** 8px - kompakt ogeler arasi */
  sm: 8,
  /** 12px - kucuk bosluk */
  md: 12,
  /** 16px - standart bosluk */
  lg: 16,
  /** 24px - bolum arasi bosluk */
  xl: 24,
  /** 32px - ekran kenari padding */
  xxl: 32,
  /** 48px - buyuk bosluklar */
  xxxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
} as const;

/** Sidebar genisligi */
export const SIDEBAR_WIDTH = 220;

/** Kanal listesi oge yuksekligi (sabit - virtualized list performansi icin) */
export const CHANNEL_ITEM_HEIGHT = 100;

/** EPG satir yuksekligi */
export const EPG_ROW_HEIGHT = 70;

/** EPG saat genisligi (1 saatlik dilim) */
export const EPG_HOUR_WIDTH = 300;

/** OSD yuksekligi */
export const OSD_HEIGHT = 160;
