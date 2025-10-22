import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { Home } from './components/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', component: DashboardComponent }
];
