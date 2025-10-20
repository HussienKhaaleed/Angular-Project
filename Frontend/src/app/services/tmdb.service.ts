import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

interface TmdbMovie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  price: number;
  first_air_date?: string;
  popularity: number;
  genre_ids: number[];
}

interface TmdbListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieItem {
  id: number;
  title: string;
  overview: string;
  posterUrl: string;
  price: number;
  releaseDate?: string;
  genreIds: number[];
  voteAverage: number;
}

export interface ProductLike {
  id: number;
  name: string;
  image: string;
  price: number;
  inventoryStatus: string;
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imgBase = 'https://image.tmdb.org/t/p/w500';
  private readonly apiKey = '9813ce01a72ca1bd2ae25f091898b1c7';

  constructor(private http: HttpClient) {}

  // Carousel data (popular movies)
  getPopularMovies(): Observable<ProductLike[]> {
    const url = `${this.baseUrl}/discover/movie`;
    const params = new HttpParams()
      .set('sort_by', 'popularity.desc')
      .set('api_key', this.apiKey);

    return this.http.get<TmdbListResponse<TmdbMovie>>(url, { params }).pipe(
      map(res =>
        (res.results || [])
          .filter(m => m.poster_path)
          .map(m => this.toProductLike(m))
      )
    );
  }

  // Fetch all movie genres
  getGenres(): Observable<Genre[]> {
    const url = `${this.baseUrl}/genre/movie/list`;
    const params = new HttpParams().set('api_key', this.apiKey);
    return this.http.get<{ genres: Genre[] }>(url, { params }).pipe(map(r => r.genres || []));
  }

  // Discover movies, optionally filtered by genres
  discoverMovies(options?: { genreIds?: number[]; page?: number }): Observable<MovieItem[]> {
    const url = `${this.baseUrl}/discover/movie`;
    let params = new HttpParams()
      .set('sort_by', 'popularity.desc')
      .set('api_key', this.apiKey);

    if (options?.genreIds && options.genreIds.length) {
      params = params.set('with_genres', options.genreIds.join(','));
    }
    if (options?.page) {
      params = params.set('page', String(options.page));
    }

    return this.http.get<TmdbListResponse<TmdbMovie>>(url, { params }).pipe(
      map(res =>
        (res.results || [])
          .filter(m => m.poster_path)
          .map(m => this.toMovieItem(m))
      )
    );
  }

  private toProductLike(m: TmdbMovie): ProductLike {
    const title = m.title || m.name || 'Untitled';
    const rating = m.vote_average ?? 0;

    return {
      id: m.id,
      name: title,
      image: m.poster_path ? `${this.imgBase}${m.poster_path}` : '',
      price: Number(rating.toFixed(1)),
      inventoryStatus: this.statusFromRating(rating)
    };
  }

  private toMovieItem(m: TmdbMovie): MovieItem {
    return {
      id: m.id,
      title: m.title || m.name || 'Untitled',
      price: Number((m.vote_average * 2).toFixed(2)),
      overview: m.overview || '',
      posterUrl: m.poster_path ? `${this.imgBase}${m.poster_path}` : '',
      releaseDate: m.release_date || m.first_air_date,
      genreIds: m.genre_ids || [],
      voteAverage: m.vote_average ?? 0
    };
  }

  private statusFromRating(rating: number): string {
    if (rating >= 8.0) return 'Top Rated';
    if (rating >= 7.0) return 'Great';
    if (rating >= 6.0) return 'Good';
    return 'Trending';
  }
}
