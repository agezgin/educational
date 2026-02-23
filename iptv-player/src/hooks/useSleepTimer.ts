/**
 * Sleep Timer Hook
 *
 * Uyku zamanlayicisi:
 * - Belirli sure sonra oynatmayi durdur
 * - Geri sayim gostergesi
 * - Preset sureler (15dk, 30dk, 45dk, 60dk, 90dk, 120dk)
 * - Uzatma secenegi (kalan 5dk'da sor)
 * - Gradual volume decrease (son 2dk'da sesi azalt)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SleepTimerState {
  /** Timer aktif mi */
  isActive: boolean;
  /** Kalan sure (saniye) */
  remainingSeconds: number;
  /** Toplam set edilen sure (saniye) */
  totalSeconds: number;
  /** Uzatma sorusu gosterilsin mi */
  showExtendPrompt: boolean;
}

export interface SleepTimerActions {
  /** Timer'i baslat */
  start: (minutes: number) => void;
  /** Timer'i durdur */
  stop: () => void;
  /** Sure ekle */
  extend: (minutes: number) => void;
  /** Formatli kalan sure */
  formattedTime: string;
}

/** Preset sureler (dakika) */
export const SLEEP_TIMER_PRESETS = [15, 30, 45, 60, 90, 120];

/**
 * Sleep Timer hook.
 *
 * @param onTimerEnd - Timer bitince cagrilacak callback (player durdur)
 * @param onVolumeChange - Ses azaltma icin callback
 */
export function useSleepTimer(
  onTimerEnd: () => void,
  onVolumeChange?: (volume: number) => void,
): [SleepTimerState, SleepTimerActions] {
  const [state, setState] = useState<SleepTimerState>({
    isActive: false,
    remainingSeconds: 0,
    totalSeconds: 0,
    showExtendPrompt: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalVolumeRef = useRef(100);

  // Timer baslatma
  const start = useCallback((minutes: number) => {
    const totalSec = minutes * 60;
    setState({
      isActive: true,
      remainingSeconds: totalSec,
      totalSeconds: totalSec,
      showExtendPrompt: false,
    });
  }, []);

  // Timer durdurma
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Sesi eski haline getir
    onVolumeChange?.(originalVolumeRef.current);
    setState({
      isActive: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      showExtendPrompt: false,
    });
  }, [onVolumeChange]);

  // Sure uzatma
  const extend = useCallback((minutes: number) => {
    setState((prev) => ({
      ...prev,
      remainingSeconds: prev.remainingSeconds + minutes * 60,
      totalSeconds: prev.totalSeconds + minutes * 60,
      showExtendPrompt: false,
    }));
    // Sesi geri yukle
    onVolumeChange?.(originalVolumeRef.current);
  }, [onVolumeChange]);

  // Formatli sure
  const formattedTime = formatTime(state.remainingSeconds);

  // Interval
  useEffect(() => {
    if (!state.isActive) return;

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const remaining = prev.remainingSeconds - 1;

        if (remaining <= 0) {
          // Timer bitti
          onTimerEnd();
          return {
            ...prev,
            isActive: false,
            remainingSeconds: 0,
            showExtendPrompt: false,
          };
        }

        // Son 5 dakika: uzatma sorusu
        if (remaining === 300) {
          return {
            ...prev,
            remainingSeconds: remaining,
            showExtendPrompt: true,
          };
        }

        // Son 2 dakika: sesi yavasce azalt
        if (remaining <= 120 && onVolumeChange) {
          const volumeRatio = remaining / 120; // 1.0 -> 0.0
          onVolumeChange(Math.round(originalVolumeRef.current * volumeRatio));
        }

        return {
          ...prev,
          remainingSeconds: remaining,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isActive, onTimerEnd, onVolumeChange]);

  return [
    state,
    { start, stop, extend, formattedTime },
  ];
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
