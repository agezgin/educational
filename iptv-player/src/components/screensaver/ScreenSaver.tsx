/**
 * ScreenSaver - Samsung Ambient Mode Tarzi Ekran Koruyucu
 *
 * 5 farkli tema:
 * 1. fireplace    - Sicak somine alevi, kor parcaciklari yukari yukselir
 * 2. snowfall     - Kar yagisi, farkli boyut ve hizda kar taneleri
 * 3. starryNight  - Gece gokyuzu, yanip sonen yildizlar + kayan yildizlar
 * 4. aurora       - Kuzey isiklari, canli renk blob'lari
 * 5. clock        - Minimalist buyuk saat, yavasa hareket
 *
 * Tum temalar:
 * - Samsung TV Ambient Mode tarzi tablo gorunumu
 * - Burn-in onleme icin yavasa pozisyon degisimi
 * - Dusuk GPU kullanimi (native driver)
 * - Saat overlay + fade in/out
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { colors, spacing, typography } from '@/theme';
import type { ScreensaverStyle } from '@/types/settings';

interface ScreenSaverProps {
  visible: boolean;
  style: ScreensaverStyle;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Ortak: Saat ────────────────────────────────────────

function useCurrentTime() {
  const [time, setTime] = React.useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Saat overlay - tum temalarin uzerinde gosterilir */
function ClockOverlay({ color = 'rgba(255,255,255,0.85)', shadowColor = 'rgba(0,0,0,0.6)' }) {
  const time = useCurrentTime();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const moveX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 60,
          duration: 50000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -60,
          duration: 50000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    const moveY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 30,
          duration: 40000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 40000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    moveX.start();
    moveY.start();
    return () => { moveX.stop(); moveY.stop(); };
  }, [translateX, translateY]);

  return (
    <Animated.View
      style={[
        sharedStyles.clockContainer,
        { transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Text
        style={[
          sharedStyles.clockTime,
          { color, textShadowColor: shadowColor },
        ]}
      >
        {formatTime(time)}
      </Text>
      <Text
        style={[
          sharedStyles.clockDate,
          { color, opacity: 0.7, textShadowColor: shadowColor },
        ]}
      >
        {formatDate(time)}
      </Text>
    </Animated.View>
  );
}

// ─── Parcacik Altyapisi ─────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

function generateParticles(count: number, generator: (i: number) => Particle): Particle[] {
  return Array.from({ length: count }, (_, i) => generator(i));
}

// ═══════════════════════════════════════════════════════
//  1. SOMINE / ALEV TEMASI
// ═══════════════════════════════════════════════════════

const EMBER_COUNT = 35;
const FLAME_GLOW_COUNT = 4;

function FireplaceScreenSaver() {
  // Kor parcaciklari (yukari yukselenler)
  const embers = useMemo(() =>
    generateParticles(EMBER_COUNT, (i) => ({
      id: i,
      x: SCREEN_WIDTH * 0.15 + Math.random() * SCREEN_WIDTH * 0.7,
      y: SCREEN_HEIGHT,
      size: 3 + Math.random() * 6,
      speed: 8000 + Math.random() * 12000,
      opacity: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 5000,
    })),
    [],
  );

  // Alev isigi blob'lari (somine gorunumu)
  const glows = useMemo(() =>
    generateParticles(FLAME_GLOW_COUNT, (i) => ({
      id: i,
      x: SCREEN_WIDTH * 0.2 + (i / FLAME_GLOW_COUNT) * SCREEN_WIDTH * 0.6,
      y: SCREEN_HEIGHT * 0.75,
      size: SCREEN_WIDTH * 0.25 + Math.random() * SCREEN_WIDTH * 0.15,
      speed: 3000 + Math.random() * 4000,
      opacity: 0.15 + Math.random() * 0.15,
      delay: i * 800,
    })),
    [],
  );

  return (
    <View style={fireStyles.container}>
      {/* Arka plan - koyu kirmizimsi */}
      <View style={fireStyles.bgLayer} />

      {/* Alev isiklari (buyuk blob'lar) */}
      {glows.map((g) => (
        <FlameGlow key={`glow-${g.id}`} particle={g} />
      ))}

      {/* Kor parcaciklari */}
      {embers.map((e) => (
        <EmberParticle key={`ember-${e.id}`} particle={e} />
      ))}

      <ClockOverlay color="rgba(255, 220, 180, 0.9)" shadowColor="rgba(0,0,0,0.7)" />
    </View>
  );
}

function EmberParticle({ particle }: { particle: Particle }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -(SCREEN_HEIGHT * 0.6 + Math.random() * SCREEN_HEIGHT * 0.3),
            duration: particle.speed,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: -20 + Math.random() * 40,
              duration: particle.speed * 0.5,
              easing: Easing.inOut(Easing.sine),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -15 + Math.random() * 30,
              duration: particle.speed * 0.5,
              easing: Easing.inOut(Easing.sine),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: particle.opacity,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.delay(particle.speed - 2000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1400,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    rise.start();
    return () => rise.stop();
  }, [translateY, translateX, opacity, particle]);

  const emberColor = particle.id % 2 === 0 ? '#FF6B35' : '#FFB347';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        bottom: SCREEN_HEIGHT * 0.15,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: emberColor,
        opacity,
        transform: [{ translateY }, { translateX }],
        shadowColor: '#FF4500',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: particle.size * 2,
        elevation: 3,
      }}
    />
  );
}

