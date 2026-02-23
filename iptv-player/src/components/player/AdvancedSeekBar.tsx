/**
 * Advanced Seek Bar (Gelismis Ileri/Geri Sarma)
 *
 * Sorun: Basit +10s/-10s yetmiyor, 2 saatlik filmde cok yavas
 * Cozum:
 * - Sol/Sag ok: Kisa basma 10s, uzun basma hizlanarak sar
 * - Progress bar uzerinde preview (thumbnail simule)
 * - Seek hizinda kademe: 10s -> 30s -> 1dk -> 5dk
 * - Parmak/ok basili tutma suresi arttikca hiz artar
 * - Seek sirasinda saat goster (nereden nereye)
 * - Double-tap: 30s atlama
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { colors } from '@/theme/colors';

// ─── Types ──────────────────────────────────────────────

interface AdvancedSeekBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  visible: boolean;
  /** Seek islemi */
  onSeek: (time: number) => void;
  /** Seek baslarken (video pause olabilir) */
  onSeekStart?: () => void;
  /** Seek bitince */
  onSeekEnd?: () => void;
  /** Chapter/bolum isaretleri */
  chapters?: Array<{ time: number; title: string }>;
}

interface SeekState {
  /** Seek islemi devam ediyor mu */
  isSeeking: boolean;
  /** Seek hedef zamani */
  seekTime: number;
  /** Seek yonu ve hizi */
  seekSpeed: number;
  /** Basili tutma suresi (ms) */
  holdDuration: number;
}

// ─── Component ──────────────────────────────────────────

