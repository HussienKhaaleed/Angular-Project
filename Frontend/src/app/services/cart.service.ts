import { computed, Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpService } from './http.service';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock?: number;
}

export interface CartSyncResponse {
  success: boolean;
  cart: CartItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'cart';
  private readonly CART_COOKIE_KEY = 'cart';
  private readonly COOKIE_EXPIRY_DAYS = 7;
  private readonly MAX_QUANTITY_PER_ITEM = 99;
  private api = `${environment.apiUrl}/cart`;

  private cartItems = signal<CartItem[]>([]);

  cartCount = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  cartTotal = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0);
  });

  constructor(private httpService: HttpService) {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage(): void {
    try {
      const cartJson = localStorage.getItem(this.CART_STORAGE_KEY);

      if (!cartJson) {
        const cookieCart = this.getCookie(this.CART_COOKIE_KEY);
        if (cookieCart) {
          const cart = JSON.parse(cookieCart) as CartItem[];
          this.cartItems.set(cart);
          return;
        }
      }

      if (cartJson) {
        const cart = JSON.parse(cartJson) as CartItem[];
        this.cartItems.set(cart);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.cartItems.set([]);
    }
  }

  private saveCartToStorage(): void {
    try {
      const cartData = this.cartItems();
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
      this.setCookie(this.CART_COOKIE_KEY, JSON.stringify(cartData), this.COOKIE_EXPIRY_DAYS);
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  getCartItems(): CartItem[] {
    return this.cartItems();
  }

  addToCart(product: Omit<CartItem, 'quantity'>, quantity: number = 1): void {
    const currentItems = this.cartItems();
    const existingItemIndex = currentItems.findIndex(
      (item) => item.productId === product.productId
    );

    if (existingItemIndex > -1) {
      const existingItem = currentItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;

      // Check max stock limit
      if (product.maxStock && newQuantity > product.maxStock) {
        console.warn(`Cannot add more. Max stock: ${product.maxStock}`);
        return;
      }

      // Check max quantity limit
      if (newQuantity > this.MAX_QUANTITY_PER_ITEM) {
        console.warn(`Cannot add more. Max quantity per item: ${this.MAX_QUANTITY_PER_ITEM}`);
        return;
      }

      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity,
      };
      this.cartItems.set(updatedItems);
    } else {
      // Check if quantity exceeds limits
      if (product.maxStock && quantity > product.maxStock) {
        console.warn(`Cannot add. Max stock: ${product.maxStock}`);
        return;
      }

      if (quantity > this.MAX_QUANTITY_PER_ITEM) {
        console.warn(`Cannot add. Max quantity: ${this.MAX_QUANTITY_PER_ITEM}`);
        return;
      }

      this.cartItems.set([...currentItems, { ...product, quantity }]);
    }

    this.saveCartToStorage();
  }

  removeFromCart(productId: string): void {
    const updatedItems = this.cartItems().filter((item) => item.productId !== productId);
    this.cartItems.set(updatedItems);
    this.saveCartToStorage();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    if (quantity > this.MAX_QUANTITY_PER_ITEM) {
      console.warn(`Max quantity is ${this.MAX_QUANTITY_PER_ITEM}`);
      return;
    }

    const currentItems = this.cartItems();
    const itemIndex = currentItems.findIndex((item) => item.productId === productId);

    if (itemIndex > -1) {
      const item = currentItems[itemIndex];

      // Check max stock
      if (item.maxStock && quantity > item.maxStock) {
        console.warn(`Max stock available: ${item.maxStock}`);
        return;
      }

      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity,
      };
      this.cartItems.set(updatedItems);
      this.saveCartToStorage();
    }
  }

  incrementQuantity(productId: string): void {
    const item = this.cartItems().find((item) => item.productId === productId);
    if (item) {
      this.updateQuantity(productId, item.quantity + 1);
    }
  }

  decrementQuantity(productId: string): void {
    const item = this.cartItems().find((item) => item.productId === productId);
    if (item) {
      this.updateQuantity(productId, item.quantity - 1);
    }
  }

  clearCart(): void {
    this.cartItems.set([]);
    localStorage.removeItem(this.CART_STORAGE_KEY);
    this.deleteCookie(this.CART_COOKIE_KEY);
  }

  isInCart(productId: string): boolean {
    return this.cartItems().some((item) => item.productId === productId);
  }

  getItemQuantity(productId: string): number {
    const item = this.cartItems().find((item) => item.productId === productId);
    return item ? item.quantity : 0;
  }

  getCartItem(productId: string): CartItem | undefined {
    return this.cartItems().find((item) => item.productId === productId);
  }

  syncCartWithBackend(): Observable<CartSyncResponse> {
    return this.httpService
      .post<CartSyncResponse>(`${this.api}/sync`, {
        items: this.cartItems(),
      })
      .pipe(
        tap((response: CartSyncResponse) => {
          if (response.success && response.cart) {
            this.cartItems.set(response.cart);
            this.saveCartToStorage();
          }
        }),
        catchError((error) => {
          console.error('Error syncing cart with backend:', error);
          return of({ success: false, cart: this.cartItems() });
        })
      );
  }

  loadCartFromBackend(): Observable<CartItem[]> {
    return this.httpService.get<CartItem[]>(`${this.api}`).pipe(
      tap((cart: CartItem[]) => {
        this.cartItems.set(cart);
        this.saveCartToStorage();
      }),
      catchError((error) => {
        console.error('Error loading cart from backend:', error);
        return of([]);
      })
    );
  }

  mergeCartOnLogin(serverCart: CartItem[]): void {
    const localCart = this.cartItems();
    const mergedCart: CartItem[] = [...serverCart];

    localCart.forEach((localItem) => {
      const existingIndex = mergedCart.findIndex((item) => item.productId === localItem.productId);

      if (existingIndex > -1) {
        // Item exists in both, combine quantities
        const combinedQuantity = mergedCart[existingIndex].quantity + localItem.quantity;
        const maxQuantity = Math.min(
          combinedQuantity,
          localItem.maxStock || this.MAX_QUANTITY_PER_ITEM,
          this.MAX_QUANTITY_PER_ITEM
        );
        mergedCart[existingIndex].quantity = maxQuantity;
      } else {
        // Item only in local cart, add it
        mergedCart.push(localItem);
      }
    });

    this.cartItems.set(mergedCart);
    this.saveCartToStorage();
    this.syncCartWithBackend().subscribe();
  }

  validateCart(): Observable<{ valid: boolean; invalidItems: string[] }> {
    return this.httpService
      .post<{ valid: boolean; invalidItems: string[] }>(`${this.api}/validate`, {
        items: this.cartItems(),
      })
      .pipe(
        tap((response: { valid: boolean; invalidItems: string[] }) => {
          if (!response.valid && response.invalidItems.length > 0) {
            // Remove invalid items
            response.invalidItems.forEach((productId: string) => {
              this.removeFromCart(productId);
            });
          }
        }),
        catchError((error) => {
          console.error('Error validating cart:', error);
          return of({ valid: true, invalidItems: [] });
        })
      );
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
