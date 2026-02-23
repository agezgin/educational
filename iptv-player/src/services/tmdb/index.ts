// TMDB API
export {
  setTMDBApiKey,
  imageUrl,
  // Film
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  getMovieRecommendations,
  getMovieReviews,
  getMovieCollection,
  searchMovie,
  getFullMovieData,
  // Dizi
  getTVShowDetails,
  getTVShowCredits,
  getTVShowVideos,
  getSimilarTVShows,
  getTVShowRecommendations,
  getTVShowReviews,
  getTVSeasonDetails,
  searchTVShow,
  getFullTVShowData,
  // Kisi (Person)
  getPersonDetails,
  getPersonCredits,
  searchPerson,
  getFullPersonData,
  // Discover & Trending
  getTrending,
  discoverByGenre,
  getMovieGenres,
  getTVGenres,
  // Coklu arama
  searchMulti,
} from './tmdbApi';

export type {
  TMDBMovie,
  TMDBTVShow,
  TMDBCastMember,
  TMDBCrewMember,
  TMDBVideo,
  TMDBReview,
  TMDBListItem,
  TMDBCollection,
  TMDBSeason,
  TMDBEpisode,
  TMDBPerson,
  TMDBPersonCredit,
} from './tmdbApi';

// TMDB Matcher
export {
  cleanContentName,
  matchMovie,
  matchTVShow,
  batchMatch,
} from './tmdbMatcher';
