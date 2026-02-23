/**
 * YouTube-Style TV Search Screen
 *
 * Sorun: Normal TextInput + kumanda = BERBAT deneyim
 * Cozum: YouTube TV tarzinda ekran klavyesi
 *
 * Layout:
 * +----------------------------------------------------+
 * |  Sol: Klavye Grid    |   Sag: Anlik Sonuclar       |
 * |                      |                              |
 * |  A B C D E F G      |   > TRT 1 HD          [CANLI]|
 * |  H I J K L M N      |   > TRT Spor          [CANLI]|
 * |  O P Q R S T U      |   > TR Sinema         [FILM] |
 * |  V W X Y Z . -      |   > The Batman        [FILM] |
 * |                      |   > True Detective    [DIZI] |
 * |  [SIL] [BOS] [TEM]  |                              |
 * |                      |                              |
 * |  Oneri: spor | haber |   [Tumu] [Canli] [Film]     |
 * +----------------------------------------------------+
 *
 * Ozellikler:
 * - D-Pad ile harf secimi (YouTube TV gibi)
 * - Her harf girisinde anlik autocomplete
 * - Oneri chip'leri (populer + gecmis)
 * - Kategori filtresi
 * - Voice search butonu
 * - Harf girisini geri al (backspace)
 * - Bosluk ve ozel karakterler
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme';
import { useNavigation } from '@react-navigation/native';

// ─── Types ──────────────────────────────────────────────

type SearchCategory = 'all' | 'live' | 'movie' | 'series';

export interface SearchResult {
  id: string;
  type: 'live' | 'movie' | 'series' | 'epg';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  streamUrl?: string;
  score: number;
}

// ─── Keyboard Layout ────────────────────────────────────

const KEYBOARD_ROWS: string[][] = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '0', '1'],
  ['2', '3', '4', '5', '6', '7', '8'],
  ['9', '.', '-', '_', '&', '+', '@'],
];

const SPECIAL_KEYS = [
  { key: 'BACKSPACE', label: '⌫ Sil' },
  { key: 'SPACE', label: '␣ Boşluk' },
  { key: 'CLEAR', label: '✕ Temizle' },
];

// ─── Component ──────────────────────────────────────────

export function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedKey, setFocusedKey] = useState({ row: 0, col: 0 });
  const [focusArea, setFocusArea] = useState<'keyboard' | 'results' | 'suggestions' | 'categories'>('keyboard');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { width: screenWidth } = Dimensions.get('window');
  const keyboardWidth = Math.min(screenWidth * 0.42, 480);
  const resultsWidth = screenWidth - keyboardWidth - 60;

  // Autocomplete - her harf girisinde tetiklenir
  useEffect(() => {
    if (query.length >= 1) {
      performSearch(query, category);
      const autoSuggestions = generateAutoComplete(query, searchHistory);
      setSuggestions(autoSuggestions);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [query, category]);

  // Arama islemi
  const performSearch = useCallback(async (searchQuery: string, searchCategory: SearchCategory) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    // channelStore, vodStore, EPG'den sonuc toplanacak
    const allResults: SearchResult[] = [];
    const filtered = searchCategory === 'all'
      ? allResults
      : allResults.filter((r) => r.type === searchCategory);
    setResults(filtered.sort((a, b) => b.score - a.score));
    setIsSearching(false);
  }, []);

  // Klavye tusu
  const handleKeyPress = useCallback((key: string) => {
    switch (key) {
      case 'BACKSPACE':
        setQuery((prev) => prev.slice(0, -1));
        break;
      case 'SPACE':
        setQuery((prev) => prev + ' ');
        break;
      case 'CLEAR':
        setQuery('');
        break;
      default:
        setQuery((prev) => prev + key.toLowerCase());
        break;
    }
  }, []);

  // Oneri secildi
  const handleSuggestionPress = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h !== suggestion);
      return [suggestion, ...filtered].slice(0, 20);
    });
  }, []);

  // Sonuca tiklama
  const handleResultPress = useCallback((result: SearchResult) => {
    if (query) {
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => h !== query);
        return [query, ...filtered].slice(0, 20);
      });
    }
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
  }, [navigation, query]);

  const categories: { key: SearchCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'Tümü', icon: '🔍' },
    { key: 'live', label: 'Canlı', icon: '📺' },
    { key: 'movie', label: 'Film', icon: '🎬' },
    { key: 'series', label: 'Dizi', icon: '📺' },
  ];

  const popularTerms = [
    'Spor', 'Haber', 'Sinema', 'Cocuk',
    'Belgesel', 'Dizi', 'Muzik', 'Film',
  ];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'live': return 'CANLI';
      case 'movie': return 'FİLM';
      case 'series': return 'DİZİ';
      default: return '';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'live': return '#F85149';
      case 'movie': return '#3B82F6';
      case 'series': return '#10B981';
      default: return '#8B949E';
    }
  };

  return (
    <View style={styles.container}>
      {/* Arama Cubugu */}
      <View style={styles.searchBarRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.queryText}>
            {query || 'Kanal, film veya dizi ara...'}
          </Text>
          {query.length > 0 && (
            <Text style={styles.queryCount}>
              {isSearching ? '...' : `${results.length} sonuç`}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.voiceButton}>
          <Text style={styles.voiceIcon}>🎤</Text>
        </TouchableOpacity>
      </View>

      {/* Klavye (sol) + Sonuclar (sag) */}
      <View style={styles.mainContent}>

        {/* SOL: Ekran Klavyesi */}
        <View style={[styles.keyboardSection, { width: keyboardWidth }]}>
          <View style={styles.keyboardGrid}>
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyboardRow}>
                {row.map((key, colIndex) => {
                  const isFocused = focusArea === 'keyboard' &&
                    focusedKey.row === rowIndex && focusedKey.col === colIndex;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.keyButton,
                        isFocused && styles.keyButtonFocused,
                        query.includes(key.toLowerCase()) && styles.keyButtonUsed,
                      ]}
                      onPress={() => handleKeyPress(key)}
                      onFocus={() => {
                        setFocusArea('keyboard');
                        setFocusedKey({ row: rowIndex, col: colIndex });
                      }}
                    >
                      <Text style={[
                        styles.keyText,
                        isFocused && styles.keyTextFocused,
                      ]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Ozel tuslar */}
            <View style={styles.keyboardRow}>
              {SPECIAL_KEYS.map((sk) => (
                <TouchableOpacity
                  key={sk.key}
                  style={[
                    styles.specialKeyButton,
                    sk.key === 'CLEAR' && styles.clearKeyButton,
                  ]}
                  onPress={() => handleKeyPress(sk.key)}
                >
                  <Text style={[
                    styles.specialKeyText,
                    sk.key === 'CLEAR' && styles.clearKeyText,
                  ]}>{sk.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Oneriler */}
          <View style={styles.suggestionsSection}>
            {suggestions.length > 0 && (
              <View style={styles.autoCompleteRow}>
                <Text style={styles.suggestionsLabel}>Öneriler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestionChip}
                      onPress={() => handleSuggestionPress(s)}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {query.length === 0 && (
              <>
                {searchHistory.length > 0 && (
                  <View style={styles.historyRow}>
                    <Text style={styles.suggestionsLabel}>Son Aramalar</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {searchHistory.slice(0, 8).map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={styles.historyChip}
                          onPress={() => handleSuggestionPress(h)}
                        >
                          <Text style={styles.historyChipIcon}>🕐</Text>
                          <Text style={styles.historyChipText}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.popularRow}>
                  <Text style={styles.suggestionsLabel}>Popüler</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {popularTerms.map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={styles.popularChip}
                        onPress={() => handleSuggestionPress(term)}
                      >
                        <Text style={styles.popularChipText}>{term}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>

        {/* SAG: Sonuclar */}
        <View style={[styles.resultsSection, { width: resultsWidth }]}>
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  category === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.key)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  category === cat.key && styles.categoryTextActive,
                ]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.resultItem, index === 0 && styles.resultItemFirst]}
                  onPress={() => handleResultPress(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultIndex}>{index + 1}</Text>
                  <View style={styles.resultThumb}>
                    <Text style={styles.resultThumbIcon}>
                      {item.type === 'live' ? '📺' : item.type === 'movie' ? '🎬' : '📺'}
                    </Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    )}
                  </View>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: getTypeBadgeColor(item.type) + '22', borderColor: getTypeBadgeColor(item.type) + '44' },
                  ]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(item.type) }]}>
                      {getTypeLabel(item.type)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.resultList}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={5}
            />
          ) : query.length > 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsIcon}>🔍</Text>
              <Text style={styles.noResultsText}>"{query}" için sonuç bulunamadı</Text>
              <Text style={styles.noResultsHint}>Farklı kelimeler veya kategori deneyin</Text>
            </View>
          ) : (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyIcon}>👈</Text>
              <Text style={styles.emptyText}>Aramak için soldaki klavyeyi kullanın</Text>
              <Text style={styles.emptyHint}>Her harf girişinde sonuçlar anında güncellenir</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Autocomplete Engine ────────────────────────────────

