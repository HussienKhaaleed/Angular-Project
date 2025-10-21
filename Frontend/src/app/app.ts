import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PrimeNG } from 'primeng/config';
import { Navbar } from './components/navbar/navbar';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Navbar,
    RouterModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    CardModule,
    ProgressSpinnerModule,
    TagModule,
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
