/**
 * Xtream Codes API Parser
 *
 * Canli TV + Film (VOD) + Dizi (Series) destegi.
 * Endpoint'ler:
 *   /player_api.php?username=X&password=Y&action=...
 *
 * Desteklenen action'lar:
 *   - get_live_categories / get_live_streams        -> Canli TV
 *   - get_vod_categories / get_vod_streams          -> Filmler
 *   - get_series_categories / get_series             -> Diziler
 *   - get_series_info&series_id=X                   -> Dizi detay (sezon/bolum)
 */

import { Channel, ChannelGroup, Movie, MovieGroup, Series, SeriesGroup, Season, Episode } from '@/types';

export interface XtreamAuthInfo {
  serverUrl: string;
  username: string;
  password: string;
}

interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  tv_archive: number;
}

interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  added: string;
  category_id: string;
  container_extension: string;
}

interface XtreamSeriesItem {
  series_id: number;
  name: string;
  cover: string;
  plot: string;
  cast: string;
  genre: string;
  release_date: string;
  rating: string;
  category_id: string;
  backdrop_path: string[];
}

interface XtreamSeriesInfo {
  seasons: Array<{
    season_number: number;
    name: string;
    cover: string;
  }>;
  episodes: Record<string, Array<{
    id: string;
    episode_num: number;
    title: string;
    container_extension: string;
    info: {
      duration_secs: number;
      plot: string;
      movie_image: string;
    };
  }>>;
  info: {
    name: string;
    cover: string;
    plot: string;
    genre: string;
    release_date: string;
    rating: string;
    backdrop_path: string[];
  };
}

function buildApiUrl(auth: XtreamAuthInfo, action: string, params?: Record<string, string>): string {
  const base = auth.serverUrl.replace(/\/$/, '');
  let url = `${base}/player_api.php?username=${encodeURIComponent(auth.username)}&password=${encodeURIComponent(auth.password)}&action=${action}`;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url += `&${key}=${encodeURIComponent(value)}`;
    }
  }
  return url;
}

function buildLiveStreamUrl(auth: XtreamAuthInfo, streamId: number): string {
  const base = auth.serverUrl.replace(/\/$/, '');
  return `${base}/live/${encodeURIComponent(auth.username)}/${encodeURIComponent(auth.password)}/${streamId}.ts`;
}

function buildVodStreamUrl(auth: XtreamAuthInfo, streamId: number, extension: string): string {
  const base = auth.serverUrl.replace(/\/$/, '');
  return `${base}/movie/${encodeURIComponent(auth.username)}/${encodeURIComponent(auth.password)}/${streamId}.${extension}`;
}

function buildSeriesStreamUrl(auth: XtreamAuthInfo, episodeId: string, extension: string): string {
  const base = auth.serverUrl.replace(/\/$/, '');
  return `${base}/series/${encodeURIComponent(auth.username)}/${encodeURIComponent(auth.password)}/${episodeId}.${extension}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Xtream API hatasi: ${response.status}`);
  return response.json();
}

// ─── CANLI TV ─────────────────────────────────────────────────

export async function fetchLiveCategories(auth: XtreamAuthInfo): Promise<XtreamCategory[]> {
  return fetchJson(buildApiUrl(auth, 'get_live_categories'));
}

export async function fetchLiveStreams(auth: XtreamAuthInfo): Promise<Channel[]> {
  const streams = await fetchJson<XtreamLiveStream[]>(buildApiUrl(auth, 'get_live_streams'));

  return streams.map((stream, index) => ({
    id: stream.epg_channel_id || `xtream_${stream.stream_id}`,
    name: stream.name,
    url: buildLiveStreamUrl(auth, stream.stream_id),
    logoUrl: stream.stream_icon || undefined,
    groupTitle: stream.category_id,
    number: stream.num || index + 1,
    isFavorite: false,
    isLocked: false,
    watchCount: 0,
    streamId: stream.stream_id,
    catchupSupport: stream.tv_archive === 1,
  }));
}

