import { Component, OnInit } from '@angular/core';
import { TmdbService, ProductLike, Genre, MovieItem } from '../app.component/services/tmdb.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  // Carousel
  products: ProductLike[] = [];
  responsiveOptions: any[] = [
    { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '991px', numVisible: 2, numScroll: 1 },
    { breakpoint: '575px', numVisible: 1, numScroll: 1 }
  ];

  // Filter by genre + cards
  genres: Genre[] = [];
  selectedGenres: number[] = [];
  movies: MovieItem[] = [];
  loadingMovies = false;

  constructor(private tmdb: TmdbService) {}

  ngOnInit(): void {
    // Load carousel items
    this.tmdb.getPopularMovies().subscribe({
      next: (items) => (this.products = items),
      error: (err) => console.error('Failed to load popular movies', err)
    });

    // Load genres then initial movie list
    this.tmdb.getGenres().subscribe({
      next: (gs) => {
        this.genres = gs;
        this.loadMovies();
      },
      error: (err) => console.error('Failed to load genres', err)
    });
  }

  loadMovies(): void {
    this.loadingMovies = true;
    this.tmdb.discoverMovies({ genreIds: this.selectedGenres }).subscribe({
      next: (items) => {
        this.movies = items;
        this.loadingMovies = false;
      },
      error: (err) => {
        console.error('Failed to load movies', err);
        this.loadingMovies = false;
      }
    });
  }

  onGenresChange(): void {
    this.loadMovies();
  }

  clearGenres(): void {
    this.selectedGenres = [];
    this.loadMovies();
  }

    getSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'Top Rated':
        return 'success';
      case 'Great':
        return 'info';
      case 'Good':
          return 'warn';
      default:
          return 'warn';
    }
  }
}