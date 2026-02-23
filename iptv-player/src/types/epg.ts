/**
 * EPG (Elektronik Program Rehberi) type tanimlari.
 */

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  /** Program kategorisi */
  category?: string;
  /** Program ikonu/afisi */
  posterUrl?: string;
  /** Yayinda mi? */
  isLive: boolean;
}

export interface EPGChannel {
  id: string;
  name: string;
  logoUrl?: string;
  programs: EPGProgram[];
}

export interface EPGData {
  channels: Record<string, EPGChannel>;
  lastUpdated: number;
  sourceUrl: string;
}

export interface EPGTimeSlot {
  hour: number;
  minute: number;
  label: string;
}