function FlameGlow({ particle }: { particle: Particle }) {
  const opacity = useRef(new Animated.Value(particle.opacity * 0.5)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: particle.opacity,
            duration: particle.speed,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.15,
            duration: particle.speed,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: particle.opacity * 0.4,
            duration: particle.speed * 0.8,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.9,
            duration: particle.speed * 0.8,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, scale, particle]);

  const flameColors = ['#FF4500', '#FF6347', '#FF8C00', '#DC143C'];
  const color = flameColors[particle.id % flameColors.length];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x - particle.size / 2,
        top: particle.y - particle.size / 2,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

const fireStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0A00',
  },
});

// ═══════════════════════════════════════════════════════
//  2. KAR YAGISI TEMASI
// ═══════════════════════════════════════════════════════

const SNOWFLAKE_COUNT = 50;

function SnowfallScreenSaver() {
  const snowflakes = useMemo(() =>
    generateParticles(SNOWFLAKE_COUNT, (i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: -20 - Math.random() * SCREEN_HEIGHT * 0.3,
      size: 2 + Math.random() * 8,
      speed: 6000 + Math.random() * 10000,
      opacity: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 8000,
    })),
    [],
  );

  return (
    <View style={snowStyles.container}>
      <View style={snowStyles.bgLayer} />

      {/* Yere yakin hafif beyaz parlama */}
      <View style={snowStyles.groundGlow} />

      {snowflakes.map((s) => (
        <SnowflakeParticle key={`snow-${s.id}`} particle={s} />
      ))}

      <ClockOverlay color="rgba(200, 220, 255, 0.9)" shadowColor="rgba(0,0,20,0.7)" />
    </View>
  );
}

function SnowflakeParticle({ particle }: { particle: Particle }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          // Asagi dusme
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT + 40,
            duration: particle.speed,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Yana sallanma (ruzgar efekti)
          Animated.loop(
            Animated.sequence([
              Animated.timing(translateX, {
                toValue: 30 + particle.size * 3,
                duration: 2000 + particle.id * 100,
                easing: Easing.inOut(Easing.sine),
                useNativeDriver: true,
              }),
              Animated.timing(translateX, {
                toValue: -(20 + particle.size * 2),
                duration: 2000 + particle.id * 100,
                easing: Easing.inOut(Easing.sine),
                useNativeDriver: true,
              }),
            ]),
          ),
          // Donme (buyuk taneler icin)
          Animated.loop(
            Animated.timing(rotation, {
              toValue: 1,
              duration: 4000 + particle.size * 500,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ),
          // Goruntu
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: particle.opacity,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.delay(particle.speed - 2000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Reset
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    fall.start();
    return () => fall.stop();
  }, [translateY, translateX, opacity, rotation, particle]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: '#FFFFFF',
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: particle.size,
        elevation: 2,
      }}
    />
  );
}

const snowStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1628',
  },
  groundGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.08,
    backgroundColor: 'rgba(180, 200, 230, 0.06)',
  },
});

// ═══════════════════════════════════════════════════════
//  3. YILDIZLI GECE TEMASI
// ═══════════════════════════════════════════════════════

const STAR_COUNT = 80;
const SHOOTING_STAR_COUNT = 3;

function StarryNightScreenSaver() {
  const stars = useMemo(() =>
    generateParticles(STAR_COUNT, (i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT * 0.85,
      size: 1 + Math.random() * 3.5,
      speed: 2000 + Math.random() * 4000,
      opacity: 0.2 + Math.random() * 0.8,
      delay: Math.random() * 3000,
    })),
    [],
  );

  const shootingStars = useMemo(() =>
    generateParticles(SHOOTING_STAR_COUNT, (i) => ({
      id: i,
      x: SCREEN_WIDTH * 0.1 + Math.random() * SCREEN_WIDTH * 0.5,
      y: SCREEN_HEIGHT * 0.05 + Math.random() * SCREEN_HEIGHT * 0.35,
      size: 2,
      speed: 800 + Math.random() * 400,
      opacity: 0.9,
      delay: 5000 + i * 12000 + Math.random() * 8000,
    })),
    [],
  );

  return (
    <View style={nightStyles.container}>
      <View style={nightStyles.bgLayer} />

      {/* Nebula isiklari */}
      <View style={nightStyles.nebula1} />
      <View style={nightStyles.nebula2} />

      {/* Sabit yildizlar (yanip sonen) */}
      {stars.map((s) => (
        <TwinklingStar key={`star-${s.id}`} particle={s} />
      ))}

      {/* Kayan yildizlar */}
      {shootingStars.map((s) => (
        <ShootingStar key={`shoot-${s.id}`} particle={s} />
      ))}

      <ClockOverlay color="rgba(200, 210, 240, 0.85)" shadowColor="rgba(0,0,30,0.8)" />
    </View>
  );
}

function TwinklingStar({ particle }: { particle: Particle }) {
  const opacity = useRef(new Animated.Value(particle.opacity * 0.3)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: particle.opacity,
            duration: particle.speed,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: particle.speed,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: particle.opacity * 0.2,
            duration: particle.speed * 0.8,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.6,
            duration: particle.speed * 0.8,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    twinkle.start();
    return () => twinkle.stop();
  }, [opacity, scale, particle]);

  // Bazi yildizlar sari, bazi beyaz, bazi hafif mavi
  const starColors = ['#FFFFFF', '#FFFDE7', '#E3F2FD', '#FFF8E1', '#BBDEFB'];
  const color = starColors[particle.id % starColors.length];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: particle.size * 3,
        elevation: 2,
      }}
    />
  );
}

function ShootingStar({ particle }: { particle: Particle }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shoot = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        // Anlik belirme
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        // Saga asagi ciz
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH * 0.4,
            duration: particle.speed,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT * 0.3,
            duration: particle.speed,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(particle.speed * 0.4),
            Animated.timing(opacity, {
              toValue: 0,
              duration: particle.speed * 0.6,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Bekle ve sifirla
        Animated.delay(10000 + particle.id * 5000),
        Animated.parallel([
          Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    shoot.start();
    return () => shoot.stop();
  }, [translateX, translateY, opacity, particle]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        top: particle.y,
        width: 40,
        height: 2,
        borderRadius: 1,
        backgroundColor: '#FFFFFF',
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate: '35deg' },
        ],
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 4,
      }}
    />
  );
}

const nightStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050A18',
  },
  nebula1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    right: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
    borderRadius: SCREEN_WIDTH * 0.175,
    backgroundColor: 'rgba(88, 28, 135, 0.08)',
  },
  nebula2: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_WIDTH * 0.25,
    borderRadius: SCREEN_WIDTH * 0.125,
    backgroundColor: 'rgba(30, 64, 175, 0.06)',
  },
});

