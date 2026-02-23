/**
 * M3U Streaming Parser
 *
 * Rakip yaklasimi: Tum dosyayi indir -> Parse et -> Goster (5-10sn)
 * Bizim yaklasimimiz: Satir satir stream -> Ilk 20 kanal aninda ekranda (<1sn)
 *
 * Desteklenen formatlar:
 * - M3U / M3U8
 * - #EXTINF tag parsing (tvg-id, tvg-name, tvg-logo, group-title)
 * - #EXTGRP desteği
 */

import { Channel, M3UExtInf, ChannelGroup } from '@/types';

// #EXTINF satir parse regex
const EXTINF_REGEX = /^#EXTINF:\s*(-?\d+)\s*,(.*)$/;
const TVG_ID_REGEX = /tvg-id="([^"]*)"/;
const TVG_NAME_REGEX = /tvg-name="([^"]*)"/;
const TVG_LOGO_REGEX = /tvg-logo="([^"]*)"/;
const GROUP_TITLE_REGEX = /group-title="([^"]*)"/;

/**
 * #EXTINF satirini parse eder.
 */
export function parseExtInf(line: string): M3UExtInf | null {
  const match = line.match(EXTINF_REGEX);
  if (!match) return null;

  const [, durationStr, rest] = match;
  const duration = parseInt(durationStr, 10);

  // Tag'lerden metadata cikart
  const tvgId = rest.match(TVG_ID_REGEX)?.[1];
  const tvgName = rest.match(TVG_NAME_REGEX)?.[1];
  const tvgLogo = rest.match(TVG_LOGO_REGEX)?.[1];
  const groupTitle = rest.match(GROUP_TITLE_REGEX)?.[1];

  // Kanal adi: virgulden sonraki son kisim
  const commaIndex = rest.lastIndexOf(',');
  const channelName = commaIndex !== -1
    ? rest.substring(commaIndex + 1).trim()
    : rest.trim();

  return {
    duration,
    tvgId: tvgId || undefined,
    tvgName: tvgName || undefined,
    tvgLogo: tvgLogo || undefined,
    groupTitle: groupTitle || undefined,
    channelName,
  };
}

/**
 * M3UExtInf bilgisinden Channel objesi olusturur.
 */
function extInfToChannel(extInf: M3UExtInf, url: string, index: number): Channel {
  return {
    id: extInf.tvgId || `ch_${index}`,
    name: extInf.tvgName || extInf.channelName,
    url,
    logoUrl: extInf.tvgLogo || undefined,
    groupTitle: extInf.groupTitle || 'Diger',
    number: index + 1,
    isFavorite: false,
    isLocked: false,
    watchCount: 0,
    catchupSupport: false,
  };
}

/**
 * Streaming M3U Parser - Async generator ile satir satir parse eder.
 * Her kanal hazir olur olmaz yield eder, UI aninda guncellenir.
 *
 * Kullanim:
 * ```
 * for await (const channel of parseM3UStream(url)) {
 *   addToList(channel);
 * }
 * ```
 */
export async function* parseM3UStream(url: string): AsyncGenerator<Channel> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`M3U indirme hatasi: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream desteklenmiyor');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentExtInf: M3UExtInf | null = null;
  let channelIndex = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Son (eksik olabilecek) satiri sakla

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // M3U header kontrolu
        if (line === '#EXTM3U') continue;

        // EXTINF satiri
        if (line.startsWith('#EXTINF:')) {
          currentExtInf = parseExtInf(line);
          continue;
        }

        // Diger comment satirlarini atla
        if (line.startsWith('#')) continue;

        // URL satiri - kanal tamamlandi
        if (currentExtInf) {
          yield extInfToChannel(currentExtInf, line, channelIndex);
          channelIndex++;
          currentExtInf = null;
        }
      }
    }

    // Buffer'da kalan son satiri isle
    if (buffer.trim() && currentExtInf) {
      yield extInfToChannel(currentExtInf, buffer.trim(), channelIndex);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Toplu M3U parse - Tum kanallari bir seferde dondurur.
 * Kucuk dosyalar veya cache'den yuklerken kullanilir.
 */
export async function parseM3UFull(url: string): Promise<Channel[]> {
  const channels: Channel[] = [];
  for await (const channel of parseM3UStream(url)) {
    channels.push(channel);
  }
  return channels;
}

/**
 * Ham M3U metin icerigini parse eder (cache'den okurken).
 */
export function parseM3UContent(content: string): Channel[] {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentExtInf: M3UExtInf | null = null;
  let channelIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '#EXTM3U') continue;

    if (line.startsWith('#EXTINF:')) {
      currentExtInf = parseExtInf(line);
      continue;
    }

    if (line.startsWith('#')) continue;

    if (currentExtInf) {
      channels.push(extInfToChannel(currentExtInf, line, channelIndex));
      channelIndex++;
      currentExtInf = null;
    }
  }

  return channels;
}

/**
 * Kanallari gruplara ayirir (kategori sidebar icin).
 */
export function groupChannels(channels: Channel[]): ChannelGroup[] {
  const groupMap = new Map<string, Channel[]>();

  for (const channel of channels) {
    const group = channel.groupTitle || 'Diger';
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(channel);
  }

  return Array.from(groupMap.entries()).map(([name, groupChannels]) => ({
    id: `group_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    channelCount: groupChannels.length,
    channels: groupChannels,
  }));
}