function generateAutoComplete(query: string, history: string[]): string[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const suggestions: string[] = [];

  for (const h of history) {
    if (h.toLowerCase().startsWith(q) && h.toLowerCase() !== q) {
      suggestions.push(h);
    }
  }

  const popular = [
    'Spor', 'Haber', 'Show TV', 'Star TV', 'ATV', 'TRT',
    'Sinema', 'Cocuk', 'Belgesel', 'Muzik', 'Dizi', 'Film',
    'National Geographic', 'Discovery', 'BBC', 'CNN',
    'beIN Sports', 'S Sport', 'NBA', 'Premier League',
  ];

  for (const term of popular) {
    if (term.toLowerCase().startsWith(q) && !suggestions.includes(term)) {
      suggestions.push(term);
    }
  }

  for (const term of popular) {
    if (term.toLowerCase().includes(q) && !term.toLowerCase().startsWith(q) && !suggestions.includes(term)) {
      suggestions.push(term);
    }
  }

  return suggestions.slice(0, 6);
}

// ─── Search Utilities ───────────────────────────────────

export function calculateSearchScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 80;
  if (t.includes(q)) return 70;
  let matchCount = 0;
  let qIndex = 0;
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) { matchCount++; qIndex++; }
  }
  const ratio = matchCount / q.length;
  if (ratio > 0.7) return Math.round(ratio * 60);
  return 0;
}

