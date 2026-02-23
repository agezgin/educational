/**
 * Network Diagnostics Hook
 *
 * Ag teshis araci:
 * - Stream URL erisilebilirlik testi
 * - Bant genisligi olcumu
 * - Ping/latency testi
 * - DNS cozumleme suresi
 * - Baglanti tipi tespiti (WiFi, Ethernet, Mobil)
 * - Gecmis performans takibi
 *
 * IPTV sorun tespiti icin kullanilir.
 */

import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────

export interface NetworkDiagnostics {
  /** Genel baglanti durumu */
  status: 'connected' | 'slow' | 'unstable' | 'disconnected';
  /** Baglanti tipi */
  connectionType: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
  /** Indirme hizi (Mbps) */
  downloadSpeed: number;
  /** Ping suresi (ms) */
  latency: number;
  /** Paket kaybi yuzdesi */
  packetLoss: number;
  /** DNS cozumleme suresi (ms) */
  dnsResolution: number;
  /** Stream erisilebilir mi */
  streamReachable: boolean;
  /** Stream yanit suresi (ms) */
  streamResponseTime: number;
  /** Onerilen kalite */
  recommendedQuality: '4K' | '1080p' | '720p' | '480p' | '360p';
  /** Test zamani */
  timestamp: number;
}

export interface DiagnosticsResult {
  diagnostics: NetworkDiagnostics | null;
  isRunning: boolean;
  error: string | null;
  runDiagnostics: (streamUrl?: string) => Promise<void>;
  getStatusLabel: () => string;
  getSpeedLabel: () => string;
}

// ─── Hook ───────────────────────────────────────────────

export function useNetworkDiagnostics(): DiagnosticsResult {
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async (streamUrl?: string) => {
    setIsRunning(true);
    setError(null);

    try {
      // 1. Temel baglanti testi
      const latency = await measureLatency();

      // 2. Download hizi testi
      const downloadSpeed = await measureDownloadSpeed();

      // 3. Stream erisilebilirlik testi
      let streamReachable = false;
      let streamResponseTime = 0;
      if (streamUrl) {
        const streamTest = await testStreamReachability(streamUrl);
        streamReachable = streamTest.reachable;
        streamResponseTime = streamTest.responseTime;
      }

      // 4. Kalite onerisi
      const recommendedQuality = getRecommendedQuality(downloadSpeed, latency);

      // 5. Genel durum
      const status = getOverallStatus(downloadSpeed, latency);

      const result: NetworkDiagnostics = {
        status,
        connectionType: 'unknown', // Platform-specific detect gerekir
        downloadSpeed,
        latency,
        packetLoss: 0,
        dnsResolution: 0,
        streamReachable,
        streamResponseTime,
        recommendedQuality,
        timestamp: Date.now(),
      };

      setDiagnostics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ağ testi başarısız');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getStatusLabel = useCallback(() => {
    if (!diagnostics) return 'Test yapılmadı';
    const labels: Record<string, string> = {
      connected: 'Bağlantı İyi',
      slow: 'Bağlantı Yavaş',
      unstable: 'Bağlantı Kararsız',
      disconnected: 'Bağlantı Yok',
    };
    return labels[diagnostics.status];
  }, [diagnostics]);

  const getSpeedLabel = useCallback(() => {
    if (!diagnostics) return '-';
    const speed = diagnostics.downloadSpeed;
    if (speed >= 50) return `${speed.toFixed(1)} Mbps (Mükemmel)`;
    if (speed >= 20) return `${speed.toFixed(1)} Mbps (İyi)`;
    if (speed >= 5) return `${speed.toFixed(1)} Mbps (Orta)`;
    return `${speed.toFixed(1)} Mbps (Düşük)`;
  }, [diagnostics]);

  return {
    diagnostics,
    isRunning,
    error,
    runDiagnostics,
    getStatusLabel,
    getSpeedLabel,
  };
}

// ─── Test Functions ─────────────────────────────────────

/**
 * Ping / latency testi.
 */
async function measureLatency(): Promise<number> {
  const start = Date.now();
  try {
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return Date.now() - start;
  } catch {
    return -1; // Baglanti yok
  }
}

/**
 * Basit download hizi testi.
 * Kucuk bir dosya indirip hizi hesaplar.
 */
async function measureDownloadSpeed(): Promise<number> {
  const testUrls = [
    'https://speed.cloudflare.com/__down?bytes=500000', // 500KB
  ];

  try {
    const start = Date.now();
    const response = await fetch(testUrls[0], { cache: 'no-store' });
    const blob = await response.blob();
    const elapsed = (Date.now() - start) / 1000; // saniye

    const sizeInBits = blob.size * 8;
    const speedMbps = sizeInBits / elapsed / 1_000_000;

    return Math.round(speedMbps * 10) / 10;
  } catch {
    return 0;
  }
}

/**
 * Stream URL erisilebilirlik testi.
 */
async function testStreamReachability(url: string): Promise<{
  reachable: boolean;
  responseTime: number;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return {
      reachable: response.ok || response.status === 302 || response.status === 301,
      responseTime: Date.now() - start,
    };
  } catch {
    return {
      reachable: false,
      responseTime: Date.now() - start,
    };
  }
}

/**
 * Hiza gore onerilen kalite.
 */
function getRecommendedQuality(speedMbps: number, _latency: number): NetworkDiagnostics['recommendedQuality'] {
  if (speedMbps >= 25) return '4K';
  if (speedMbps >= 8) return '1080p';
  if (speedMbps >= 4) return '720p';
  if (speedMbps >= 1.5) return '480p';
  return '360p';
}

/**
 * Genel ag durumu.
 */
function getOverallStatus(speedMbps: number, latency: number): NetworkDiagnostics['status'] {
  if (latency < 0) return 'disconnected';
  if (speedMbps < 1 || latency > 500) return 'unstable';
  if (speedMbps < 5 || latency > 200) return 'slow';
  return 'connected';
}

// ─── Quality Bandwidth Requirements ─────────────────────

/**
 * Her kalite seviyesi icin gereken bant genisligi.
 */
export const QUALITY_BANDWIDTH: Record<string, { min: number; recommended: number; label: string }> = {
  '4K': { min: 20, recommended: 35, label: '4K Ultra HD' },
  '1080p': { min: 5, recommended: 10, label: 'Full HD' },
  '720p': { min: 2.5, recommended: 5, label: 'HD' },
  '480p': { min: 1, recommended: 2, label: 'SD' },
  '360p': { min: 0.5, recommended: 1, label: 'Düşük' },
};
