/**
 * Quick Zapping Hook
 *
 * Hizli kanal degistirme:
 * - Mini onizleme (sonraki/onceki kanal)
 * - Channel number input (numpad ile kanal secimi)
 * - Son izlenen kanala hizli donus
 * - Kanal gecmisi (geri git)
 * - Preload adjacent channels
 *
 * Hedef: Kanal degistirme < 1.5 saniye
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────

export interface ZappingState {
  /** Mini onizleme gosteriliyor mu */
  showPreview: boolean;
  /** Onizleme yonu */
  previewDirection: 'up' | 'down' | null;
  /** Onizlemedeki kanal indexi */
  previewChannelIndex: number;
  /** Kanal numarasi girisi aktif mi */
  numberInputActive: boolean;
  /** Girilen kanal numarasi */
  numberBuffer: string;
  /** Son izlenen kanal indexi */
  lastChannelIndex: number;
  /** Kanal gecmisi (geri git icin) */
  channelHistory: number[];
}

export interface ZappingActions {
  /** Kanal yukari */
  channelUp: () => void;
  /** Kanal asagi */
  channelDown: () => void;
  /** Numara gir */
  inputNumber: (digit: string) => void;
  /** Son kanala don */
  goToLastChannel: () => void;
  /** Gecmiste geri git */
  goBack: () => void;
  /** Onizlemeyi onayla (kanali degistir) */
  confirmPreview: () => void;
  /** Onizlemeyi iptal et */
  cancelPreview: () => void;
}

interface ZappingConfig {
  /** Toplam kanal sayisi */
  totalChannels: number;
  /** Mevcut kanal indexi */
  currentIndex: number;
  /** Kanal degistirme callback */
  onChannelChange: (index: number) => void;
  /** Onizleme suresi (ms) */
  previewTimeout?: number;
  /** Numara girisi timeout (ms) */
  numberTimeout?: number;
  /** Gecmis max boyutu */
  maxHistory?: number;
}

// ─── Hook ───────────────────────────────────────────────

export function useQuickZapping({
  totalChannels,
  currentIndex,
  onChannelChange,
  previewTimeout = 2000,
  numberTimeout = 1500,
  maxHistory = 20,
}: ZappingConfig): [ZappingState, ZappingActions] {
  const [state, setState] = useState<ZappingState>({
    showPreview: false,
    previewDirection: null,
    previewChannelIndex: currentIndex,
    numberInputActive: false,
    numberBuffer: '',
    lastChannelIndex: -1,
    channelHistory: [],
  });

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview'i temizle
  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  // Numara girdisini temizle
  const clearNumberTimer = useCallback(() => {
    if (numberTimerRef.current) {
      clearTimeout(numberTimerRef.current);
      numberTimerRef.current = null;
    }
  }, []);

  // Kanal degistir (ortak logic)
  const switchToChannel = useCallback((newIndex: number) => {
    setState((prev) => ({
      ...prev,
      showPreview: false,
      previewDirection: null,
      lastChannelIndex: currentIndex,
      channelHistory: [
        currentIndex,
        ...prev.channelHistory.slice(0, maxHistory - 1),
      ],
    }));
    onChannelChange(newIndex);
  }, [currentIndex, maxHistory, onChannelChange]);

  // Kanal yukari
  const channelUp = useCallback(() => {
    const nextIndex = (currentIndex + 1) % totalChannels;

    setState((prev) => ({
      ...prev,
      showPreview: true,
      previewDirection: 'up',
      previewChannelIndex: nextIndex,
    }));

    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      switchToChannel(nextIndex);
    }, previewTimeout);
  }, [currentIndex, totalChannels, previewTimeout, clearPreviewTimer, switchToChannel]);

  // Kanal asagi
  const channelDown = useCallback(() => {
    const prevIndex = currentIndex === 0 ? totalChannels - 1 : currentIndex - 1;

    setState((prev) => ({
      ...prev,
      showPreview: true,
      previewDirection: 'down',
      previewChannelIndex: prevIndex,
    }));

    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      switchToChannel(prevIndex);
    }, previewTimeout);
  }, [currentIndex, totalChannels, previewTimeout, clearPreviewTimer, switchToChannel]);

  // Numara girisi
  const inputNumber = useCallback((digit: string) => {
    clearNumberTimer();

    setState((prev) => {
      const newBuffer = prev.numberBuffer + digit;
      return {
        ...prev,
        numberInputActive: true,
        numberBuffer: newBuffer,
      };
    });

    // Timeout sonra kanal degistir
    numberTimerRef.current = setTimeout(() => {
      setState((prev) => {
        const channelNum = parseInt(prev.numberBuffer, 10);
        if (channelNum > 0 && channelNum <= totalChannels) {
          // channelNum 1-based, index 0-based
          switchToChannel(channelNum - 1);
        }
        return {
          ...prev,
          numberInputActive: false,
          numberBuffer: '',
        };
      });
    }, numberTimeout);
  }, [totalChannels, numberTimeout, clearNumberTimer, switchToChannel]);

  // Son kanala don
  const goToLastChannel = useCallback(() => {
    if (state.lastChannelIndex >= 0) {
      switchToChannel(state.lastChannelIndex);
    }
  }, [state.lastChannelIndex, switchToChannel]);

  // Gecmiste geri git
  const goBack = useCallback(() => {
    if (state.channelHistory.length > 0) {
      const [prevChannel, ...rest] = state.channelHistory;
      setState((prev) => ({ ...prev, channelHistory: rest }));
      onChannelChange(prevChannel);
    }
  }, [state.channelHistory, onChannelChange]);

  // Onizlemeyi onayla
  const confirmPreview = useCallback(() => {
    clearPreviewTimer();
    switchToChannel(state.previewChannelIndex);
  }, [clearPreviewTimer, switchToChannel, state.previewChannelIndex]);

  // Onizlemeyi iptal
  const cancelPreview = useCallback(() => {
    clearPreviewTimer();
    setState((prev) => ({
      ...prev,
      showPreview: false,
      previewDirection: null,
    }));
  }, [clearPreviewTimer]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearPreviewTimer();
      clearNumberTimer();
    };
  }, [clearPreviewTimer, clearNumberTimer]);

  return [
    state,
    {
      channelUp,
      channelDown,
      inputNumber,
      goToLastChannel,
      goBack,
      confirmPreview,
      cancelPreview,
    },
  ];
}
