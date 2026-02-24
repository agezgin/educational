/**
 * useIdleTimer - Kullanici hareketsizlik algilama hook'u.
 *
 * TV kumanda veya herhangi bir kullanici etkilesimi sonrasi
 * zamanlayiciyi sifirlar. Belirtilen sure dolunca onIdle callback'ini cagirir.
 *
 * Kullanim: Ekran koruyucu sistemi icin.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { TVEventHandler, Platform, AppState } from 'react-native';

interface UseIdleTimerOptions {
  /** Hareketsizlik suresi (milisaniye) - varsayilan 5dk */
  timeoutMs: number;
  /** Idle olunca cagirilir */
  onIdle: () => void;
  /** Idle'dan donulunce cagirilir */
  onActive: () => void;
  /** Timer aktif mi? */
  enabled: boolean;
}

interface UseIdleTimerReturn {
  /** Kullanici idle durumunda mi? */
  isIdle: boolean;
  /** Timer'i manuel sifirla */
  resetTimer: () => void;
  /** Idle'dan cikmak icin herhangi bir etkilesim */
  dismissIdle: () => void;
}

export function useIdleTimer({
  timeoutMs,
  onIdle,
  onActive,
  enabled,
}: UseIdleTimerOptions): UseIdleTimerReturn {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);

  // Callback ref'lerini guncelle
  onIdleRef.current = onIdle;
  onActiveRef.current = onActive;

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
      onIdleRef.current();
    }, timeoutMs);
  }, [timeoutMs, clearIdleTimer]);

  const resetTimer = useCallback(() => {
    if (isIdleRef.current) {
      // Idle'dan donus
      isIdleRef.current = false;
      setIsIdle(false);
      onActiveRef.current();
    }
    startIdleTimer();
  }, [startIdleTimer]);

  const dismissIdle = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      onActiveRef.current();
      startIdleTimer();
    }
  }, [startIdleTimer]);

  // TV kumanda olaylarini dinle - herhangi bir tusa basilinca idle timer'i sifirla
  useEffect(() => {
    if (!enabled) {
      clearIdleTimer();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
      return;
    }

    startIdleTimer();

    // TV remote events ile idle timer'i sifirla
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const tvEventHandler = new (TVEventHandler as any)();

      tvEventHandler.enable(null, () => {
        // Herhangi bir kumanda tusu -> idle timer sifirla
        if (isIdleRef.current) {
          dismissIdle();
        } else {
          startIdleTimer();
        }
      });

      return () => {
        tvEventHandler.disable();
        clearIdleTimer();
      };
    }

    return () => {
      clearIdleTimer();
    };
  }, [enabled, startIdleTimer, clearIdleTimer, dismissIdle]);

  // Uygulama arka plana gidince timer'i durdur
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && enabled) {
        startIdleTimer();
      } else if (nextState !== 'active') {
        clearIdleTimer();
        if (isIdleRef.current) {
          isIdleRef.current = false;
          setIsIdle(false);
        }
      }
    });

    return () => subscription.remove();
  }, [enabled, startIdleTimer, clearIdleTimer]);

  // Cleanup
  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  return { isIdle, resetTimer, dismissIdle };
}

/** Ekran koruyucu suresi secenekleri (dakika) */
export const SCREENSAVER_TIMEOUT_PRESETS = [3, 5, 10, 15, 30] as const;
export type ScreensaverTimeout = typeof SCREENSAVER_TIMEOUT_PRESETS[number];

/** Ekran koruyucu turleri */
export type ScreensaverStyle = 'fireplace' | 'snowfall' | 'starryNight' | 'aurora' | 'clock' | 'off';
