/**
 * Audio Track Manager - Coklu ses dili yonetimi
 *
 * HLS/MPEG-TS stream'lerindeki farkli ses kanallarini yonetir.
 * Ornegin bir film hem Turkce hem Ingilizce ses iceriyor olabilir.
 *
 * Ozellikler:
 * - Mevcut ses kanallarini listeleme
 * - Ses kanali degistirme
 * - Varsayilan dil tercihi (Turkce oncelikli)
 * - Son tercih hatirlanir
 */

export interface AudioTrack {
  id: number;
  language: string;
  languageLabel: string;
  title?: string;
  /** Varsayilan ses kanali mi? */
  isDefault: boolean;
  /** Secili mi? */
  isSelected: boolean;
  /** Kanal sayisi (stereo=2, 5.1=6, vb.) */
  channels?: number;
  /** Codec (AAC, AC3, DTS, vb.) */
  codec?: string;
  /** Bitrate */
  bitrate?: number;
}

/** Dil kodlari -> Turkce etiketler */
const AUDIO_LANGUAGE_LABELS: Record<string, string> = {
  tur: 'Turkce',
  tr: 'Turkce',
  eng: 'Ingilizce',
  en: 'Ingilizce',
  ger: 'Almanca',
  de: 'Almanca',
  fre: 'Fransizca',
  fr: 'Fransizca',
  spa: 'Ispanyolca',
  es: 'Ispanyolca',
  ita: 'Italyanca',
  it: 'Italyanca',
  por: 'Portekizce',
  pt: 'Portekizce',
  rus: 'Rusca',
  ru: 'Rusca',
  ara: 'Arapca',
  ar: 'Arapca',
  jpn: 'Japonca',
  ja: 'Japonca',
  kor: 'Korece',
  ko: 'Korece',
  chi: 'Cince',
  zh: 'Cince',
  und: 'Bilinmeyen',
};

/** Codec guzel isimleri */
const CODEC_LABELS: Record<string, string> = {
  aac: 'AAC',
  ac3: 'Dolby AC3',
  eac3: 'Dolby EAC3',
  dts: 'DTS',
  opus: 'Opus',
  mp3: 'MP3',
  vorbis: 'Vorbis',
  flac: 'FLAC',
  pcm: 'PCM',
};

/**
 * Dil kodunu okunabilir etikete cevirir.
 */
export function getLanguageLabel(langCode: string): string {
  return AUDIO_LANGUAGE_LABELS[langCode.toLowerCase()] || langCode;
}

/**
 * Codec adini guzel formata cevirir.
 */
export function getCodecLabel(codec: string): string {
  return CODEC_LABELS[codec.toLowerCase()] || codec.toUpperCase();
}

/**
 * Ses kanali aciklama metni olusturur.
 * Ornek: "Turkce - Dolby AC3 5.1"
 */
export function getTrackDescription(track: AudioTrack): string {
  const parts = [track.languageLabel];

  if (track.codec) {
    parts.push(getCodecLabel(track.codec));
  }

  if (track.channels) {
    if (track.channels === 2) parts.push('Stereo');
    else if (track.channels === 6) parts.push('5.1');
    else if (track.channels === 8) parts.push('7.1');
    else parts.push(`${track.channels}ch`);
  }

  if (track.title && track.title !== track.languageLabel) {
    parts.push(`(${track.title})`);
  }

  return parts.join(' - ');
}

/**
 * Varsayilan ses kanalini secer.
 * Oncelik sirasi: Turkce > Ingilizce > Varsayilan > Ilk kanal
 */
export function selectDefaultTrack(
  tracks: AudioTrack[],
  preferredLanguage = 'tr'
): AudioTrack | null {
  if (tracks.length === 0) return null;

  // 1. Tercih edilen dil
  const preferred = tracks.find(t =>
    t.language.toLowerCase().startsWith(preferredLanguage)
  );
  if (preferred) return preferred;

  // 2. Turkce
  const turkish = tracks.find(t =>
    t.language.toLowerCase() === 'tr' || t.language.toLowerCase() === 'tur'
  );
  if (turkish) return turkish;

  // 3. Ingilizce
  const english = tracks.find(t =>
    t.language.toLowerCase() === 'en' || t.language.toLowerCase() === 'eng'
  );
  if (english) return english;

  // 4. Stream'in varsayilani
  const defaultTrack = tracks.find(t => t.isDefault);
  if (defaultTrack) return defaultTrack;

  // 5. Ilk kanal
  return tracks[0];
}

/**
 * react-native-video'dan gelen ses kanali bilgisini
 * bizim AudioTrack formatimiza cevirir.
 */
export function parseVideoAudioTracks(
  rawTracks: Array<{
    index: number;
    title?: string;
    language?: string;
    type?: string;
    selected?: boolean;
  }>
): AudioTrack[] {
  return rawTracks.map((raw, idx) => ({
    id: raw.index ?? idx,
    language: raw.language || 'und',
    languageLabel: getLanguageLabel(raw.language || 'und'),
    title: raw.title,
    isDefault: idx === 0,
    isSelected: raw.selected ?? false,
  }));
}
