/**
 * EPG (XMLTV) Parser
 *
 * XMLTV formatindaki EPG verisini parse eder.
 * Progressive loading: Sadece gorunen kanallarin EPG'sini once yukle.
 *
 * Strateji:
 * 1. Cache'den mevcut EPG'yi goster (aninda)
 * 2. Arka planda guncel EPG'yi indir
 * 3. Sadece gorunen kanallarin verisini once isle
 * 4. Geri kalanini progressive yukle
 */

import { EPGProgram, EPGChannel, EPGData } from '@/types';

/**
 * XMLTV tarih formatini timestamp'e cevirir.
 * Format: "20260223200000 +0300"
 */
function parseXMLTVDate(dateStr: string): number {
  if (!dateStr) return 0;

  const clean = dateStr.trim();
  // YYYYMMDDHHmmss formatini parse et
  const year = parseInt(clean.substring(0, 4), 10);
  const month = parseInt(clean.substring(4, 6), 10) - 1;
  const day = parseInt(clean.substring(6, 8), 10);
  const hour = parseInt(clean.substring(8, 10), 10);
  const minute = parseInt(clean.substring(10, 12), 10);
  const second = parseInt(clean.substring(12, 14), 10);

  // Timezone offset
  const tzMatch = clean.match(/([+-]\d{4})/);
  if (tzMatch) {
    const tzStr = tzMatch[1];
    const tzHours = parseInt(tzStr.substring(0, 3), 10);
    const tzMinutes = parseInt(tzStr.substring(3, 5), 10);
    const offsetMs = (tzHours * 60 + tzMinutes) * 60000;

    const utc = Date.UTC(year, month, day, hour, minute, second);
    return utc - offsetMs;
  }

  return new Date(year, month, day, hour, minute, second).getTime();
}

/**
 * Basit XML tag icerigini cikarir (regex tabanli - tam XML parser yerine hiz icin).
 */
function extractTagContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml: string, attr: string): string {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

/**
 * XMLTV icerigini streaming olarak parse eder.
 * Her programme blogu bulundugunda callback cagirilir.
 */
export async function* parseEPGStream(url: string): AsyncGenerator<EPGProgram> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`EPG indirme hatasi: ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream desteklenmiyor');

  const decoder = new TextDecoder();
  let buffer = '';
  let programIndex = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Her <programme> blogu icin parse et
      let startIdx: number;
      while ((startIdx = buffer.indexOf('<programme ')) !== -1) {
        const endIdx = buffer.indexOf('</programme>', startIdx);
        if (endIdx === -1) break; // Eksik blok, daha fazla veri bekle

        const programXml = buffer.substring(startIdx, endIdx + '</programme>'.length);
        buffer = buffer.substring(endIdx + '</programme>'.length);

        const channelId = extractAttribute(programXml, 'channel');
        const startStr = extractAttribute(programXml, 'start');
        const stopStr = extractAttribute(programXml, 'stop');
        const title = extractTagContent(programXml, 'title');
        const desc = extractTagContent(programXml, 'desc');
        const category = extractTagContent(programXml, 'category');

        const startTime = parseXMLTVDate(startStr);
        const endTime = parseXMLTVDate(stopStr);
        const now = Date.now();

        yield {
          id: `epg_${programIndex++}`,
          channelId,
          title,
          description: desc || undefined,
          startTime,
          endTime,
          category: category || undefined,
          isLive: now >= startTime && now < endTime,
        };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Belirli kanal ID'leri icin EPG verisini ceker.
 * (Progressive loading - sadece gorunen kanallarin EPG'si)
 */
export async function fetchEPGForChannels(
  url: string,
  channelIds: Set<string>
): Promise<Map<string, EPGProgram[]>> {
  const result = new Map<string, EPGProgram[]>();

  for await (const program of parseEPGStream(url)) {
    if (channelIds.has(program.channelId)) {
      if (!result.has(program.channelId)) {
        result.set(program.channelId, []);
      }
      result.get(program.channelId)!.push(program);
    }
  }

  // Her kanal icin programlari zamana gore sirala
  for (const programs of result.values()) {
    programs.sort((a, b) => a.startTime - b.startTime);
  }

  return result;
}

/**
 * Tum EPG verisini ceker ve EPGData formatinda dondurur.
 */
export async function fetchFullEPG(url: string): Promise<EPGData> {
  const channelPrograms = new Map<string, EPGProgram[]>();

  for await (const program of parseEPGStream(url)) {
    if (!channelPrograms.has(program.channelId)) {
      channelPrograms.set(program.channelId, []);
    }
    channelPrograms.get(program.channelId)!.push(program);
  }

  const channels: Record<string, EPGChannel> = {};
  for (const [channelId, programs] of channelPrograms.entries()) {
    programs.sort((a, b) => a.startTime - b.startTime);
    channels[channelId] = {
      id: channelId,
      name: channelId,
      programs,
    };
  }

  return {
    channels,
    lastUpdated: Date.now(),
    sourceUrl: url,
  };
}

/**
 * Belirli bir kanal icin su an yayindaki programi dondurur.
 */
export function getCurrentProgram(programs: EPGProgram[]): EPGProgram | undefined {
  const now = Date.now();
  return programs.find(p => now >= p.startTime && now < p.endTime);
}

/**
 * Belirli bir kanal icin siradaki programi dondurur.
 */
export function getNextProgram(programs: EPGProgram[]): EPGProgram | undefined {
  const now = Date.now();
  return programs.find(p => p.startTime > now);
}

/**
 * Programin ilerleme yuzdesini hesaplar (OSD progress bar icin).
 */
export function getProgramProgress(program: EPGProgram): number {
  const now = Date.now();
  if (now < program.startTime) return 0;
  if (now >= program.endTime) return 100;

  const total = program.endTime - program.startTime;
  const elapsed = now - program.startTime;
  return Math.round((elapsed / total) * 100);
}