export function universalSearch<T extends { name: string; title?: string }>(
  items: T[],
  query: string,
  getSearchField: (item: T) => string = (item) => item.name || (item as any).title || '',
): Array<T & { searchScore: number }> {
  if (!query || query.length < 1) return [];
  return items
    .map((item) => ({ ...item, searchScore: calculateSearchScore(query, getSearchField(item)) }))
    .filter((item) => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background.card, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: colors.text.primary, fontSize: 20 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 2, borderColor: colors.accent.blue },
  searchIcon: { fontSize: 18, marginRight: 10 },
  queryText: { flex: 1, color: colors.text.primary, fontSize: 18, fontWeight: '500' },
  queryCount: { color: colors.text.muted, fontSize: 13 },
  voiceButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent.blue, justifyContent: 'center', alignItems: 'center' },
  voiceIcon: { fontSize: 20 },

  mainContent: { flex: 1, flexDirection: 'row', paddingHorizontal: 20, gap: 16 },
  keyboardSection: { paddingTop: 4 },
  keyboardGrid: { gap: 4 },
  keyboardRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  keyButton: { width: 52, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: colors.background.card, borderWidth: 1, borderColor: '#21262D' },
  keyButtonFocused: { backgroundColor: colors.accent.blue, borderColor: colors.accent.blue, transform: [{ scale: 1.08 }] },
  keyButtonUsed: { backgroundColor: '#1C2333', borderColor: '#30363D' },
  keyText: { color: colors.text.primary, fontSize: 18, fontWeight: '600' },
  keyTextFocused: { color: '#FFFFFF', fontWeight: '800' },
  specialKeyButton: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#1C2333', borderWidth: 1, borderColor: '#30363D' },
  clearKeyButton: { backgroundColor: 'rgba(248, 81, 73, 0.15)', borderColor: 'rgba(248, 81, 73, 0.3)' },
  specialKeyText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  clearKeyText: { color: '#F85149' },

  suggestionsSection: { marginTop: 14, gap: 10 },
  suggestionsLabel: { color: colors.text.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  autoCompleteRow: { gap: 4 },
  suggestionChip: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.25)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginRight: 8 },
  suggestionText: { color: colors.accent.blue, fontSize: 13, fontWeight: '500' },
  historyRow: { gap: 4 },
  historyChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, gap: 5 },
  historyChipIcon: { fontSize: 11 },
  historyChipText: { color: colors.text.secondary, fontSize: 13 },
  popularRow: { gap: 4 },
  popularChip: { backgroundColor: colors.background.card, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#30363D' },
  popularChipText: { color: colors.text.secondary, fontSize: 13 },

  resultsSection: { flex: 1 },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.background.card, borderWidth: 1, borderColor: '#30363D', gap: 5 },
  categoryChipActive: { backgroundColor: colors.accent.blue, borderColor: colors.accent.blue },
  categoryIcon: { fontSize: 13 },
  categoryText: { color: colors.text.secondary, fontSize: 13, fontWeight: '500' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '600' },

  resultList: { flex: 1 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 2, gap: 10 },
  resultItemFirst: { backgroundColor: 'rgba(59, 130, 246, 0.08)' },
  resultIndex: { color: colors.text.muted, fontSize: 12, width: 20, textAlign: 'center', fontWeight: '600' },
  resultThumb: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#21262D', justifyContent: 'center', alignItems: 'center' },
  resultThumbIcon: { fontSize: 18 },
  resultInfo: { flex: 1 },
  resultTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '500' },
  resultSubtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  noResults: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResultsIcon: { fontSize: 48, marginBottom: 12 },
  noResultsText: { color: colors.text.primary, fontSize: 16, fontWeight: '500' },
  noResultsHint: { color: colors.text.muted, fontSize: 13, marginTop: 6 },
  emptyResults: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.text.secondary, fontSize: 16 },
  emptyHint: { color: colors.text.muted, fontSize: 13, marginTop: 6 },
});
