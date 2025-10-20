import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PrimeNG } from 'primeng/config';
import { Navbar } from './components/navbar/navbar';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Navbar,
    RouterModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
    constructor(private primeng: PrimeNG) {}
    ngOnInit() {
        this.primeng.ripple.set(true);
    }
}
