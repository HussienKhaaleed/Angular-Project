import { Injectable, computed, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpService } from './http.service';

export interface FavoriteItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  addedAt: Date;
}

export interface FavoriteSyncResponse {
  success: boolean;
  favorites: FavoriteItem[];
}

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly STORAGE_KEY = 'app_fav';
  private readonly COOKIE_KEY = 'favorites';
  private readonly COOKIE_EXPIRY_DAYS = 30;
  private api = `${environment.apiUrl}/favorite`;

  private favoriteItems = signal<FavoriteItem[]>([]);

  // Computed signals
  favoriteCount = computed(() => this.favoriteItems().length);

  favoriteIds = computed(() => this.favoriteItems().map((item) => item.productId));

  constructor(private httpService: HttpService) {
    this.loadFavoritesFromStorage();
  }

  private loadFavoritesFromStorage(): void {
    try {
      const favoritesJson = localStorage.getItem(this.STORAGE_KEY);

      if (!favoritesJson) {
        const cookieFavorites = this.getCookie(this.COOKIE_KEY);
        if (cookieFavorites) {
          const favorites = JSON.parse(cookieFavorites);
          this.favoriteItems.set(this.parseFavorites(favorites));
          return;
        }
      }

      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        this.favoriteItems.set(this.parseFavorites(favorites));
      }
    } catch (error) {
      console.error('Error loading favorites from storage:', error);
      this.favoriteItems.set([]);
    }
  }

  private parseFavorites(favorites: any[]): FavoriteItem[] {
    return favorites.map((item) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    }));
  }

  private saveFavoritesToStorage(): void {
    try {
      const favorites = this.favoriteItems();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      this.setCookie(this.COOKIE_KEY, JSON.stringify(favorites), this.COOKIE_EXPIRY_DAYS);
    } catch (error) {
      console.error('Error saving favorites to storage:', error);
    }
  }

  getFavoriteItems(): FavoriteItem[] {
    return this.favoriteItems();
  }

  addToFavorites(product: Omit<FavoriteItem, 'addedAt'>): void {
    const currentItems = this.favoriteItems();
    const exists = currentItems.some((item) => item.productId === product.productId);

    if (!exists) {
      const newItem: FavoriteItem = {
        ...product,
        addedAt: new Date(),
      };
      this.favoriteItems.set([...currentItems, newItem]);
      this.saveFavoritesToStorage();
    }
  }

  removeFromFavorites(productId: string): void {
    const updatedItems = this.favoriteItems().filter((item) => item.productId !== productId);
    this.favoriteItems.set(updatedItems);
    this.saveFavoritesToStorage();
  }

  toggleFavorite(product: Omit<FavoriteItem, 'addedAt'>): void {
    if (this.isFavorite(product.productId)) {
      this.removeFromFavorites(product.productId);
    } else {
      this.addToFavorites(product);
    }
  }

  addMultipleToFavorites(products: Omit<FavoriteItem, 'addedAt'>[]): void {
    const currentItems = this.favoriteItems();
    const newItems: FavoriteItem[] = products
      .filter((product) => !currentItems.some((item) => item.productId === product.productId))
      .map((product) => ({
        ...product,
        addedAt: new Date(),
      }));

    if (newItems.length > 0) {
      this.favoriteItems.set([...currentItems, ...newItems]);
      this.saveFavoritesToStorage();
    }
  }

  removeMultipleFromFavorites(productIds: string[]): void {
    const updatedItems = this.favoriteItems().filter(
      (item) => !productIds.includes(item.productId)
    );
    this.favoriteItems.set(updatedItems);
    this.saveFavoritesToStorage();
  }

  clearFavorites(): void {
    this.favoriteItems.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
    this.deleteCookie(this.COOKIE_KEY);
  }

  isFavorite(productId: string): boolean {
    return this.favoriteItems().some((item) => item.productId === productId);
  }

  getFavoriteItem(productId: string): FavoriteItem | undefined {
    return this.favoriteItems().find((item) => item.productId === productId);
  }

  getFavoritesSorted(order: 'asc' | 'desc' = 'desc'): FavoriteItem[] {
    const items = [...this.favoriteItems()];
    return items.sort((a, b) => {
      const dateA = new Date(a.addedAt).getTime();
      const dateB = new Date(b.addedAt).getTime();
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

  getFavoritesByPriceRange(minPrice: number, maxPrice: number): FavoriteItem[] {
    return this.favoriteItems().filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }

  searchFavorites(query: string): FavoriteItem[] {
    const lowerQuery = query.toLowerCase();
    return this.favoriteItems().filter((item) => item.name.toLowerCase().includes(lowerQuery));
  }

  syncFavoritesWithBackend(): Observable<FavoriteSyncResponse> {
    return this.httpService
      .post<FavoriteSyncResponse>(`${this.api}/sync`, {
        items: this.favoriteItems(),
      })
      .pipe(
        tap((response: FavoriteSyncResponse) => {
          if (response.success && response.favorites) {
            this.favoriteItems.set(this.parseFavorites(response.favorites));
            this.saveFavoritesToStorage();
          }
        }),
        catchError((error) => {
          console.error('Error syncing favorites with backend:', error);
          return of({ success: false, favorites: this.favoriteItems() });
        })
      );
  }

  loadFavoritesFromBackend(): Observable<FavoriteItem[]> {
    return this.httpService.get<FavoriteItem[]>(`${this.api}`).pipe(
      tap((favorites: FavoriteItem[]) => {
        this.favoriteItems.set(this.parseFavorites(favorites));
        this.saveFavoritesToStorage();
      }),
      catchError((error) => {
        console.error('Error loading favorites from backend:', error);
        return of([]);
      })
    );
  }

  mergeFavoritesOnLogin(serverFavorites: FavoriteItem[]): void {
    const localFavorites = this.favoriteItems();
    const mergedMap = new Map<string, FavoriteItem>();

    // Add server favorites first
    serverFavorites.forEach((item) => {
      mergedMap.set(item.productId, item);
    });

    // Add local favorites (keep earlier addedAt date if duplicate)
    localFavorites.forEach((localItem) => {
      const existing = mergedMap.get(localItem.productId);
      if (existing) {
        const localDate = new Date(localItem.addedAt).getTime();
        const existingDate = new Date(existing.addedAt).getTime();
        if (localDate < existingDate) {
          mergedMap.set(localItem.productId, localItem);
        }
      } else {
        mergedMap.set(localItem.productId, localItem);
      }
    });

    const mergedFavorites = Array.from(mergedMap.values());
    this.favoriteItems.set(mergedFavorites);
    this.saveFavoritesToStorage();
    this.syncFavoritesWithBackend().subscribe();
  }

  exportFavorites(): string {
    return JSON.stringify(this.favoriteItems(), null, 2);
  }

  importFavorites(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString) as FavoriteItem[];
      const validItems = this.parseFavorites(imported);
      this.addMultipleToFavorites(validItems);
      return true;
    } catch (error) {
      console.error('Error importing favorites:', error);
      return false;
    }
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
      value
    )};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;Secure`;
  }
}