export const AdvancedSeekBar: React.FC<AdvancedSeekBarProps> = memo(({
  currentTime,
  duration,
  buffered,
  visible,
  onSeek,
  onSeekStart,
  onSeekEnd,
  chapters,
}) => {
  const [seekState, setSeekState] = useState<SeekState>({
    isSeeking: false,
    seekTime: currentTime,
    seekSpeed: 0,
    holdDuration: 0,
  });

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressWidth = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const barWidth = screenWidth - 200; // Sag/sol margin

  // Progress animasyonu
  useEffect(() => {
    if (!seekState.isSeeking && duration > 0) {
      Animated.timing(progressWidth, {
        toValue: (currentTime / duration) * barWidth,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, duration, seekState.isSeeking, barWidth, progressWidth]);

  // Seek hizi hesapla (basili tutma suresine gore)
  const getSeekStep = useCallback((holdMs: number): number => {
    if (holdMs < 500) return 10;     // 0-0.5s: 10 saniye
    if (holdMs < 1500) return 30;    // 0.5-1.5s: 30 saniye
    if (holdMs < 3000) return 60;    // 1.5-3s: 1 dakika
    if (holdMs < 5000) return 300;   // 3-5s: 5 dakika
    return 600;                       // 5s+: 10 dakika
  }, []);

  // Seek baslat (ok tusu basildi)
  const startSeek = useCallback((direction: 'forward' | 'backward') => {
    onSeekStart?.();
    const step = direction === 'forward' ? 10 : -10;
    const newTime = Math.max(0, Math.min(duration, currentTime + step));

    setSeekState({
      isSeeking: true,
      seekTime: newTime,
      seekSpeed: step,
      holdDuration: 0,
    });

    // Basili tutma - hizlanarak sar
    let holdMs = 0;
    holdTimerRef.current = setInterval(() => {
      holdMs += 200;
      const seekStep = getSeekStep(holdMs) * (direction === 'forward' ? 1 : -1);

      setSeekState((prev) => {
        const next = Math.max(0, Math.min(duration, prev.seekTime + seekStep));
        return {
          ...prev,
          seekTime: next,
          seekSpeed: seekStep,
          holdDuration: holdMs,
        };
      });
    }, 200);
  }, [currentTime, duration, getSeekStep, onSeekStart]);

  // Seek bitir (ok tusu birakildi)
  const endSeek = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (seekState.isSeeking) {
      onSeek(seekState.seekTime);
      onSeekEnd?.();
    }

    setSeekState((prev) => ({
      ...prev,
      isSeeking: false,
      seekSpeed: 0,
      holdDuration: 0,
    }));
  }, [seekState.isSeeking, seekState.seekTime, onSeek, onSeekEnd]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  const displayTime = seekState.isSeeking ? seekState.seekTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  // Seek speed gostergesi
  const getSpeedLabel = () => {
    const absSpeed = Math.abs(seekState.seekSpeed);
    if (absSpeed >= 600) return '10dk';
    if (absSpeed >= 300) return '5dk';
    if (absSpeed >= 60) return '1dk';
    if (absSpeed >= 30) return '30s';
    return '10s';
  };

  return (
    <View style={styles.container}>
      {/* Seek bilgisi */}
      {seekState.isSeeking && (
        <View style={styles.seekInfo}>
          <Text style={styles.seekFrom}>{formatTime(currentTime)}</Text>
          <Text style={styles.seekArrow}>
            {seekState.seekSpeed > 0 ? ' → ' : ' ← '}
          </Text>
          <Text style={styles.seekTo}>{formatTime(seekState.seekTime)}</Text>

          {/* Fark gostergesi */}
          <View style={styles.seekDiff}>
            <Text style={styles.seekDiffText}>
              {seekState.seekSpeed > 0 ? '+' : ''}
              {formatTime(Math.abs(seekState.seekTime - currentTime))}
            </Text>
          </View>

          {/* Hiz gostergesi */}
          <View style={styles.seekSpeedBadge}>
            <Text style={styles.seekSpeedText}>{getSpeedLabel()}/basim</Text>
          </View>
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.barContainer}>
        {/* Zaman */}
        <Text style={styles.timeText}>{formatTime(displayTime)}</Text>

        {/* Bar */}
        <View style={styles.barTrack}>
          {/* Buffer */}
          <View style={[styles.barBuffer, { width: `${bufferProgress}%` }]} />

          {/* Progress */}
          <View style={[styles.barFill, { width: `${progress}%` }]} />

          {/* Chapter isaretleri */}
          {chapters?.map((chapter) => {
            const pos = (chapter.time / duration) * 100;
            return (
              <View
                key={chapter.time}
                style={[styles.chapterMark, { left: `${pos}%` }]}
              />
            );
          })}

          {/* Seek head (daire) */}
          <View style={[
            styles.seekHead,
            { left: `${progress}%` },
            seekState.isSeeking && styles.seekHeadActive,
          ]} />
        </View>

        {/* Kalan sure */}
        <Text style={styles.timeText}>-{formatTime(duration - displayTime)}</Text>
      </View>

      {/* Chapter bilgisi (varsa) */}
      {chapters && (
        <ChapterIndicator
          chapters={chapters}
          currentTime={displayTime}
        />
      )}
    </View>
  );
});

AdvancedSeekBar.displayName = 'AdvancedSeekBar';

// ─── Chapter Indicator ──────────────────────────────────

function ChapterIndicator({
  chapters,
  currentTime,
}: {
  chapters: Array<{ time: number; title: string }>;
  currentTime: number;
}) {
  const currentChapter = chapters
    .filter((ch) => ch.time <= currentTime)
    .pop();

  if (!currentChapter) return null;

  return (
    <View style={styles.chapterInfo}>
      <Text style={styles.chapterTitle}>{currentChapter.title}</Text>
    </View>
  );
}

// ─── Seek Shortcut Functions ────────────────────────────

/**
 * Klavye/kumanda kisayollari icin seek fonksiyonlari.
 */
export const seekShortcuts = {
  /** Sol ok - 10s geri */
  seekBackward10: (current: number) => Math.max(0, current - 10),
  /** Sag ok - 10s ileri */
  seekForward10: (current: number, duration: number) => Math.min(duration, current + 10),
  /** Cift sol - 30s geri */
  seekBackward30: (current: number) => Math.max(0, current - 30),
  /** Cift sag - 30s ileri */
  seekForward30: (current: number, duration: number) => Math.min(duration, current + 30),
  /** Sayfa yukari - 5dk geri */
  seekBackward5min: (current: number) => Math.max(0, current - 300),
  /** Sayfa asagi - 5dk ileri */
  seekForward5min: (current: number, duration: number) => Math.min(duration, current + 300),
  /** Yuzdeli atlama (1-9 tuslari icin) */
  seekToPercent: (percent: number, duration: number) => (percent / 100) * duration,
};

// ─── Helpers ────────────────────────────────────────────

function formatTime(seconds: number): string {
  const abs = Math.abs(Math.floor(seconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  // Seek bilgisi
  seekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  seekFrom: {
    color: colors.text.muted,
    fontSize: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  seekArrow: {
    color: colors.accent.blue,
    fontSize: 18,
    fontWeight: '700',
  },
  seekTo: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  seekDiff: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  seekDiffText: {
    color: colors.accent.blue,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  seekSpeedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  seekSpeedText: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Bar
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 55,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#30363D',
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  barBuffer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
  },
  barFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colors.accent.blue,
    borderRadius: 3,
  },
  chapterMark: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  seekHead: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent.blue,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  seekHeadActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    top: -7,
    backgroundColor: '#FFFFFF',
    borderColor: colors.accent.blue,
  },

  // Chapter
  chapterInfo: {
    alignItems: 'center',
    marginTop: 6,
  },
  chapterTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