export async function fetchLiveGrouped(auth: XtreamAuthInfo): Promise<ChannelGroup[]> {
  const [categories, channels] = await Promise.all([
    fetchLiveCategories(auth),
    fetchLiveStreams(auth),
  ]);

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.category_id, cat.category_name);
  }

  const updatedChannels = channels.map(ch => ({
    ...ch,
    groupTitle: categoryMap.get(ch.groupTitle) || 'Diger',
  }));

  const groupMap = new Map<string, Channel[]>();
  for (const ch of updatedChannels) {
    if (!groupMap.has(ch.groupTitle)) groupMap.set(ch.groupTitle, []);
    groupMap.get(ch.groupTitle)!.push(ch);
  }

  return Array.from(groupMap.entries()).map(([name, chs]) => ({
    id: `live_group_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    channelCount: chs.length,
    channels: chs,
  }));
}

// ─── FILMLER (VOD) ───────────────────────────────────────────

export async function fetchMovieCategories(auth: XtreamAuthInfo): Promise<XtreamCategory[]> {
  return fetchJson(buildApiUrl(auth, 'get_vod_categories'));
}

export async function fetchMovies(auth: XtreamAuthInfo): Promise<Movie[]> {
  const streams = await fetchJson<XtreamVodStream[]>(buildApiUrl(auth, 'get_vod_streams'));

  return streams.map(stream => ({
    id: `movie_${stream.stream_id}`,
    name: stream.name,
    url: buildVodStreamUrl(auth, stream.stream_id, stream.container_extension),
    posterUrl: stream.stream_icon || undefined,
    groupTitle: stream.category_id,
    rating: parseFloat(stream.rating) || undefined,
    streamId: stream.stream_id,
    isFavorite: false,
  }));
}

export async function fetchMoviesGrouped(auth: XtreamAuthInfo): Promise<MovieGroup[]> {
  const [categories, movies] = await Promise.all([
    fetchMovieCategories(auth),
    fetchMovies(auth),
  ]);

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.category_id, cat.category_name);
  }

  const updatedMovies = movies.map(m => ({
    ...m,
    groupTitle: categoryMap.get(m.groupTitle) || 'Diger',
  }));

  const groupMap = new Map<string, Movie[]>();
  for (const movie of updatedMovies) {
    if (!groupMap.has(movie.groupTitle)) groupMap.set(movie.groupTitle, []);
    groupMap.get(movie.groupTitle)!.push(movie);
  }

  return Array.from(groupMap.entries()).map(([name, grpMovies]) => ({
    id: `movie_group_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    movieCount: grpMovies.length,
    movies: grpMovies,
  }));
}

// ─── DIZILER (SERIES) ────────────────────────────────────────

export async function fetchSeriesCategories(auth: XtreamAuthInfo): Promise<XtreamCategory[]> {
  return fetchJson(buildApiUrl(auth, 'get_series_categories'));
}

export async function fetchSeriesList(auth: XtreamAuthInfo): Promise<Series[]> {
  const items = await fetchJson<XtreamSeriesItem[]>(buildApiUrl(auth, 'get_series'));

  return items.map(item => ({
    id: `series_${item.series_id}`,
    name: item.name,
    posterUrl: item.cover || undefined,
    backdropUrl: item.backdrop_path?.[0] || undefined,
    groupTitle: item.category_id,
    rating: parseFloat(item.rating) || undefined,
    year: item.release_date ? parseInt(item.release_date.split('-')[0], 10) : undefined,
    description: item.plot || undefined,
    genre: item.genre || undefined,
    seasons: [],
    isFavorite: false,
  }));
}

export async function fetchSeriesDetail(auth: XtreamAuthInfo, seriesId: number): Promise<Series> {
  const info = await fetchJson<XtreamSeriesInfo>(
    buildApiUrl(auth, 'get_series_info', { series_id: String(seriesId) })
  );

  const seasons: Season[] = (info.seasons || []).map(s => {
    const seasonEpisodes = info.episodes[String(s.season_number)] || [];

    const episodes: Episode[] = seasonEpisodes.map(ep => ({
      id: ep.id,
      seriesId: `series_${seriesId}`,
      seasonNumber: s.season_number,
      episodeNumber: ep.episode_num,
      name: ep.title,
      url: buildSeriesStreamUrl(auth, ep.id, ep.container_extension),
      posterUrl: ep.info?.movie_image || undefined,
      duration: ep.info?.duration_secs ? Math.floor(ep.info.duration_secs / 60) : undefined,
      description: ep.info?.plot || undefined,
    }));

    return {
      id: `season_${seriesId}_${s.season_number}`,
      seriesId: `series_${seriesId}`,
      seasonNumber: s.season_number,
      name: s.name || `Sezon ${s.season_number}`,
      posterUrl: s.cover || undefined,
      episodes,
    };
  });

  return {
    id: `series_${seriesId}`,
    name: info.info.name,
    posterUrl: info.info.cover || undefined,
    backdropUrl: info.info.backdrop_path?.[0] || undefined,
    groupTitle: '',
    rating: parseFloat(info.info.rating) || undefined,
    year: info.info.release_date ? parseInt(info.info.release_date.split('-')[0], 10) : undefined,
    description: info.info.plot || undefined,
    genre: info.info.genre || undefined,
    seasons,
    isFavorite: false,
  };
}

export async function fetchSeriesGrouped(auth: XtreamAuthInfo): Promise<SeriesGroup[]> {
  const [categories, seriesList] = await Promise.all([
    fetchSeriesCategories(auth),
    fetchSeriesList(auth),
  ]);

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.category_id, cat.category_name);
  }

  const updatedSeries = seriesList.map(s => ({
    ...s,
    groupTitle: categoryMap.get(s.groupTitle) || 'Diger',
  }));

  const groupMap = new Map<string, Series[]>();
  for (const s of updatedSeries) {
    if (!groupMap.has(s.groupTitle)) groupMap.set(s.groupTitle, []);
    groupMap.get(s.groupTitle)!.push(s);
  }

  return Array.from(groupMap.entries()).map(([name, grpSeries]) => ({
    id: `series_group_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    seriesCount: grpSeries.length,
    series: grpSeries,
  }));
}
