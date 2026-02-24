/**
 * FocusableItem - TV kumanda ile navigasyon icin temel focusable component.
 *
 * Focus kurallari (dokumantan):
 * 1. Focus HER ZAMAN gorunur (mavi cerceve + hafif buyutme)
 * 2. Focus siralamasi mantikli (sol->sag, yukari->asagi)
 * 3. Focus kaybolmaz (ekran kenarinda dur)
 * 4. Son focus'u hatirla
 * 5. Animasyonlar max 150ms
 *
 * Best practice kaynaklari:
 * - react-tv-space-navigation: isFocused render pattern
 * - @noriginmedia/norigin-spatial-navigation: useFocusable hook
 * - Amazon multi-tv-app-sample: focus-driven hero banner debounce
 *
 * Eklenen ozellikler:
 * - Long-press desteği (favori ekleme, context menu)
 * - Focus ses geribildirim hook'u
 * - Animasyon timing (spring yerine timing - daha tahmini)
 * - onLayout ile spatial navigation entegrasyonu
 * - Scale miktari ayarlanabilir (focusScale)
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Animated,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '@/theme';

interface FocusableItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Layout degistiginde callback (spatial nav icin) */
  onLayoutMeasured?: (layout: { x: number; y: number; width: number; height: number }) => void;
  style?: ViewStyle;
  focusedStyle?: ViewStyle;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
  testID?: string;
  /** Focus buyutme miktari (varsayilan: 1.05) */
  focusScale?: number;
  /** Long-press suresi ms (varsayilan: 800) */
  longPressMs?: number;
  /** Focus animasyon suresi ms (varsayilan: 150) */
  animationDuration?: number;
}

export const FocusableItem: React.FC<FocusableItemProps> = ({
  children,
  onPress,
  onLongPress,
  onFocus,
  onBlur,
  onLayoutMeasured,
  style,
  focusedStyle,
  hasTVPreferredFocus = false,
  disabled = false,
  testID,
  focusScale = 1.05,
  longPressMs = 800,
  animationDuration = 150,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const isPressedRef = useRef(false);

  // Cleanup long-press timer
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);

    // Paralel animasyonlar - timing daha tahmini (TV icin onemli)
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: focusScale,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: false, // borderColor native driver desteklemez
      }),
    ]).start();

    onFocus?.();
  }, [scaleAnim, borderAnim, focusScale, animationDuration, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]).start();

    // Long-press iptal
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }

    onBlur?.();
  }, [scaleAnim, borderAnim, animationDuration, onBlur]);

  const handlePressIn = useCallback(() => {
    isPressedRef.current = true;

    // Long-press baslatma
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (isPressedRef.current) {
          onLongPress();
          isPressedRef.current = false; // Normal press'i engelle
        }
      }, longPressMs);
    }
  }, [onLongPress, longPressMs]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    isPressedRef.current = false;
  }, []);

  const handlePress = useCallback(
    (_event?: GestureResponderEvent) => {
      if (!disabled && isPressedRef.current !== false) {
        onPress?.();
      }
    },
    [disabled, onPress]
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (onLayoutMeasured) {
      const { x, y, width, height } = event.nativeEvent.layout;
      onLayoutMeasured({ x, y, width, height });
    }
  }, [onLayoutMeasured]);

  // Animasyonlu border rengi
  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.focus.ring],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLongPress={onLongPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      testID={testID}
      onLayout={handleLayout}
    >
      <Animated.View
        style={[
          styles.container,
          style,
          {
            transform: [{ scale: scaleAnim }],
            borderColor: animatedBorderColor,
          },
          isFocused && styles.focused,
          isFocused && focusedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Focus Ses Geribildirim Hook'u ─────────────────────

/**
 * Focus degisim sesi calmak icin hook.
 * TV uygulamalarinda kullaniciya navigasyon geribildirim verir.
 *
 * Not: Gercek uygulamada react-native-sound veya expo-audio ile
 * kisa "tick" sesi calinir. Burada callback pattern saglanir.
 */
export function useFocusSound(
  playSound: () => void,
  enabled = true,
): { onFocusWithSound: () => void } {
  const onFocusWithSound = useCallback(() => {
    if (enabled) {
      playSound();
    }
  }, [playSound, enabled]);

  return { onFocusWithSound };
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    backgroundColor: colors.background.card,
  },
  focused: {
    backgroundColor: colors.background.active,
    shadowColor: colors.focus.ring,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
