/**
 * Navigation route tanimlari.
 * Live TV, Film ve Dizi ekranlari dahil.
 */

export type RootStackParamList = {
  Welcome: undefined;
  PlaylistAdd: undefined;
  Home: undefined;
  Player: { channelId: string };
  /** Film/Dizi player - kaldigi yerden devam destegi */
  VODPlayer: { contentId: string; contentType: 'movie' | 'episode'; startFrom?: number };
  EPG: undefined;
  /** Film listesi */
  Movies: undefined;
  /** Film detay sayfasi */
  MovieDetail: { movieId: string };
  /** Dizi listesi */
  SeriesList: undefined;
  /** Dizi detay - sezonlar ve bolumler */
  SeriesDetail: { seriesId: string };
  Settings: undefined;
  Search: { contentType?: 'live' | 'movie' | 'series' };
  /** Takip edilen diziler ekrani */
  MySeries: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
