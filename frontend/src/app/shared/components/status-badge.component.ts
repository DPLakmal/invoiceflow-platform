import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [ngClass]="getBadgeClass()" class="badge">
      <span class="dot" [ngClass]="getDotClass()"></span>
      {{ formatStatus(status) }}
    </span>
  `,
  styles: [`
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-pending { background-color: #64748b; }
    .dot-extracted { background-color: #2563eb; }
    .dot-review { background-color: #f59e0b; }
    .dot-approved { background-color: #10b981; }
    .dot-rejected { background-color: #ef4444; }
    .dot-paid { background-color: #8b5cf6; }
  `]
})
export class StatusBadgeComponent {
  @Input() status: string = 'PENDING';

  formatStatus(status: string): string {
    return status ? status.replace('_', ' ') : 'UNKNOWN';
  }

  getBadgeClass(): string {
    switch (this.status) {
      case 'APPROVED': return 'badge-approved';
      case 'REVIEW_REQUIRED': return 'badge-review';
      case 'EXTRACTED': return 'badge-extracted';
      case 'PAID': return 'badge-paid';
      case 'REJECTED':
      case 'FAILED': return 'badge-rejected';
      default: return 'badge-pending';
    }
  }

  getDotClass(): string {
    switch (this.status) {
      case 'APPROVED': return 'dot-approved';
      case 'REVIEW_REQUIRED': return 'dot-review';
      case 'EXTRACTED': return 'dot-extracted';
      case 'PAID': return 'dot-paid';
      case 'REJECTED':
      case 'FAILED': return 'dot-rejected';
      default: return 'dot-pending';
    }
  }
}
