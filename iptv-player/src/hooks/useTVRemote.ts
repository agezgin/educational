/**
 * useTVRemote - TV kumanda tuslarini yakalayan hook.
 *
 * Best practice kaynaklari:
 * - react-native-tvos: TVEventHandler API
 * - react-tv-space-navigation: remoteControlSubscriber pattern
 * - Amazon multi-tv-app-sample: key mapping patterns
 *
 * D-Pad mapping:
 * - Yukari/Asagi: Kanal degistir veya listede gezin
 * - Sol/Sag: Ses kontrol veya kategori navigasyonu
 * - OK/Select: Sec / OSD ac
 * - Back: Geri git / OSD kapat
 * - CH+/CH-: Kanal degistir (her zaman)
 * - Renkli tuslar: Kisayollar
 * - Media tuslari: Play/Pause/Stop/Rewind/FastForward
 *
 * Long-press:
 * - OK uzun basma -> context menu / favori toggle
 * - Yon tusu uzun basma -> hizli scroll (repeat event)
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
  | 'number'
  | 'play'
  | 'pause'
  | 'playPause'
  | 'stop'
  | 'rewind'
  | 'fastForward'
  | 'colorRed'
  | 'colorGreen'
  | 'colorYellow'
  | 'colorBlue'
  | 'info'
  | 'menu';

interface TVRemoteHandlers {
  // ─── D-Pad ─────────────────────────────
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;

  // ─── Long-press ────────────────────────
  /** OK tusuna uzun basma (favori, context menu) */
  onLongSelect?: () => void;

  // ─── Kanal/Ses ─────────────────────────
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onNumber?: (num: number) => void;

  // ─── Media Kontrol ─────────────────────
  onPlay?: () => void;
  onPause?: () => void;
  onPlayPause?: () => void;
  onStop?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;

  // ─── Renkli Tuslar ─────────────────────
  /** Kirmizi: EPG / Program Rehberi */
  onColorRed?: () => void;
  /** Yesil: Favoriler */
  onColorGreen?: () => void;
  /** Sari: Ses/Altyazi secimi */
  onColorYellow?: () => void;
  /** Mavi: Bilgi / Detay */
  onColorBlue?: () => void;

  // ─── Diger ─────────────────────────────
  onInfo?: () => void;
  onMenu?: () => void;
}

/** Long-press algilama suresi (ms) */
const LONG_PRESS_THRESHOLD = 600;

export function useTVRemote(handlers: TVRemoteHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Long-press algilama state
  const selectPressStartRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    const tvEventHandler = new (TVEventHandler as any)();

    tvEventHandler.enable(null, (_cmp: any, evt: any) => {
      const eventType = evt?.eventType;
      if (!eventType) return;

      const h = handlersRef.current;

      switch (eventType) {
        // ─── D-Pad ──────────────────────
        case 'up':
          h.onUp?.();
          break;
        case 'down':
          h.onDown?.();
          break;
        case 'left':
          h.onLeft?.();
          break;
        case 'right':
          h.onRight?.();
          break;

        // ─── Select (long-press destegi) ─
        case 'select':
          if (h.onLongSelect) {
            // Press start zamani kaydet
            selectPressStartRef.current = Date.now();
            longPressTimerRef.current = setTimeout(() => {
              h.onLongSelect?.();
              selectPressStartRef.current = 0; // Long-press tetiklendi, normal press'i engelle
            }, LONG_PRESS_THRESHOLD);
          } else {
            h.onSelect?.();
          }
          break;

        // Select birakma (long-press degilse normal select)
        case 'blur':
        case 'swipeUp': // tvOS swipe pattern
          if (selectPressStartRef.current > 0) {
            const pressDuration = Date.now() - selectPressStartRef.current;
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
            }
            if (pressDuration < LONG_PRESS_THRESHOLD) {
              h.onSelect?.();
            }
            selectPressStartRef.current = 0;
          }
          break;

        // ─── Back ───────────────────────
        case 'back':
          h.onBack?.();
          break;

        // ─── Media ──────────────────────
        case 'playPause':
          h.onPlayPause?.() ?? h.onSelect?.();
          break;
        case 'play':
          h.onPlay?.();
          break;
        case 'pause':
          h.onPause?.();
          break;
        case 'stop':
          h.onStop?.();
          break;
        case 'rewind':
          h.onRewind?.();
          break;
        case 'fastForward':
          h.onFastForward?.();
          break;

        // ─── Diger ──────────────────────
        case 'menu':
          h.onMenu?.();
          break;
      }
    });

    return () => {
      tvEventHandler.disable();
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);
}

/**
 * Numara tuslariyla kanal secimi.
 * Kullanici rakam girisini bitirdikten sonra (1.5sn timeout) kanala gider.
 *
 * Ekranda girilen numara gosterilir (OSD number overlay).
 */
export function useChannelNumberInput(
  onChannelSelect: (number: number) => void,
  timeoutMs = 1500
): {
  currentInput: string;
  isActive: boolean;
  handleNumberPress: (num: number) => void;
  cancel: () => void;
} {
  const inputRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isActiveRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    inputRef.current = '';
    isActiveRef.current = false;
  }, []);

  const handleNumberPress = useCallback((num: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    inputRef.current += String(num);
    isActiveRef.current = true;

    // Max 4 haneli kanal numarasi
    if (inputRef.current.length >= 4) {
      const channelNum = parseInt(inputRef.current, 10);
      if (!isNaN(channelNum)) {
        onChannelSelect(channelNum);
      }
      inputRef.current = '';
      isActiveRef.current = false;
      return;
    }

    timerRef.current = setTimeout(() => {
      const channelNum = parseInt(inputRef.current, 10);
      if (!isNaN(channelNum)) {
        onChannelSelect(channelNum);
      }
      inputRef.current = '';
      isActiveRef.current = false;
    }, timeoutMs);
  }, [onChannelSelect, timeoutMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    currentInput: inputRef.current,
    isActive: isActiveRef.current,
    handleNumberPress,
    cancel,
  };
}
