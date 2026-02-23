/**
 * Video player ile ilgili type tanimlari.
 */

export type PlayerState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error';

export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface PlayerConfig {
  quality: VideoQuality;
  bufferDuration: number;
  hardwareDecoding: boolean;
  osdTimeout: number;
  /** Ust/alt komsu kanal preloading sayisi */
  preloadCount: number;
}

export interface PlayerStatus {
  state: PlayerState;
  currentTime: number;
  duration: number;
  bufferedDuration: number;
  volume: number;
  isMuted: boolean;
  currentQuality: VideoQuality;
  /** Mevcut bitrate (bps) */
  bitrate: number;
  /** FPS */
  fps: number;
}

export interface OSDInfo {
  visible: boolean;
  channelName: string;
  channelLogo?: string;
  channelNumber?: number;
  currentProgram?: {
    title: string;
    startTime: number;
    endTime: number;
    progress: number;
  };
  nextProgram?: {
    title: string;
    startTime: number;
  };
  volume: number;
}
