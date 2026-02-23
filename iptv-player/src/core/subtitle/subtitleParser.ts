/**
 * Altyazi Parser - SRT ve VTT format destegi
 *
 * Desteklenen formatlar:
 * - SRT (SubRip) - En yaygin format
 * - VTT (WebVTT) - Web standardi
 *
 * Ozellikler:
 * - Zaman damgasi parse (milisaniye hassasiyetinde)
 * - HTML tag temizleme (<b>, <i>, <font> vb.)
 * - Coklu satir altyazi destegi
 * - UTF-8 karakter destegi (Turkce karakterler)
 */

export interface SubtitleCue {
  id: number;
  startTime: number; // milisaniye
  endTime: number;   // milisaniye
  text: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  languageLabel: string;
  url?: string;
  cues: SubtitleCue[];
  format: 'srt' | 'vtt';
}

// ─── Zaman Parse ──────────────────────────────────────────────

/**
 * SRT zaman formatini milisaniyeye cevirir.
 * Format: "01:23:45,678" veya "01:23:45.678"
 */
function parseTimestamp(timeStr: string): number {
  const normalized = timeStr.trim().replace(',', '.');
  const match = normalized.match(/(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})/);
  if (!match) return 0;

  const [, hours, minutes, seconds, ms] = match;
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(ms.padEnd(3, '0'), 10)
  );
}

/**
 * Milisaniyeyi gosterim formatina cevirir.
 * Ornek: 5025000 -> "01:23:45"
 */
export function formatTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── HTML Tag Temizleme ───────────────────────────────────────

function cleanTags(text: string): string {
  return text
    .replace(/<\/?[^>]+(>|$)/g, '') // HTML taglarini kaldir
    .replace(/\{\\an\d\}/g, '')      // ASS alignment taglarini kaldir
    .replace(/\{[^}]*\}/g, '')       // Diger ASS taglarini kaldir
    .trim();
}

// ─── SRT Parser ───────────────────────────────────────────────

/**
 * SRT (SubRip) formatini parse eder.
 *
 * SRT Formati:
 * ```
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * Merhaba dunya!
 *
 * 2
 * 00:00:05,000 --> 00:00:08,000
 * Bu bir altyazi ornegi.
 * Ikinci satir.
 * ```
 */
export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // BOM karakterini temizle
  const cleaned = content.replace(/^\uFEFF/, '');
  const blocks = cleaned.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Ilk satir: numara (opsiyonel olarak atlanabilir)
    let timeLineIndex = 0;
    if (lines[0].match(/^\d+$/)) {
      timeLineIndex = 1;
    }

    // Zaman satiri: "00:00:01,000 --> 00:00:04,000"
    const timeLine = lines[timeLineIndex];
    const timeMatch = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})/
    );
    if (!timeMatch) continue;

    const startTime = parseTimestamp(timeMatch[1]);
    const endTime = parseTimestamp(timeMatch[2]);

    // Metin satirlari
    const textLines = lines.slice(timeLineIndex + 1);
    const text = cleanTags(textLines.join('\n'));

    if (text) {
      cues.push({
        id: cues.length + 1,
        startTime,
        endTime,
        text,
      });
    }
  }

  return cues;
}

// ─── VTT Parser ───────────────────────────────────────────────

/**
 * WebVTT formatini parse eder.
 *
 * VTT Formati:
 * ```
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * Merhaba dunya!
 *
 * 00:00:05.000 --> 00:00:08.000
 * Bu bir altyazi ornegi.
 * ```
 */
export function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const cleaned = content.replace(/^\uFEFF/, '');

  // WEBVTT header'ini atla
  const headerEnd = cleaned.indexOf('\n\n');
  if (headerEnd === -1) return [];

  const body = cleaned.substring(headerEnd + 2);
  const blocks = body.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Cue ID satiri (opsiyonel) - zaman formatini icermeyen ilk satir
    let timeLineIndex = 0;
    if (!lines[0].includes('-->')) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    const timeMatch = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3})/
    );
    if (!timeMatch) continue;

    const startTime = parseTimestamp(timeMatch[1]);
    const endTime = parseTimestamp(timeMatch[2]);

    const textLines = lines.slice(timeLineIndex + 1);
    const text = cleanTags(textLines.join('\n'));

    if (text) {
      cues.push({
        id: cues.length + 1,
        startTime,
        endTime,
        text,
      });
    }
  }

  return cues;
}

// ─── Otomatik Format Algilama ─────────────────────────────────

/**
 * Altyazi dosyasini formata gore otomatik parse eder.
 */
export function parseSubtitle(content: string, format?: 'srt' | 'vtt'): SubtitleCue[] {
  if (format === 'vtt' || content.trimStart().startsWith('WEBVTT')) {
    return parseVTT(content);
  }
  return parseSRT(content);
}

/**
 * URL'den altyazi dosyasini indirir ve parse eder.
 */
export async function fetchSubtitle(url: string): Promise<SubtitleCue[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Altyazi indirme hatasi: ${response.status}`);

  const content = await response.text();
  const format = url.endsWith('.vtt') ? 'vtt' : 'srt';
  return parseSubtitle(content, format);
}

/**
 * Belirli bir zaman icin aktif altyaziyi bulur.
 * Binary search ile hizli arama (buyuk altyazi dosyalarinda performans).
 */
export function getActiveCue(cues: SubtitleCue[], timeMs: number): SubtitleCue | null {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (timeMs >= cue.startTime && timeMs <= cue.endTime) {
      return cue;
    } else if (timeMs < cue.startTime) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return null;
}
