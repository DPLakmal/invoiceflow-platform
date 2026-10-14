import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <div class="nav-container">
        <!-- Brand -->
        <a routerLink="/" class="brand">
          <div class="logo-box">
            <svg class="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">InvoiceFlow</span>
            <span class="brand-subtitle">OCR & Pipeline</span>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            Dashboard
          </a>
          <a routerLink="/invoices" routerLinkActive="active" class="nav-link">
            Invoices
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-link">
            Analytics
          </a>
          <a routerLink="/jobs" routerLinkActive="active" class="nav-link">
            Pipeline Jobs
          </a>
        </nav>

        <!-- Action & Status -->
        <div class="nav-actions">
          <div class="pipeline-pill">
            <span class="pulse-indicator"></span>
            <span>Celery Worker Live</span>
          </div>

          <button (click)="openUpload.emit()" class="btn btn-primary">
            <svg style="width: 1rem; height: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload Invoice</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      background-color: #ffffff;
      border-bottom: 1px solid var(--slate-200);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }
    .logo-box {
      width: 2.25rem;
      height: 2.25rem;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .logo-icon {
      width: 1.25rem;
      height: 1.25rem;
    }
    .brand-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--slate-900);
      letter-spacing: -0.025em;
      display: block;
      line-height: 1.2;
    }
    .brand-subtitle {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nav-link {
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--slate-600);
      text-decoration: none;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
    }
    .nav-link:hover {
      color: var(--slate-900);
      background-color: var(--slate-100);
    }
    .nav-link.active {
      color: var(--primary);
      background-color: var(--primary-light);
      font-weight: 600;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .pipeline-pill {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--slate-600);
      background-color: var(--slate-100);
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      border: 1px solid var(--slate-200);
    }
    .pulse-indicator {
      width: 6px;
      height: 6px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }
  `]
})
export class NavbarComponent {
  @Output() openUpload = new EventEmitter<void>();
}
