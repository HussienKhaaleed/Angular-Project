// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { DashboardComponent } from './dashboard.component';
// import { TmdbService } from '../services/tmdb.service';
// import { of } from 'rxjs';

// describe('DashboardComponent', () => {
//   let component: DashboardComponent;
//   let fixture: ComponentFixture<DashboardComponent>;
//   let mockTmdbService: jasmine.SpyObj<TmdbService>;

//   beforeEach(async () => {
//     mockTmdbService = jasmine.createSpyObj('TmdbService', ['discoverMovies']);

//     await TestBed.configureTestingModule({
//       declarations: [DashboardComponent],
//       providers: [
//         { provide: TmdbService, useValue: mockTmdbService }
//       ]
//     }).compileComponents();

//     fixture = TestBed.createComponent(DashboardComponent);
//     component = fixture.componentInstance;
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('should load movies on init', () => {
//     const mockMovies = [{ id: 1, title: 'Test Movie', posterUrl: 'test.jpg', voteAverage: 8.5 }];
//     mockTmdbService.discoverMovies.and.returnValue(of(mockMovies));

//     fixture.detectChanges();

//     expect(mockTmdbService.discoverMovies).toHaveBeenCalled();
//   });

//   it('should return correct vote color', () => {
//     expect(component.getVoteColor(8.5)).toBe('#22c55e'); // Green for >= 8
//     expect(component.getVoteColor(7.5)).toBe('#3b82f6'); // Blue for >= 7
//     expect(component.getVoteColor(6.5)).toBe('#eab308'); // Yellow for >= 6
//     expect(component.getVoteColor(5.5)).toBe('#ef4444'); // Red for < 6
//   });
// });