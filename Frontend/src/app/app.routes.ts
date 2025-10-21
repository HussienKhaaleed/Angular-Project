import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { DashboardComponent } from './dashboard/dashboard.component';


export const routes: Routes = [
  { path: '', component: Home},
  { path: 'dashboard', component: DashboardComponent },
];
