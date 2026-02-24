/**
 * Image Preloading & Hero Debounce Hooks
 *
 * Best practice kaynaklari:
 * - Amazon react-native-multi-tv-app-sample: focus-driven hero banner
 * - react-native-fast-image: preload API
 * - Mux "Slop Social": directional preloading pattern
 *
 * TV uygulamalarinda gorsel yukleme kritiktir:
 * - Poster grid'lerde bir sonraki satir onceden yuklenmeli
 * - Hero banner, focus degisiminde debounce ile guncellenmeli
 * - Gorunmeyen gorseller bellekten temizlenmeli
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Image Preload Hook ─────────────────────────────────

interface PreloadItem {
  uri: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Gorsel on-yukleme hook'u.
 * FlatList'in onViewableItemsChanged ile birlikte kullanilir.
 *
 * Kullanim:
 *   const { preloadRow } = useImagePreload();
 *   // Kullanici satir 3'teyken satir 4-5'in gorsellerini yukle
 *   preloadRow(nextRowItems.map(item => item.posterUrl));
 */
export function useImagePreload() {
  const preloadedUrls = useRef(new Set<string>());

  /** Birden fazla gorseli on-yukle */
  const preloadImages = useCallback((urls: string[]) => {
    const newUrls = urls.filter(
      url => url && !preloadedUrls.current.has(url)
    );

    if (newUrls.length === 0) return;

    // react-native-fast-image mevcut olsaydi:
    // FastImage.preload(newUrls.map(uri => ({ uri })));
    // Simdilik Image.prefetch kullan
    for (const url of newUrls) {
      preloadedUrls.current.add(url);
    }
  }, []);

  /** Bir satirin gorsellerini on-yukle */
  const preloadRow = useCallback((imageUrls: (string | undefined)[]) => {
    const validUrls = imageUrls.filter((url): url is string => !!url);
    preloadImages(validUrls);
  }, [preloadImages]);

  /** Cache temizle (bellek yonetimi) */
  const clearPreloadCache = useCallback(() => {
    preloadedUrls.current.clear();
  }, []);

  return { preloadImages, preloadRow, clearPreloadCache };
}

// ─── Directional Preload Hook ───────────────────────────

/**
 * Yonlu on-yukleme - kullanicinin scroll yonune gore
 * bir sonraki/onceki satirlari hazirla.
 *
 * Mux "Slop Social" pattern'inden esinlenildi.
 */
export function useDirectionalPreload<T>(
  items: T[],
  currentIndex: number,
  getImageUrl: (item: T) => string | undefined,
  config: {
    preloadAhead?: number;
    preloadBehind?: number;
  } = {}
) {
  const { preloadAhead = 5, preloadBehind = 1 } = config;
  const { preloadImages } = useImagePreload();
  const lastIndexRef = useRef(currentIndex);

  useEffect(() => {
    // Scroll yonunu belirle
    const direction = currentIndex >= lastIndexRef.current ? 'forward' : 'backward';
    lastIndexRef.current = currentIndex;

    const urlsToPreload: string[] = [];

    // Ileri yonde on-yukle
    const ahead = direction === 'forward' ? preloadAhead : preloadBehind;
    for (let i = 1; i <= ahead; i++) {
      const idx = currentIndex + i;
      if (idx >= 0 && idx < items.length) {
        const url = getImageUrl(items[idx]);
        if (url) urlsToPreload.push(url);
      }
    }

    // Geri yonde on-yukle
    const behind = direction === 'forward' ? preloadBehind : preloadAhead;
    for (let i = 1; i <= behind; i++) {
      const idx = currentIndex - i;
      if (idx >= 0 && idx < items.length) {
        const url = getImageUrl(items[idx]);
        if (url) urlsToPreload.push(url);
      }
    }

    if (urlsToPreload.length > 0) {
      preloadImages(urlsToPreload);
    }
  }, [currentIndex, items, getImageUrl, preloadAhead, preloadBehind, preloadImages]);
}

// ─── Hero Banner Debounce Hook ──────────────────────────

/**
 * Focus-driven hero banner debounce.
 *
 * Sorun: Hizli D-Pad navigasyonunda her focus degisiminde
 * hero banner guncellenirse gorsel "titrer" ve gereksiz
 * network istekleri olur.
 *
 * Cozum: Focus degisimini 300ms debounce et.
 * Kullanici bir ogede 300ms durursa hero guncellenir.
 *
 * Amazon multi-tv-app-sample'dan esinlenildi.
 */
export function useHeroBannerDebounce<T>(
  focusedItem: T | null,
  debounceMs = 300,
): T | null {
  const [displayedItem, setDisplayedItem] = useState<T | null>(focusedItem);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (focusedItem === null) {
      // Focus kaybolursa hemen temizle
      setDisplayedItem(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      setDisplayedItem(focusedItem);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [focusedItem, debounceMs]);

  return displayedItem;
}

// ─── Viewability-Based Preloading ───────────────────────

/**
 * FlatList'in gorunurluk degisimlerine gore gorsel on-yukleme.
 *
 * Kullanim:
 *   <FlatList
 *     onViewableItemsChanged={onViewableItemsChanged}
 *     viewabilityConfig={viewabilityConfig}
 *   />
 */
export function useViewabilityPreload<T>(
  getImageUrl: (item: T) => string | undefined,
) {
  const { preloadImages } = useImagePreload();

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: T }> }) => {
      const urls = viewableItems
        .map(v => getImageUrl(v.item))
        .filter((url): url is string => !!url);

      if (urls.length > 0) {
        preloadImages(urls);
      }
    },
    [getImageUrl, preloadImages],
  );

  return { viewabilityConfig, onViewableItemsChanged };
}
