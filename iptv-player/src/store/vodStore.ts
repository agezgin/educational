/**
 * VOD Store - Film ve Dizi state yonetimi
 *
 * Film listesi, dizi listesi, izleme durumu (kaldigi yerden devam).
 */

import { create } from 'zustand';
import { Movie, MovieGroup, Series, SeriesGroup } from '@/types';

interface VODState {
  /** Tum filmler */
  movies: Movie[];
  /** Gruplanmis filmler */
  movieGroups: MovieGroup[];
  /** Secili film kategorisi */
  activeMovieGroupId: string | null;
  /** Aktif kategorideki filmler */
  activeMovies: Movie[];

  /** Tum diziler */
  seriesList: Series[];
  /** Gruplanmis diziler */
  seriesGroups: SeriesGroup[];
  /** Secili dizi kategorisi */
  activeSeriesGroupId: string | null;
  /** Aktif kategorideki diziler */
  activeSeries: Series[];

  /** Izleme gecmisi (film/dizi) - kaldigi yerden devam */
  watchProgress: Record<string, number>;

  /** Yukleniyor mu? */
  isLoading: boolean;
  error: string | null;

  // Actions
  setMovies: (movies: Movie[], groups: MovieGroup[]) => void;
  setActiveMovieGroup: (groupId: string | null) => void;
  setSeries: (series: Series[], groups: SeriesGroup[]) => void;
  setActiveSeriesGroup: (groupId: string | null) => void;
  updateWatchProgress: (contentId: string, seconds: number) => void;
  getWatchProgress: (contentId: string) => number;
  toggleMovieFavorite: (movieId: string) => void;
  toggleSeriesFavorite: (seriesId: string) => void;
  searchMovies: (query: string) => Movie[];
  searchSeries: (query: string) => Series[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVODStore = create<VODState>((set, get) => ({
  movies: [],
  movieGroups: [],
  activeMovieGroupId: null,
  activeMovies: [],

  seriesList: [],
  seriesGroups: [],
  activeSeriesGroupId: null,
  activeSeries: [],

  watchProgress: {},
  isLoading: false,
  error: null,

  setMovies: (movies, groups) => {
    set({
      movies,
      movieGroups: groups,
      activeMovies: movies,
    });
  },

  setActiveMovieGroup: (groupId) => {
    const { movies, movieGroups } = get();

    if (!groupId) {
      set({ activeMovieGroupId: null, activeMovies: movies });
      return;
    }

    if (groupId === 'favorites') {
      set({
        activeMovieGroupId: groupId,
        activeMovies: movies.filter(m => m.isFavorite),
      });
      return;
    }

    const group = movieGroups.find(g => g.id === groupId);
    if (group) {
      set({ activeMovieGroupId: groupId, activeMovies: group.movies });
    }
  },

  setSeries: (seriesList, groups) => {
    set({
      seriesList,
      seriesGroups: groups,
      activeSeries: seriesList,
    });
  },

  setActiveSeriesGroup: (groupId) => {
    const { seriesList, seriesGroups } = get();

    if (!groupId) {
      set({ activeSeriesGroupId: null, activeSeries: seriesList });
      return;
    }

    if (groupId === 'favorites') {
      set({
        activeSeriesGroupId: groupId,
        activeSeries: seriesList.filter(s => s.isFavorite),
      });
      return;
    }

    const group = seriesGroups.find(g => g.id === groupId);
    if (group) {
      set({ activeSeriesGroupId: groupId, activeSeries: group.series });
    }
  },

  updateWatchProgress: (contentId, seconds) => {
    set(state => ({
      watchProgress: {
        ...state.watchProgress,
        [contentId]: seconds,
      },
    }));
  },

  getWatchProgress: (contentId) => {
    return get().watchProgress[contentId] || 0;
  },

  toggleMovieFavorite: (movieId) => {
    set(state => {
      const updatedMovies = state.movies.map(m =>
        m.id === movieId ? { ...m, isFavorite: !m.isFavorite } : m
      );
      return {
        movies: updatedMovies,
        activeMovies: state.activeMovies.map(m =>
          m.id === movieId ? { ...m, isFavorite: !m.isFavorite } : m
        ),
      };
    });
  },

  toggleSeriesFavorite: (seriesId) => {
    set(state => {
      const updatedSeries = state.seriesList.map(s =>
        s.id === seriesId ? { ...s, isFavorite: !s.isFavorite } : s
      );
      return {
        seriesList: updatedSeries,
        activeSeries: state.activeSeries.map(s =>
          s.id === seriesId ? { ...s, isFavorite: !s.isFavorite } : s
        ),
      };
    });
  },

  searchMovies: (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return get().movies.filter(m =>
      (m.name && m.name.toLowerCase().includes(lowerQuery)) ||
      (m.genre && m.genre.toLowerCase().includes(lowerQuery))
    );
  },

  searchSeries: (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return get().seriesList.filter(s =>
      (s.name && s.name.toLowerCase().includes(lowerQuery)) ||
      (s.genre && s.genre.toLowerCase().includes(lowerQuery))
    );
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
