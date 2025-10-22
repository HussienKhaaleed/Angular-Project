import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private api = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpService) {}

  createCheckoutSession(items: Array<{ movieId: string, ticketsCount: number, showTime: string }>): Observable<{ status: string; sessionUrl: string }> {
    return this.http.post<{ status: string; sessionUrl: string }>(`${this.api}/create-checkout-session`, {
      items,
    });
  }
}
