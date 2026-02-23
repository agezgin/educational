/**
 * Renk paleti - Dokumandaki tasarim sistemine gore.
 * Koyu tema varsayilan, TV icin optimize edilmis renkler.
 */

export const colors = {
  // Arka plan katmanlari
  background: {
    primary: '#0D1117',   // Derin lacivert-siyah (ana arka plan)
    card: '#161B22',      // Koyu gri-mavi (kart arka plani)
    active: '#1C2333',    // Secili oge arka plani
    overlay: 'rgba(0, 0, 0, 0.7)', // Player OSD overlay
  },

  // Vurgu renkleri
  accent: {
    blue: '#3B82F6',      // Primary - focus ring
    green: '#10B981',     // Canli yayin gostergesi
    amber: '#F59E0B',     // Favoriler yildiz
  },

  // Metin renkleri
  text: {
    primary: '#F0F6FC',   // Beyaz - basliklar
    secondary: '#8B949E', // Gri - aciklamalar
    muted: '#484F58',     // Koyu gri - zaman bilgisi
  },

  // Durum renkleri
  status: {
    danger: '#F85149',    // Kirmizi - hata/uyari
    success: '#3FB950',   // Yesil - bagli/aktif
    live: '#F85149',      // CANLI badge
    warning: '#F59E0B',   // Uyari
  },

  // Focus durumu
  focus: {
    ring: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.3)',
  },

  // Progress bar
  progress: {
    track: '#30363D',
    fill: '#3B82F6',
    buffer: '#484F58',
  },

  // Tema varyantlari icin tum renk semalari
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** AMOLED siyah tema icin override degerleri */
export const amoledOverrides = {
  background: {
    primary: '#000000',
    card: '#0D1117',
    active: '#161B22',
    overlay: 'rgba(0, 0, 0, 0.85)',
  },
} as const;

/** Acik tema icin override degerleri */
export const lightOverrides = {
  background: {
    primary: '#FFFFFF',
    card: '#F6F8FA',
    active: '#E8ECF0',
    overlay: 'rgba(255, 255, 255, 0.85)',
  },
  text: {
    primary: '#1F2328',
    secondary: '#656D76',
    muted: '#8B949E',
  },
} as const;

/** Vurgu renk secenekleri */
export const accentColors = {
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#10B981',
  orange: '#F97316',
} as const;
