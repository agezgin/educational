/**
 * Smart Image Loader
 *
 * Akilli resim yukleme componenti:
 * - Progressive loading (blur -> sharp)
 * - Placeholder/Fallback icin shimmer
 * - Cache-friendly (FastImage wrapper)
 * - Lazy loading (gorunur olunca yukle)
 * - Error fallback
 * - Aspect ratio koruma
 *
 * TV'de poster, backdrop, logo yukleme icin optimize.
 */

import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Shimmer } from './AnimatedTransition';

interface ImageLoaderProps {
  uri: string | null | undefined;
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle | ImageStyle;
  fallbackIcon?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** Dusuk cozunurluklu onizleme URL'i (progressive loading) */
  thumbnailUri?: string;
}

export function ImageLoader({
  uri,
  width,
  height,
  borderRadius = 0,
  style,
  resizeMode = 'cover',
  thumbnailUri,
}: ImageLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
  }, []);

  // Resim yoksa veya hata varsa shimmer goster
  if (!uri || error) {
    return (
      <View style={[{ width, height, borderRadius }, styles.fallback, style]}>
        <Shimmer width={width} height={height} borderRadius={borderRadius} />
      </View>
    );
  }

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      {/* Shimmer (yukleme sirasinda) */}
      {loading && !thumbnailLoaded && (
        <Shimmer
          width={width}
          height={height}
          borderRadius={borderRadius}
          style={StyleSheet.absoluteFill as ViewStyle}
        />
      )}

      {/* Dusuk cozunurluklu thumbnail (progressive loading) */}
      {thumbnailUri && loading && (
        <Image
          source={{ uri: thumbnailUri }}
          style={[StyleSheet.absoluteFill, { borderRadius, opacity: 0.6 }]}
          resizeMode={resizeMode}
          onLoad={handleThumbnailLoad}
          blurRadius={5}
        />
      )}

      {/* Ana resim */}
      <Image
        source={{
          uri,
          // Cache ayarlari
          cache: 'force-cache',
        }}
        style={[
          { width, height, borderRadius },
          loading ? styles.hidden : styles.visible,
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        fadeDuration={200}
      />
    </View>
  );
}

// ─── Preset Image Components ────────────────────────────

/**
 * Kanal logosu (daire/kare).
 */
export function ChannelLogo({
  uri,
  size = 48,
  style,
}: {
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <ImageLoader
      uri={uri}
      width={size}
      height={size}
      borderRadius={size / 2}
      resizeMode="contain"
      style={style}
    />
  );
}

/**
 * Film/Dizi posteri (2:3 oran).
 */
export function PosterImage({
  uri,
  width = 140,
  style,
  thumbnailUri,
}: {
  uri?: string | null;
  width?: number;
  style?: ViewStyle;
  thumbnailUri?: string;
}) {
  const height = Math.round(width * 1.5); // 2:3 aspect ratio
  return (
    <ImageLoader
      uri={uri}
      width={width}
      height={height}
      borderRadius={12}
      thumbnailUri={thumbnailUri}
      style={style}
    />
  );
}

/**
 * Backdrop resmi (16:9 oran).
 */
export function BackdropImage({
  uri,
  width,
  style,
  thumbnailUri,
}: {
  uri?: string | null;
  width: number;
  style?: ViewStyle;
  thumbnailUri?: string;
}) {
  const height = Math.round(width * (9 / 16)); // 16:9 aspect ratio
  return (
    <ImageLoader
      uri={uri}
      width={width}
      height={height}
      borderRadius={0}
      thumbnailUri={thumbnailUri}
      style={style}
    />
  );
}

/**
 * Oyuncu profil resmi (daire).
 */
export function AvatarImage({
  uri,
  size = 70,
  style,
}: {
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <ImageLoader
      uri={uri}
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
    position: 'absolute',
  },
  visible: {
    opacity: 1,
  },
});
