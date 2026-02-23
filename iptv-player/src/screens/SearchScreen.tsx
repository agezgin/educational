/**
 * Universal Search Screen
 *
 * Her seyi arayabilir:
 * - Canli TV kanallari
 * - Filmler (VOD)
 * - Diziler
 * - EPG program arama
 * - Oyuncu/yonetmen arama (TMDB)
 *
 * Ozellikler:
 * - TV kumandasi ile D-Pad metin girisi
 * - Anlik arama sonuclari (debounce 300ms)
 * - Kategori filtresi (Tumu, Canli, Film, Dizi)
 * - Arama gecmisi
 * - Populer aramalar
 * - Voice search desteği (Android TV mic)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useDebounce } from '@/hooks/useDebounce';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

// ─── Types ──────────────────────────────────────────────

type SearchCategory = 'all' | 'live' | 'movie' | 'series';

interface SearchResult {
  id: string;
  type: 'live' | 'movie' | 'series' | 'epg';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  streamUrl?: string;
  /** Arama skoru (relevance) */
  score: number;
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}

// ─── Component ──────────────────────────────────────────

export function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, _setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const { width: screenWidth } = Dimensions.get('window');

  // Arama islemi
  const performSearch = useCallback(async (searchQuery: string, searchCategory: SearchCategory) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // TODO: Gercek arama - channelStore, vodStore, EPG'den sonuc topla
    // Simdilik mock structure
    const allResults: SearchResult[] = [];

    // Sonuclari skorla ve sirala
    const filtered = searchCategory === 'all'
      ? allResults
      : allResults.filter((r) => r.type === searchCategory);

    setResults(filtered.sort((a, b) => b.score - a.score));
    setIsSearching(false);
  }, []);

  // Debounce tetikleme
  React.useEffect(() => {
    performSearch(debouncedQuery, category);
  }, [debouncedQuery, category, performSearch]);

  // Kategori butonlari
  const categories: { key: SearchCategory; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'live', label: 'Canlı TV' },
    { key: 'movie', label: 'Filmler' },
    { key: 'series', label: 'Diziler' },
  ];

  // Populer aramalar
  const popularSearches = [
    'Spor', 'Haber', 'Sinema', 'Cocuk',
    'Belgesel', 'Muzik', 'Show', 'Dizi',
  ];

  // Sonuc tipine gore ikon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'live': return '📺';
      case 'movie': return '🎬';
      case 'series': return '📺';
      case 'epg': return '📋';
      default: return '🔍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'live': return 'Canlı';
      case 'movie': return 'Film';
      case 'series': return 'Dizi';
      case 'epg': return 'Program';
      default: return '';
    }
  };

  // Sonuca tiklama
  const handleResultPress = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'live':
        navigation.navigate('Player', { channelId: result.id });
        break;
      case 'movie':
        navigation.navigate('MovieDetail', { movieId: result.id });
        break;
      case 'series':
        navigation.navigate('SeriesDetail', { seriesId: result.id });
        break;
      case 'epg':
        navigation.navigate('EPG');
        break;
    }
  }, [navigation]);

  // Sonuc renderla
  const renderResult = useCallback(({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      {/* Poster/Logo */}
      <View style={styles.resultImage}>
        <Text style={styles.resultTypeIcon}>{getTypeIcon(item.type)}</Text>
      </View>

      {/* Bilgi */}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        )}
      </View>

      {/* Tip badge */}
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{getTypeLabel(item.type)}</Text>
      </View>
    </TouchableOpacity>
  ), [handleResultPress]);

  // Icerik
  const showResults = query.length >= 2;
  const showPopular = !showResults && searchHistory.length === 0;
  const showHistory = !showResults && searchHistory.length > 0;

  return (
    <View style={styles.container}>
      {/* Arama Bari */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Kanal, film, dizi ara..."
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kategori Filtreleri */}
      <View style={styles.categories}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              category === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryText,
                category === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sonuclar */}
      {showResults && (
        <>
          <Text style={styles.resultCount}>
            {isSearching
              ? 'Aranıyor...'
              : `${results.length} sonuç bulundu`}
          </Text>
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            style={styles.resultList}
            contentContainerStyle={styles.resultListContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </>
      )}

      {/* Populer Aramalar */}
      {showPopular && (
        <View style={styles.popularSection}>
          <Text style={styles.sectionTitle}>Popüler Aramalar</Text>
          <View style={styles.popularChips}>
            {popularSearches.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.popularChip}
                onPress={() => setQuery(term)}
              >
                <Text style={styles.popularChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Arama Gecmisi */}
      {showHistory && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Son Aramalar</Text>
          {searchHistory.slice(0, 10).map((item) => (
            <TouchableOpacity
              key={item.query + item.timestamp}
              style={styles.historyItem}
              onPress={() => setQuery(item.query)}
            >
              <Text style={styles.historyIcon}>🕐</Text>
              <Text style={styles.historyText}>{item.query}</Text>
              <Text style={styles.historyCount}>{item.resultCount} sonuç</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Search Utility Functions ───────────────────────────

/**
 * Fuzzy search skoru hesaplar.
 * Tam eslesme > Baslangiç > Icerik > Benzer
 */
export function calculateSearchScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Tam eslesme
  if (t === q) return 100;

  // Baslangic eslesmesi
  if (t.startsWith(q)) return 90;

  // Kelime baslangici eslesmesi
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 80;

  // Icerik eslesmesi
  if (t.includes(q)) return 70;

  // Karakter benzerlik
  let matchCount = 0;
  let qIndex = 0;
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) {
      matchCount++;
      qIndex++;
    }
  }

  const ratio = matchCount / q.length;
  if (ratio > 0.7) return Math.round(ratio * 60);

  return 0;
}

/**
 * Evrensel arama - tum kaynaklarda arar.
 */
export function universalSearch<T extends { name: string; title?: string }>(
  items: T[],
  query: string,
  getSearchField: (item: T) => string = (item) => item.name || (item as any).title || '',
): Array<T & { searchScore: number }> {
  if (!query || query.length < 2) return [];

  return items
    .map((item) => ({
      ...item,
      searchScore: calculateSearchScore(query, getSearchField(item)),
    }))
    .filter((item) => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: colors.focus.ring,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '500',
  },
  clearButton: {
    color: colors.text.muted,
    fontSize: 20,
    padding: 8,
  },

  // Categories
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  categoryChipActive: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  categoryText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Results
  resultCount: {
    color: colors.text.secondary,
    fontSize: 13,
    paddingHorizontal: 28,
    marginBottom: 8,
  },
  resultList: {
    flex: 1,
  },
  resultListContent: {
    paddingHorizontal: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.background.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTypeIcon: {
    fontSize: 22,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  resultSubtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: colors.background.active,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Popular
  popularSection: {
    padding: 24,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  popularChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  popularChip: {
    backgroundColor: colors.background.card,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  popularChipText: {
    color: colors.text.secondary,
    fontSize: 14,
  },

  // History
  historySection: {
    padding: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  historyText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
  },
  historyCount: {
    color: colors.text.muted,
    fontSize: 12,
  },
});
