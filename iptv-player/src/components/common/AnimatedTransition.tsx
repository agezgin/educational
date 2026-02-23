/**
 * Animated Transition Utilities
 *
 * Modern gecis animasyonlari:
 * - FadeIn/FadeOut
 * - SlideIn (soldan, sagdan, alttan, ustden)
 * - Scale (zoom in/out)
 * - Staggered list animasyonlari
 *
 * Netflix/TiviMate seviyesinde akici gecisler.
 * React Native Animated API kullanir (native driver).
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, ViewStyle, StyleSheet, Easing } from 'react-native';

// ─── Fade Animation ─────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  visible?: boolean;
}

export function FadeIn({ children, duration = 300, delay = 0, style, visible = true }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [visible, duration, delay, opacity]);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

// ─── Slide Animation ────────────────────────────────────

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: React.ReactNode;
  direction?: SlideDirection;
  distance?: number;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  visible?: boolean;
}

export function SlideIn({
  children,
  direction = 'left',
  distance = 50,
  duration = 350,
  delay = 0,
  style,
  visible = true,
}: SlideInProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: visible ? 1 : 0,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();
  }, [visible, duration, delay, animValue]);

  const translateStyle = useMemo(() => {
    const translate = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [
        direction === 'left' ? -distance :
        direction === 'right' ? distance :
        direction === 'up' ? -distance : distance,
        0,
      ],
    });

    const isHorizontal = direction === 'left' || direction === 'right';
    return {
      opacity: animValue,
      transform: [isHorizontal ? { translateX: translate } : { translateY: translate }],
    };
  }, [direction, distance, animValue]);

  return (
    <Animated.View style={[style, translateStyle]}>
      {children}
    </Animated.View>
  );
}

// ─── Scale Animation ────────────────────────────────────

interface ScaleInProps {
  children: React.ReactNode;
  initialScale?: number;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  visible?: boolean;
}

export function ScaleIn({
  children,
  initialScale = 0.85,
  duration = 300,
  delay = 0,
  style,
  visible = true,
}: ScaleInProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: visible ? 1 : 0,
      tension: 65,
      friction: 9,
      delay,
      useNativeDriver: true,
    }).start();
  }, [visible, delay, animValue]);

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [initialScale, 1],
  });

  return (
    <Animated.View style={[style, { opacity: animValue, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Staggered List ─────────────────────────────────────

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  direction?: SlideDirection;
  style?: ViewStyle;
}

/**
 * Cocuk elemanlarini sirayla animasyonla gosterir.
 * Netflix tarzinda liste animasyonu.
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  direction = 'up',
  style,
}: StaggeredListProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <SlideIn
          direction={direction}
          delay={index * staggerDelay}
          duration={350}
          distance={30}
          style={style}
        >
          {child}
        </SlideIn>
      ))}
    </>
  );
}

// ─── Pulse Animation ────────────────────────────────────

interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  minScale?: number;
  style?: ViewStyle;
  active?: boolean;
}

/**
 * Nabiz efekti - canli yayin gostergesi, loading indicator vs.
 */
export function Pulse({
  children,
  duration = 1200,
  minScale = 0.95,
  style,
  active = true,
}: PulseProps) {
  const animValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      animValue.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sine),
        }),
        Animated.timing(animValue, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sine),
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [active, duration, minScale, animValue]);

  return (
    <Animated.View style={[style, { transform: [{ scale: animValue }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Shimmer Effect (Skeleton Loading) ──────────────────

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer/Skeleton loading efekti.
 * Icerik yuklenirken gosterilir.
 */
export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: '#21262D',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          transform: [{ translateX }],
          width: 100,
        }}
      />
    </Animated.View>
  );
}

// ─── Skeleton Components ────────────────────────────────

/**
 * Kanal listesi yuklenirken gosterilen skeleton.
 */
export function ChannelListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={skeletonStyles.channelItem}>
          <Shimmer width={60} height={60} borderRadius={30} />
          <Animated.View style={skeletonStyles.channelInfo}>
            <Shimmer width={180} height={16} />
            <Shimmer width={120} height={12} style={{ marginTop: 8 }} />
          </Animated.View>
          <Shimmer width={60} height={12} />
        </Animated.View>
      ))}
    </>
  );
}

/**
 * Film/Dizi poster grid yuklenirken gosterilen skeleton.
 */
export function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <Animated.View style={skeletonStyles.posterGrid}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={skeletonStyles.posterItem}>
          <Shimmer width={140} height={210} borderRadius={12} />
          <Shimmer width={100} height={12} style={{ marginTop: 8 }} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/**
 * EPG grid yuklenirken gosterilen skeleton.
 */
export function EPGSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={skeletonStyles.epgRow}>
          <Shimmer width={60} height={40} borderRadius={4} />
          <Shimmer width={200} height={40} borderRadius={4} style={{ marginLeft: 8 }} />
          <Shimmer width={150} height={40} borderRadius={4} style={{ marginLeft: 4 }} />
          <Shimmer width={180} height={40} borderRadius={4} style={{ marginLeft: 4 }} />
        </Animated.View>
      ))}
    </>
  );
}

/**
 * Detay sayfasi yuklenirken gosterilen skeleton.
 */
export function DetailSkeleton() {
  return (
    <Animated.View style={skeletonStyles.detail}>
      {/* Backdrop */}
      <Shimmer width="100%" height={300} borderRadius={0} />

      {/* Info */}
      <Animated.View style={skeletonStyles.detailContent}>
        <Shimmer width={130} height={195} borderRadius={12} />
        <Animated.View style={skeletonStyles.detailInfo}>
          <Shimmer width={250} height={24} />
          <Shimmer width={180} height={14} style={{ marginTop: 12 }} />
          <Shimmer width={200} height={14} style={{ marginTop: 8 }} />
          <Shimmer width={300} height={40} borderRadius={20} style={{ marginTop: 16 }} />
        </Animated.View>
      </Animated.View>

      {/* Cast */}
      <Animated.View style={skeletonStyles.castRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <Animated.View key={i} style={{ alignItems: 'center', marginRight: 16 }}>
            <Shimmer width={70} height={70} borderRadius={35} />
            <Shimmer width={60} height={10} style={{ marginTop: 6 }} />
          </Animated.View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  channelInfo: {
    flex: 1,
  },
  posterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  posterItem: {
    alignItems: 'center',
  },
  epgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  detail: {
    flex: 1,
  },
  detailContent: {
    flexDirection: 'row',
    padding: 20,
    marginTop: -60,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 20,
    marginTop: 60,
  },
  castRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
  },
});