// ═══════════════════════════════════════════════════════
//  4. AURORA / KUZEY ISIKLARI TEMASI
// ═══════════════════════════════════════════════════════

function AuroraScreenSaver() {
  const layer1Opacity = useRef(new Animated.Value(0.3)).current;
  const layer2Opacity = useRef(new Animated.Value(0.5)).current;
  const layer3Opacity = useRef(new Animated.Value(0.2)).current;
  const layer4Opacity = useRef(new Animated.Value(0.15)).current;
  const layer1X = useRef(new Animated.Value(0)).current;
  const layer1Y = useRef(new Animated.Value(0)).current;
  const layer2X = useRef(new Animated.Value(0)).current;
  const layer2Y = useRef(new Animated.Value(0)).current;
  const layer3X = useRef(new Animated.Value(0)).current;
  const layer3Y = useRef(new Animated.Value(0)).current;
  const layer4X = useRef(new Animated.Value(0)).current;
  const layer4Y = useRef(new Animated.Value(0)).current;
  const layer1Scale = useRef(new Animated.Value(1)).current;
  const layer2Scale = useRef(new Animated.Value(1.2)).current;
  const layer3Scale = useRef(new Animated.Value(0.8)).current;
  const layer4Scale = useRef(new Animated.Value(1.1)).current;

  useEffect(() => {
    function createLayerAnim(
      opacityVal: Animated.Value, xVal: Animated.Value, yVal: Animated.Value, scaleVal: Animated.Value,
      opRange: [number, number], xRange: [number, number], yRange: [number, number], sRange: [number, number],
      baseDuration: number,
    ) {
      return [
        Animated.loop(Animated.sequence([
          Animated.timing(opacityVal, { toValue: opRange[1], duration: baseDuration, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(opacityVal, { toValue: opRange[0], duration: baseDuration * 0.9, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(xVal, { toValue: xRange[1], duration: baseDuration * 2.2, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(xVal, { toValue: xRange[0], duration: baseDuration * 2.5, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(yVal, { toValue: yRange[1], duration: baseDuration * 1.8, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(yVal, { toValue: yRange[0], duration: baseDuration * 2, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(scaleVal, { toValue: sRange[1], duration: baseDuration * 1.5, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(scaleVal, { toValue: sRange[0], duration: baseDuration * 1.5, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ])),
      ];
    }

    const allAnims = [
      ...createLayerAnim(layer1Opacity, layer1X, layer1Y, layer1Scale, [0.2, 0.6], [-150, 200], [-100, 120], [0.9, 1.4], 8000),
      ...createLayerAnim(layer2Opacity, layer2X, layer2Y, layer2Scale, [0.3, 0.7], [160, -180], [150, -80], [0.8, 1.5], 10000),
      ...createLayerAnim(layer3Opacity, layer3X, layer3Y, layer3Scale, [0.15, 0.5], [-200, 140], [-130, 100], [0.7, 1.3], 12000),
      ...createLayerAnim(layer4Opacity, layer4X, layer4Y, layer4Scale, [0.1, 0.4], [100, -120], [80, -100], [0.85, 1.25], 9000),
    ];

    allAnims.forEach(a => a.start());
    return () => allAnims.forEach(a => a.stop());
  }, [
    layer1Opacity, layer1X, layer1Y, layer1Scale,
    layer2Opacity, layer2X, layer2Y, layer2Scale,
    layer3Opacity, layer3X, layer3Y, layer3Scale,
    layer4Opacity, layer4X, layer4Y, layer4Scale,
  ]);

  const blobSize = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.65;

  const layers = [
    { opacity: layer1Opacity, x: layer1X, y: layer1Y, scale: layer1Scale, color: '#3B82F6', sizeMul: 1 },
    { opacity: layer2Opacity, x: layer2X, y: layer2Y, scale: layer2Scale, color: '#8B5CF6', sizeMul: 0.85 },
    { opacity: layer3Opacity, x: layer3X, y: layer3Y, scale: layer3Scale, color: '#06B6D4', sizeMul: 0.75 },
    { opacity: layer4Opacity, x: layer4X, y: layer4Y, scale: layer4Scale, color: '#10B981', sizeMul: 0.6 },
  ];

  return (
    <View style={auroraStyles.container}>
      <View style={auroraStyles.bgLayer} />

      {layers.map((l, i) => {
        const s = blobSize * l.sizeMul;
        return (
          <Animated.View
            key={`aurora-${i}`}
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderRadius: s / 2,
              backgroundColor: l.color,
              opacity: l.opacity,
              transform: [{ translateX: l.x }, { translateY: l.y }, { scale: l.scale }],
            }}
          />
        );
      })}

      <ClockOverlay />
    </View>
  );
}

const auroraStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050510',
  },
});

// ═══════════════════════════════════════════════════════
//  5. SAAT TEMASI (minimalist)
// ═══════════════════════════════════════════════════════

function ClockScreenSaver() {
  const time = useCurrentTime();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const colonOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const moveX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 80, duration: 45000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -80, duration: 45000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const moveY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: 40, duration: 35000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -40, duration: 35000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    moveX.start();
    moveY.start();
    return () => { moveX.stop(); moveY.stop(); };
  }, [translateX, translateY]);

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(colonOpacity, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(colonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [colonOpacity]);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <Animated.View
      style={[clockStyles.container, { transform: [{ translateX }, { translateY }] }]}
    >
      <View style={clockStyles.timeRow}>
        <Text style={clockStyles.digit}>{hours}</Text>
        <Animated.Text style={[clockStyles.colon, { opacity: colonOpacity }]}>:</Animated.Text>
        <Text style={clockStyles.digit}>{minutes}</Text>
        <Text style={clockStyles.seconds}>{seconds}</Text>
      </View>
      <Text style={clockStyles.date}>{formatDate(time)}</Text>
      <View style={clockStyles.divider} />
      <Text style={clockStyles.appName}>TurkIPTV Player</Text>
    </Animated.View>
  );
}

const clockStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  digit: {
    fontSize: 120,
    fontWeight: '100',
    color: colors.text.primary,
    letterSpacing: 2,
    textShadowColor: 'rgba(240, 246, 252, 0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  colon: {
    fontSize: 100,
    fontWeight: '100',
    color: colors.accent.blue,
    marginHorizontal: spacing.xs,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  seconds: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text.muted,
    marginLeft: spacing.sm,
    marginBottom: 18,
  },
  date: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text.secondary,
    marginTop: spacing.lg,
    letterSpacing: 1.5,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: colors.text.muted,
    marginVertical: spacing.lg,
    opacity: 0.3,
  },
  appName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

// ═══════════════════════════════════════════════════════
//  ANA BILESEN
// ═══════════════════════════════════════════════════════

export const ScreenSaver: React.FC<ScreenSaverProps> = ({
  visible,
  style: ssStyle,
  onDismiss,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 1500 : 400,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible && ssStyle === 'off') return null;

  const renderContent = () => {
    switch (ssStyle) {
      case 'fireplace':
        return <FireplaceScreenSaver />;
      case 'snowfall':
        return <SnowfallScreenSaver />;
      case 'starryNight':
        return <StarryNightScreenSaver />;
      case 'aurora':
        return <AuroraScreenSaver />;
      case 'clock':
        return <ClockScreenSaver />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        mainStyles.overlay,
        { opacity: fadeAnim },
        !visible && mainStyles.hidden,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {renderContent()}

      {visible && (
        <View style={mainStyles.dismissHint}>
          <Text style={mainStyles.dismissText}>Herhangi bir tusa basin</Text>
        </View>
      )}
    </Animated.View>
  );
};

const mainStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  hidden: {
    pointerEvents: 'none',
  },
  dismissHint: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    opacity: 0.3,
  },
  dismissText: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 1,
  },
});

const sharedStyles = StyleSheet.create({
  clockContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.12,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  clockTime: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 15,
  },
  clockDate: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: spacing.xs,
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
