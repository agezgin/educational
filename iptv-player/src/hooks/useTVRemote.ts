/**
 * useTVRemote - TV kumanda tuslarini yakalayan hook.
 *
 * D-Pad mapping:
 * - Yukari/Asagi: Kanal degistir veya listede gezin
 * - Sol/Sag: Ses kontrol veya kategori navigasyonu
 * - OK/Select: Sec / OSD ac
 * - Back: Geri git / OSD kapat
 * - CH+/CH-: Kanal degistir (her zaman)
 *
 * Numara tuslari: Direkt kanal numarasi girisi
 */

import { useEffect, useRef, useCallback } from 'react';
import { TVEventHandler, Platform } from 'react-native';

export type TVRemoteEvent =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'back'
  | 'channelUp'
  | 'channelDown'
  | 'volumeUp'
  | 'volumeDown'
  | 'number';

interface TVRemoteHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onNumber?: (num: number) => void;
}

export function useTVRemote(handlers: TVRemoteHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const tvEventHandler = new (TVEventHandler as any)();

    tvEventHandler.enable(null, (_cmp: any, evt: any) => {
      const eventType = evt?.eventType;
      if (!eventType) return;

      switch (eventType) {
        case 'up':
          handlersRef.current.onUp?.();
          break;
        case 'down':
          handlersRef.current.onDown?.();
          break;
        case 'left':
          handlersRef.current.onLeft?.();
          break;
        case 'right':
          handlersRef.current.onRight?.();
          break;
        case 'select':
          handlersRef.current.onSelect?.();
          break;
        case 'playPause':
          handlersRef.current.onSelect?.();
          break;
      }
    });

    return () => {
      tvEventHandler.disable();
    };
  }, []);
}

/**
 * Numara tuslariyla kanal secimi.
 * Kullanici rakam girisini bitirdikten sonra (1.5sn timeout) kanala gider.
 */
export function useChannelNumberInput(
  onChannelSelect: (number: number) => void,
  timeoutMs = 1500
): {
  currentInput: string;
  handleNumberPress: (num: number) => void;
} {
  const inputRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleNumberPress = useCallback((num: number) => {
    clearTimeout(timerRef.current);
    inputRef.current += String(num);

    timerRef.current = setTimeout(() => {
      const channelNum = parseInt(inputRef.current, 10);
      if (!isNaN(channelNum)) {
        onChannelSelect(channelNum);
      }
      inputRef.current = '';
    }, timeoutMs);
  }, [onChannelSelect, timeoutMs]);

  return {
    currentInput: inputRef.current,
    handleNumberPress,
  };
}
