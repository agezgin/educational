/**
 * Network Diagnostics Panel
 *
 * Ag teshis paneli (Ayarlar icerisinden erisilebilir):
 * - Baglanti durumu gostergesi
 * - Hiz testi sonuclari
 * - Stream erisilebilirlik testi
 * - Onerilen kalite
 * - Gecmis test sonuclari
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/theme/colors';
import { NetworkDiagnostics, QUALITY_BANDWIDTH } from '@/hooks/useNetworkDiagnostics';

// ─── Types ──────────────────────────────────────────────

interface NetworkDiagnosticsPanelProps {
  diagnostics: NetworkDiagnostics | null;
  isRunning: boolean;
  error: string | null;
  onRunTest: () => void;
}

// ─── Component ──────────────────────────────────────────

export function NetworkDiagnosticsPanel({
  diagnostics,
  isRunning,
  error,
  onRunTest,
}: NetworkDiagnosticsPanelProps) {
  return (
    <View style={styles.container}>
      {/* Baslik */}
      <View style={styles.header}>
        <Text style={styles.title}>Ağ Tanılama</Text>
        <Text style={styles.subtitle}>Bağlantı durumunuzu test edin</Text>
      </View>

      {/* Test butonu */}
      <TouchableOpacity
        style={[styles.testButton, isRunning && styles.testButtonDisabled]}
        onPress={onRunTest}
        disabled={isRunning}
      >
        {isRunning ? (
          <View style={styles.testButtonContent}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.testButtonText}>Test Yapılıyor...</Text>
          </View>
        ) : (
          <Text style={styles.testButtonText}>Hız Testi Başlat</Text>
        )}
      </TouchableOpacity>

      {/* Hata */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Sonuclar */}
      {diagnostics && (
        <View style={styles.results}>
          {/* Genel durum */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(diagnostics.status) },
            ]} />
            <Text style={styles.statusText}>{getStatusLabel(diagnostics.status)}</Text>
          </View>

          {/* Metrikler */}
          <View style={styles.metricsGrid}>
            <MetricCard
              label="İndirme Hızı"
              value={`${diagnostics.downloadSpeed.toFixed(1)} Mbps`}
              status={getSpeedStatus(diagnostics.downloadSpeed)}
            />
            <MetricCard
              label="Gecikme"
              value={`${diagnostics.latency} ms`}
              status={getLatencyStatus(diagnostics.latency)}
            />
            <MetricCard
              label="Stream Durumu"
              value={diagnostics.streamReachable ? 'Erişilebilir' : 'Erişilemiyor'}
              status={diagnostics.streamReachable ? 'good' : 'bad'}
            />
            <MetricCard
              label="Yanıt Süresi"
              value={`${diagnostics.streamResponseTime} ms`}
              status={diagnostics.streamResponseTime < 500 ? 'good' : 'medium'}
            />
          </View>

          {/* Onerilen kalite */}
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationLabel}>Önerilen Kalite</Text>
            <Text style={styles.recommendationValue}>{diagnostics.recommendedQuality}</Text>
            <Text style={styles.recommendationDesc}>
              {QUALITY_BANDWIDTH[diagnostics.recommendedQuality]?.label}
              {' - Min: '}
              {QUALITY_BANDWIDTH[diagnostics.recommendedQuality]?.min} Mbps
            </Text>
          </View>

          {/* Test zamani */}
          <Text style={styles.timestamp}>
            Son test: {new Date(diagnostics.timestamp).toLocaleTimeString('tr-TR')}
          </Text>
        </View>
      )}

      {/* Bos durum */}
      {!diagnostics && !isRunning && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📶</Text>
          <Text style={styles.emptyText}>
            Bağlantı durumunuzu test etmek için yukarıdaki butona basın
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Metric Card ────────────────────────────────────────

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'good' | 'medium' | 'bad';
}) {
  const statusColors = {
    good: colors.status.success,
    medium: colors.status.warning,
    bad: colors.status.danger,
  };

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: statusColors[status] }]}>{value}</Text>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': return colors.status.success;
    case 'slow': return colors.status.warning;
    case 'unstable': return '#F97316';
    case 'disconnected': return colors.status.danger;
    default: return colors.text.muted;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'connected': return 'Bağlantı Mükemmel';
    case 'slow': return 'Bağlantı Yavaş';
    case 'unstable': return 'Bağlantı Kararsız';
    case 'disconnected': return 'Bağlantı Yok';
    default: return 'Bilinmiyor';
  }
}

function getSpeedStatus(speed: number): 'good' | 'medium' | 'bad' {
  if (speed >= 10) return 'good';
  if (speed >= 3) return 'medium';
  return 'bad';
}

function getLatencyStatus(latency: number): 'good' | 'medium' | 'bad' {
  if (latency < 100) return 'good';
  if (latency < 300) return 'medium';
  return 'bad';
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },

  // Test Button
  testButton: {
    backgroundColor: colors.accent.blue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: colors.status.danger,
    fontSize: 14,
  },

  // Results
  results: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '600',
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.background.card,
    borderRadius: 14,
    padding: 16,
    minWidth: '47%',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  metricLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Recommendation
  recommendationBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  recommendationLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  recommendationValue: {
    color: colors.accent.blue,
    fontSize: 28,
    fontWeight: '800',
  },
  recommendationDesc: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },

  // Timestamp
  timestamp: {
    color: colors.text.muted,
    fontSize: 11,
    textAlign: 'right',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
});
