import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';
import { UploadModalComponent } from './features/upload/upload-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, UploadModalComponent],
  template: `
    <div class="app-container">
      <app-navbar (openUpload)="isUploadOpen = true"></app-navbar>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <app-upload-modal 
        *ngIf="isUploadOpen" 
        (close)="isUploadOpen = false" 
        (uploadFinished)="onUploadDone()">
      </app-upload-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  isUploadOpen = false;

  onUploadDone(): void {
    // Optionally trigger events or notifications
  }
}
