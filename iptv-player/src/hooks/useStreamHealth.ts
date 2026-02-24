/**
 * useStreamHealth - Player saglik izleme hook'u
 *
 * react-native-video (ExoPlayer/VLC) ile entegrasyon:
 * - onProgress callback'ini dinler -> donma algilama
 * - onBuffer callback'ini dinler -> surekli buffering algilama
 * - onError callback'ini dinler -> hata kurtarma
 * - Recovery durumunu UI'ya expose eder
 *
 * Kullanim:
 *   const {
 *     streamUrl,
 *     healthStatus,
 *     statusMessage,
 *     alternativeInfo,
 *     onVideoProgress,
 *     onVideoBuffer,
 *     onVideoError,
 *     switchAlternative,
 *     retryManual,
 *   } = useStreamHealth(channel);
 *
 *   <Video
 *     source={{ uri: streamUrl }}
 *     onProgress={onVideoProgress}
 *     onBuffer={onVideoBuffer}
 *     onError={onVideoError}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Channel, StreamAlternative } from '@/types';
import {
  StreamRecoveryManager,
  StreamHealthStatus,
  RecoveryCallbacks,
} from '@/core/player/streamRecovery';
import {
  streamAlternatives,
  AlternativeStats,
} from '@/core/player/streamAlternatives';

// ─── Types ───────────────────────────────────────────────

export interface StreamHealthInfo {
  /** Oynatilacak stream URL */
  streamUrl: string;
  /** Mevcut alternatifin ID'si */
  currentAlternativeId: string;
  /** Mevcut alternatifin etiketi */
  currentAlternativeLabel: string;
  /** Saglik durumu */
  healthStatus: StreamHealthStatus;
  /** Kullaniciya gosterilecek durum mesaji */
  statusMessage: string;
  /** Alternatif istatistikleri */
  alternativeStats: AlternativeStats;
  /** Mevcut kanalin alternatifleri (UI'da liste gostermek icin) */
  alternatives: StreamAlternative[];
  /** Hata var mi */
  hasError: boolean;
  /** Recovery devam ediyor mu */
  isRecovering: boolean;

  // ─── Callbacks ─────────────────────────────────
  /** react-native-video onProgress callback'ine bagla */
  onVideoProgress: (data: { currentTime: number }) => void;
  /** react-native-video onBuffer callback'ine bagla */
  onVideoBuffer: (data: { isBuffering: boolean }) => void;
  /** react-native-video onError callback'ine bagla */
  onVideoError: (data: { error: { code?: string; message?: string; recoverable?: boolean } }) => void;
  /** Manuel alternatif secimi */
  switchAlternative: (alternativeId: string) => void;
  /** Manuel yeniden deneme */
  retryManual: () => void;
}

// ─── Hook ────────────────────────────────────────────────

