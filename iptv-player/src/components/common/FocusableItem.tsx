/**
 * FocusableItem - TV kumanda ile navigasyon icin temel focusable component.
 *
 * Focus kurallari (dokumantan):
 * 1. Focus HER ZAMAN gorunur (mavi cerceve + hafif buyutme)
 * 2. Focus siralamasi mantikli (sol->sag, yukari->asagi)
 * 3. Focus kaybolmaz (ekran kenarinda dur)
 * 4. Son focus'u hatirla
 * 5. Animasyonlar max 150ms
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  TouchableOpacity,
  Animated,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { colors } from '@/theme';

interface FocusableItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
  focusedStyle?: ViewStyle;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
  testID?: string;
}

export const FocusableItem: React.FC<FocusableItemProps> = ({
  children,
  onPress,
  onFocus,
  onBlur,
  style,
  focusedStyle,
  hasTVPreferredFocus = false,
  disabled = false,
  testID,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    onFocus?.();
  }, [scaleAnim, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    onBlur?.();
  }, [scaleAnim, onBlur]);

  const handlePress = useCallback(
    (_event?: GestureResponderEvent) => {
      if (!disabled) {
        onPress?.();
      }
    },
    [disabled, onPress]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.container,
          style,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.focused,
          isFocused && focusedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    backgroundColor: colors.background.card,
  },
  focused: {
    borderColor: colors.focus.ring,
    backgroundColor: colors.background.active,
    shadowColor: colors.focus.ring,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
