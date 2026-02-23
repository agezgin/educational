/**
 * CategorySidebar - Sol taraftaki kategori menusu.
 *
 * Kategoriler:
 * * Favoriler | TV Tumu | Haber | Spor | Sinema | Eglence |
 * Cocuk | Muzik | Uluslar. | Filmler | Diziler
 */

import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { FocusableItem } from '@/components/common';
import { colors, typography, spacing, borderRadius, SIDEBAR_WIDTH } from '@/theme';
import { ChannelGroup } from '@/types';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface CategorySidebarProps {
  groups: ChannelGroup[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  favoriteCount: number;
  /** Film ve dizi navigasyonu icin */
  onNavigateMovies?: () => void;
  onNavigateSeries?: () => void;
}

/** Kategori ikonlari - grup adina gore */
const CATEGORY_ICONS: Record<string, string> = {
  'Favoriler': '*',
  'Tumu': 'TV',
  'Haber': 'H',
  'Spor': 'S',
  'Sinema': 'F',
  'Eglence': 'E',
  'Cocuk': 'C',
  'Muzik': 'M',
  'Uluslararasi': 'U',
  'Filmler': 'FL',
  'Diziler': 'DZ',
};

export const CategorySidebar: React.FC<CategorySidebarProps> = memo(({
  groups,
  activeGroupId,
  onSelectGroup,
  favoriteCount,
  onNavigateMovies,
  onNavigateSeries,
}) => {
  // Sabit kategoriler + dinamik gruplar
  const categories: CategoryItem[] = [
    { id: 'favorites', name: 'Favoriler', icon: '*', count: favoriteCount },
    { id: 'all', name: 'Tumu', icon: 'TV', count: groups.reduce((sum, g) => sum + g.channelCount, 0) },
    ...groups.map(g => ({
      id: g.id,
      name: g.name,
      icon: CATEGORY_ICONS[g.name] || g.name.substring(0, 2).toUpperCase(),
      count: g.channelCount,
    })),
  ];

  // Film/Dizi navigasyon butonlari ekle
  if (onNavigateMovies) {
    categories.push({ id: 'nav_movies', name: 'Filmler', icon: 'FL', count: 0 });
  }
  if (onNavigateSeries) {
    categories.push({ id: 'nav_series', name: 'Diziler', icon: 'DZ', count: 0 });
  }

  const handleSelect = useCallback((item: CategoryItem) => {
    if (item.id === 'nav_movies') {
      onNavigateMovies?.();
      return;
    }
    if (item.id === 'nav_series') {
      onNavigateSeries?.();
      return;
    }
    if (item.id === 'all') {
      onSelectGroup(null);
      return;
    }
    onSelectGroup(item.id);
  }, [onSelectGroup, onNavigateMovies, onNavigateSeries]);

  const renderItem = useCallback(({ item }: { item: CategoryItem }) => {
    const isActive = (item.id === 'all' && !activeGroupId) || item.id === activeGroupId;

    return (
      <FocusableItem
        onPress={() => handleSelect(item)}
        style={[styles.item, isActive && styles.activeItem]}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.icon, isActive && styles.activeText]}>
            {item.icon}
          </Text>
          <Text
            style={[styles.name, isActive && styles.activeText]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.count > 0 && (
            <Text style={styles.count}>{item.count}</Text>
          )}
        </View>
      </FocusableItem>
    );
  }, [activeGroupId, handleSelect]);

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

CategorySidebar.displayName = 'CategorySidebar';

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.background.primary,
    borderRightWidth: 1,
    borderRightColor: colors.background.card,
    paddingTop: spacing.lg,
  },
  item: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  activeItem: {
    backgroundColor: colors.background.active,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    ...typography.body,
    color: colors.text.secondary,
    width: 30,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  activeText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  count: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