export function useStreamHealth(channel: Channel | null): StreamHealthInfo {
  const recoveryRef = useRef<StreamRecoveryManager | null>(null);

  const [streamUrl, setStreamUrl] = useState(channel?.url || '');
  const [currentAlternativeId, setCurrentAlternativeId] = useState('primary');
  const [currentAlternativeLabel, setCurrentAlternativeLabel] = useState('Ana Yayın');
  const [healthStatus, setHealthStatus] = useState<StreamHealthStatus>('healthy');
  const [statusMessage, setStatusMessage] = useState('');

  // Recovery manager baslat/durdur
  useEffect(() => {
    if (!channel) {
      if (recoveryRef.current) {
        recoveryRef.current.stop();
        recoveryRef.current = null;
      }
      return;
    }

    const recovery = new StreamRecoveryManager();
    recoveryRef.current = recovery;

    // En iyi alternatifi sec
    const best = streamAlternatives.selectBestAlternative(channel);
    const initialUrl = best?.url || channel.url;
    const initialAltId = best?.alternativeId || 'primary';
    const initialLabel = best?.label || 'Ana Yayın';

    setStreamUrl(initialUrl);
    setCurrentAlternativeId(initialAltId);
    setCurrentAlternativeLabel(initialLabel);
    setHealthStatus('healthy');
    setStatusMessage('');

    const callbacks: RecoveryCallbacks = {
      onReconnect: (url: string) => {
        setStreamUrl(url);
      },
      onSwitchEngine: (_engine) => {
        // Player engine degisimi gerektiginde
        // Bu, parent component tarafindan handle edilir
      },
      onStatusChange: (status: StreamHealthStatus, message: string) => {
        setHealthStatus(status);
        setStatusMessage(message);

        // Alternatif gecisi durumunda label'i guncelle
        if (status === 'switching') {
          const state = recovery.getState();
          if (state.activeRecovery?.type === 'switch_alternative') {
            setCurrentAlternativeId(state.activeRecovery.alternativeId);
            setCurrentAlternativeLabel(state.activeRecovery.label);
          }
        }
      },
      onGiveUp: (reason: string) => {
        setStatusMessage(reason);
      },
    };

    // Channel'i recovery manager'a override ile baslat
    const channelWithUrl = { ...channel, url: initialUrl };
    recovery.start(channelWithUrl, callbacks);

    return () => {
      recovery.stop();
    };
  }, [channel?.id]); // Sadece kanal degistiginde yeniden baslat

  // ─── Video Player Callbacks ────────────────────

  const onVideoProgress = useCallback((data: { currentTime: number }) => {
    recoveryRef.current?.reportProgress(data.currentTime);
  }, []);

  const onVideoBuffer = useCallback((data: { isBuffering: boolean }) => {
    recoveryRef.current?.reportBuffering(data.isBuffering);
  }, []);

  const onVideoError = useCallback((data: { error: { code?: string; message?: string; recoverable?: boolean } }) => {
    const { error } = data;
    recoveryRef.current?.reportError(
      error.code || 'UNKNOWN',
      error.message || 'Bilinmeyen hata',
      error.recoverable ?? true,
    );
  }, []);

  // ─── Manuel Kontroller ─────────────────────────

  const switchAlternative = useCallback((alternativeId: string) => {
    if (!channel) return;

    if (alternativeId === 'primary') {
      recoveryRef.current?.manualSwitchAlternative(channel.url, 'primary');
      setCurrentAlternativeId('primary');
      setCurrentAlternativeLabel('Ana Yayın');
      return;
    }

    const alt = channel.alternativeUrls?.find(a => a.id === alternativeId);
    if (alt) {
      recoveryRef.current?.manualSwitchAlternative(alt.url, alt.id);
      setCurrentAlternativeId(alt.id);
      setCurrentAlternativeLabel(alt.label);
    }
  }, [channel]);

  const retryManual = useCallback(() => {
    if (!channel) return;

    // Mevcut URL ile yeniden dene
    const currentUrl = streamUrl || channel.url;
    recoveryRef.current?.manualSwitchAlternative(currentUrl, currentAlternativeId);
    setHealthStatus('recovering');
    setStatusMessage('Manuel yeniden bağlanılıyor...');
  }, [channel, streamUrl, currentAlternativeId]);

  // ─── Computed Values ───────────────────────────

  const alternativeStats = channel
    ? streamAlternatives.getStats(channel)
    : { total: 1, active: 1, inCooldown: 0, disabled: 0 };

  const alternatives = channel?.alternativeUrls || [];

  const hasError = healthStatus === 'failed';
  const isRecovering = healthStatus === 'recovering' || healthStatus === 'switching';

  return {
    streamUrl,
    currentAlternativeId,
    currentAlternativeLabel,
    healthStatus,
    statusMessage,
    alternativeStats,
    alternatives,
    hasError,
    isRecovering,
    onVideoProgress,
    onVideoBuffer,
    onVideoError,
    switchAlternative,
    retryManual,
  };
}
