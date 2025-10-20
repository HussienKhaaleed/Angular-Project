import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
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
}
