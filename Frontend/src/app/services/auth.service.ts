import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_user';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry';
  private readonly DEFAULT_TOKEN_EXPIRY = 30 * 24 * 60 * 60;
  private api = 'http://localhost:5000/api/v1/';
  private clientID = '435599770187-ev5gsvsfq1u560msf7upaonval162erj.apps.googleusercontent.com ';

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const userJson = localStorage.getItem(this.STORAGE_KEY);
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (userJson && token && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        this.currentUser.set(JSON.parse(userJson));
        this.isAuthenticated.set(true);
      } else {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.api + 'auth/signin', { email, password }).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => {
        console.error('Login failed', err);
        return throwError(() => err);
      })
    );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.api + 'auth/register', { name, email, password }).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => {
        console.error('Register failed', err);
        return throwError(() => err);
      })
    );
  }

  loginWithGoogle(buttonElementId?: string) {
    if (!(window as any).google) {
      console.error('Google Identity Service not loaded');
      return;
    }

    (window as any).google.accounts.id.initialize({
      client_id: this.clientID,
      callback: (response: any) => this.handleGoogleToken(response),
    });

    if (buttonElementId) {
      const buttonElement = document.getElementById(buttonElementId);
      if (buttonElement) {
        (window as any).google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          width: '100%',
        });
      }
    } else {
      (window as any).google.accounts.id.prompt();
    }
  }

  loginWithGoogleBackend(token: string) {
    return this.http.post<AuthResponse>(this.api + 'auth/google', { token }).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        console.error('Google login backend failed:', error);
        return throwError(() => error);
      })
    );
  }

  handleGoogleToken(response: any) {
    const token = response.credential;
    this.http
      .post<AuthResponse>(this.api + 'auth/google', { token })
      .pipe(
        tap((res) => this.handleAuthSuccess(res)),
        catchError((err) => {
          console.error('Google login failed', err);
          return of(null);
        })
      )
      .subscribe();
  }

  private handleAuthSuccess(res: AuthResponse) {
    this.currentUser.set(res.user);
    this.isAuthenticated.set(true);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.user));
    localStorage.setItem(this.TOKEN_KEY, res.token);

    const expiryInSeconds = res.expiresIn || this.DEFAULT_TOKEN_EXPIRY;
    const expiryDate = new Date().getTime() + expiryInSeconds * 1000;
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryDate.toString());

    document.cookie = `auth_token=${res.token}; path=/; max-age=${expiryInSeconds}; Secure; SameSite=Strict`;
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.api + 'auth/refresh', {}).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => {
        console.error('Token refresh failed', err);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isTokenExpiringSoon(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return false;
    const expiryTime = parseInt(expiry, 10);
    const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
    return expiryTime < oneDayFromNow;
  }

  isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    const expiryTime = parseInt(expiry, 10);
    return Date.now() >= expiryTime;
  }

  verifySession(): Observable<boolean> {
    return this.http.get<{ valid: boolean }>(this.api + 'auth/verify').pipe(
      tap((res) => {
        if (!res.valid) {
          this.logout();
        }
      }),
      catchError(() => {
        this.logout();
        return of(false);
      }),
      map((res) => (typeof res === 'boolean' ? res : res.valid))
    );
  }

  updateUserProfile(updates: Partial<User>): Observable<User> {
    return this.http.patch<User>(this.api + 'users/me', updates).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      }),
      catchError((err) => {
        console.error('Profile update failed', err);
        return throwError(() => err);
      })
    );
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return '';

    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  logout() {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    document.cookie = 'auth_token=; path=/; max-age=0';
    this.router.navigate(['/']);
  }
}
