/**
 * Sleep Timer Overlay
 *
 * Uyku zamanlayicisi OSD bileşeni:
 * - Geri sayim gostergesi
 * - Preset sure secimi
 * - Uzatma dialog'u
 * - Iptal butonu
 * - Minimal ve sik tasarim
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { colors } from '@/theme/colors';
import { SLEEP_TIMER_PRESETS } from '@/hooks/useSleepTimer';

// ─── Types ──────────────────────────────────────────────

interface SleepTimerOverlayProps {
  visible: boolean;
  isActive: boolean;
  remainingTime: string;
  showExtendPrompt: boolean;
  onSelectPreset: (minutes: number) => void;
  onExtend: (minutes: number) => void;
  onStop: () => void;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────

export function SleepTimerOverlay({
  visible,
  isActive,
  remainingTime,
  showExtendPrompt,
  onSelectPreset,
  onExtend,
  onStop,
  onClose,
}: SleepTimerOverlayProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Baslik */}
          <Text style={styles.title}>
            {isActive ? 'Uyku Zamanlayıcısı' : 'Uyku Zamanlayıcısı Ayarla'}
          </Text>

          {/* Aktif timer gostergesi */}
          {isActive && (
            <View style={styles.activeTimer}>
              <Text style={styles.timerLabel}>Kalan Süre</Text>
              <Text style={styles.timerValue}>{remainingTime}</Text>

              <View style={styles.activeActions}>
                <TouchableOpacity
                  style={styles.extendButton}
                  onPress={() => onExtend(15)}
                >
                  <Text style={styles.extendText}>+15 dk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.extendButton}
                  onPress={() => onExtend(30)}
                >
                  <Text style={styles.extendText}>+30 dk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.extendButton, styles.stopButton]}
                  onPress={onStop}
                >
                  <Text style={styles.stopText}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Preset sureler */}
          {!isActive && (
            <View style={styles.presets}>
              {SLEEP_TIMER_PRESETS.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.presetButton}
                  onPress={() => onSelectPreset(minutes)}
                >
                  <Text style={styles.presetValue}>
                    {minutes >= 60 ? `${minutes / 60} saat` : `${minutes} dk`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Kapat butonu */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Kapat</Text>
          </TouchableOpacity>
        </View>

        {/* Uzatma prompt'u */}
        {showExtendPrompt && (
          <View style={styles.extendPrompt}>
            <Text style={styles.extendPromptTitle}>
              5 dakika kaldı! Uzatmak ister misiniz?
            </Text>
            <View style={styles.extendPromptActions}>
              <TouchableOpacity
                style={styles.extendPromptButton}
                onPress={() => onExtend(30)}
              >
                <Text style={styles.extendPromptButtonText}>+30 dk Uzat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.extendPromptButton, styles.extendPromptCancel]}
                onPress={onClose}
              >
                <Text style={styles.extendPromptCancelText}>Hayır</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

/**
 * Mini sleep timer gostergesi (Player OSD'de).
 */
export function SleepTimerBadge({
  remainingTime,
  onPress,
}: {
  remainingTime: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.badge} onPress={onPress}>
      <Text style={styles.badgeIcon}>🌙</Text>
      <Text style={styles.badgeTime}>{remainingTime}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  panel: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 28,
    minWidth: 360,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Active Timer
  activeTimer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: 8,
  },
  timerValue: {
    color: colors.accent.blue,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  extendButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  extendText: {
    color: colors.accent.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderColor: 'rgba(248, 81, 73, 0.3)',
  },
  stopText: {
    color: colors.status.danger,
    fontSize: 14,
    fontWeight: '600',
  },

  // Presets
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: colors.background.active,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  presetValue: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Close
  closeButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeText: {
    color: colors.text.muted,
    fontSize: 14,
  },

  // Extend Prompt
  extendPrompt: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.accent.blue,
  },
  extendPromptTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  extendPromptActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  extendPromptButton: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  extendPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  extendPromptCancel: {
    backgroundColor: colors.background.active,
  },
  extendPromptCancelText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Mini Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeTime: {
    color: colors.accent.blue,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
