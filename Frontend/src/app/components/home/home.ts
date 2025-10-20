import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CartService } from '../../services/cart.service';
import { FavoriteService } from '../../services/favorite.service';
import { Genre, MovieItem, ProductLike, TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TagModule,
    CarouselModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    CardModule,
    ButtonModule,
    FormsModule,
    DialogModule,
    TextareaModule,
    RatingModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  // Carousel
  products: ProductLike[] = [];
  responsiveOptions: any[] = [
    { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '991px', numVisible: 2, numScroll: 1 },
    { breakpoint: '575px', numVisible: 1, numScroll: 1 },
  ];

  // Filter by genre + cards
  genres: Genre[] = [];
  selectedGenres: number[] = [];
  movies: MovieItem[] = [];
  loadingMovies = false;

  // Dialog
  visible: boolean = false;
  selectedMovie: MovieItem | ProductLike | null = null;
  newReview: string = '';
  userRating: number = 0;

  // Mock reviews - in a real app, this would come from a service
  reviews: { [key: string]: Array<{text: string, rating: number, date: string}> } = {};

  constructor(
    private tmdb: TmdbService,
    public cartService: CartService,
    public favoriteService: FavoriteService
  ) {}

  ngOnInit(): void {
    // Load carousel items
    this.tmdb.getPopularMovies().subscribe({
      next: (items) => (this.products = items),
      error: (err) => console.error('Failed to load popular movies', err),
    });

    // Load genres then initial movie list
    this.tmdb.getGenres().subscribe({
      next: (gs) => {
        this.genres = gs;
        this.loadMovies();
      },
      error: (err) => console.error('Failed to load genres', err),
    });

    // Mock some initial reviews
    this.initMockReviews();
  }

  initMockReviews() {
    // We'll populate some mock reviews when movies are loaded
    setTimeout(() => {
      this.movies.forEach(movie => {
        this.reviews[movie.id.toString()] = [
          {
            text: 'Great movie, highly recommended!',
            rating: 5,
            date: '2023-09-15'
          },
          {
            text: 'Interesting plot but lacking character development.',
            rating: 3,
            date: '2023-10-01'
          }
        ];
      });
    }, 1500);
  }

// ---------------- Carousel ----------------
addToCartProduct(product: ProductLike) {
  this.cartService.addToCart({
    id: product.id.toString(),
    productId: product.id.toString(),
    name: product.name,
    price: product.price,
    maxStock: undefined,
  });
}

toggleFavoriteProduct(product: ProductLike) {
  if (this.isFavoriteProduct(product.id.toString())) {
    this.favoriteService.removeFromFavorites(product.id.toString());
  } else {
    this.favoriteService.addToFavorites({
      id: product.id.toString(),
      productId: product.id.toString(),
      name: product.name,
      price: product.price,
    });
  }
}

  isFavoriteProduct(productId?: string): boolean {
    return productId ? this.favoriteService.isFavorite(productId) : false;
  }

// ---------------- Movie Grid ----------------
addToCartMovie(movie: MovieItem) {
  this.cartService.addToCart({
    id: movie.id.toString(),
    productId: movie.id.toString(),
    name: movie.title,
    price: 0,
    maxStock: undefined,
  });
}

toggleFavoriteMovie(movie: MovieItem) {
  if (this.isFavoriteMovie(movie.id)) {
    this.favoriteService.removeFromFavorites(movie.id.toString());
  } else {
    this.favoriteService.addToFavorites({
      id: movie.id.toString(),
      productId: movie.id.toString(),
      name: movie.title,
      price: 0,
    });
  }
}

  isFavoriteMovie(movieId?: number): boolean {
    return movieId ? this.favoriteService.isFavorite(movieId.toString()) : false;
  }

  loadMovies(): void {
    this.loadingMovies = true;
    this.tmdb.discoverMovies({ genreIds: this.selectedGenres }).subscribe({
      next: (items) => {
        this.movies = items;
        this.loadingMovies = false;
        this.initMockReviews();
      },
      error: (err) => {
        console.error('Failed to load movies', err);
        this.loadingMovies = false;
      },
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

  // ---------------- Dialog Functionality ----------------
  showDialogForMovie(movie: MovieItem) {
    this.selectedMovie = movie;
    this.visible = true;
    this.newReview = '';
    this.userRating = 0;
  }

  showDialogForProduct(product: ProductLike) {
    this.selectedMovie = product;
    this.visible = true;
    this.newReview = '';
    this.userRating = 0;
  }

  addReview() {
    if (!this.selectedMovie || !this.newReview.trim()) return;

    const movieId = 'title' in this.selectedMovie
      ? this.selectedMovie.id.toString()
      : this.selectedMovie.id.toString();

    if (!this.reviews[movieId]) {
      this.reviews[movieId] = [];
    }

    // Add new review
    this.reviews[movieId].push({
      text: this.newReview,
      rating: this.userRating || 3,
      date: new Date().toISOString().split('T')[0]
    });

    // Reset form
    this.newReview = '';
    this.userRating = 0;
  }

  getMovieTitle(): string {
    if (!this.selectedMovie) return '';
    return 'title' in this.selectedMovie ? this.selectedMovie.title : this.selectedMovie.name;
  }

  getMovieOverview(): string {
    if (!this.selectedMovie) return '';
    return 'overview' in this.selectedMovie && this.selectedMovie.overview
      ? this.selectedMovie.overview
      : 'No description available.';
  }

  getMovieReviews(): Array<{text: string, rating: number, date: string}> {
    if (!this.selectedMovie) return [];

    const movieId = 'title' in this.selectedMovie
      ? this.selectedMovie.id.toString()
      : this.selectedMovie.id.toString();

    return this.reviews[movieId] || [];
  }

  getMovieImage(): string {
    if (!this.selectedMovie) return '';
    return 'posterUrl' in this.selectedMovie ? this.selectedMovie.posterUrl : this.selectedMovie.image;
  }
}
