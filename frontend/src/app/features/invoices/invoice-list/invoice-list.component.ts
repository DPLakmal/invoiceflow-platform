import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InvoiceService } from '../../../core/services/invoice.service';
import { InvoiceSummary } from '../../../core/models/invoice.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="list-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Invoices Explorer</h1>
          <p class="page-subtitle">Search, filter, review, and manage all parsed invoices and receipts.</p>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card toolbar-card">
        <div class="toolbar">
          <!-- Search input -->
          <div class="search-box">
            <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (keyup.enter)="onSearch()" 
              placeholder="Search by vendor, invoice #, PO #, or file name..." 
              class="form-input search-input">
          </div>

          <!-- Status Filter Dropdown -->
          <div class="filter-group">
            <select [(ngModel)]="selectedStatus" (change)="onFilterChange()" class="form-select filter-select">
              <option value="">All Statuses</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <button (click)="onSearch()" class="btn btn-primary">
            Filter
          </button>
          <button (click)="resetFilters()" class="btn btn-secondary">
            Reset
          </button>
        </div>
      </div>

      <!-- Invoices Table Card -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Vendor / File</th>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Confidence</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td>
                  <div class="vendor-block">
                    <span class="vendor-name">{{ inv.vendor_name_extracted || 'Unidentified Vendor' }}</span>
                    <span class="file-name">{{ inv.file_name }}</span>
                  </div>
                </td>
                <td class="font-mono">{{ inv.invoice_number || 'N/A' }}</td>
                <td>{{ inv.invoice_date || '-' }}</td>
                <td>{{ inv.due_date || '-' }}</td>
                <td class="amount-cell">\${{ inv.total_amount | number:'1.2-2' }}</td>
                <td>
                  <div class="conf-box">
                    <span class="conf-pct">{{ (inv.confidence_score * 100) | number:'1.0-0' }}%</span>
                  </div>
                </td>
                <td>
                  <app-status-badge [status]="inv.status"></app-status-badge>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <a [routerLink]="['/invoices', inv.id]" class="btn btn-sm btn-primary">
                      Review & Edit
                    </a>
                    <button (click)="deleteInvoice(inv.id)" class="btn btn-sm btn-danger">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="invoices.length === 0">
                <td colspan="8" class="empty-state">
                  No invoices matched your filter criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="card-footer pagination-bar">
          <span class="page-info">
            Showing {{ (page - 1) * pageSize + (invoices.length ? 1 : 0) }} to {{ (page - 1) * pageSize + invoices.length }} of {{ total }} invoices
          </span>
          <div class="pagination-controls">
            <button (click)="changePage(page - 1)" [disabled]="page <= 1" class="btn btn-sm btn-secondary">
              &larr; Previous
            </button>
            <span class="current-page">Page {{ page }} of {{ totalPages }}</span>
            <button (click)="changePage(page + 1)" [disabled]="page >= totalPages" class="btn btn-sm btn-secondary">
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .list-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.025em;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
    .toolbar-card {
      padding: 1rem 1.25rem;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.125rem;
      height: 1.125rem;
      color: var(--slate-400);
    }
    .search-input {
      padding-left: 2.375rem !important;
    }
    .filter-select {
      min-width: 170px;
    }
    .vendor-block {
      display: flex;
      flex-direction: column;
    }
    .vendor-name {
      font-weight: 600;
      color: var(--slate-800);
    }
    .file-name {
      font-size: 0.75rem;
      color: var(--slate-500);
    }
    .font-mono {
      font-family: monospace;
      font-size: 0.8125rem;
    }
    .amount-cell {
      font-weight: 700;
      color: var(--slate-900);
    }
    .conf-box {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--slate-600);
    }
    .action-buttons {
      display: inline-flex;
      gap: 0.5rem;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem !important;
      color: var(--slate-500);
    }
    .pagination-bar {
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--slate-200);
    }
    .page-info {
      font-size: 0.8125rem;
      color: var(--slate-500);
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .current-page {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--slate-700);
    }
  `]
})
export class InvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);

  invoices: InvoiceSummary[] = [];
  searchQuery = '';
  selectedStatus = '';
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getInvoices({
      page: this.page,
      pageSize: this.pageSize,
      search: this.searchQuery || undefined,
      status: this.selectedStatus || undefined,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }).subscribe({
      next: (res) => {
        this.invoices = res.items;
        this.total = res.total;
        this.totalPages = res.total_pages;
      },
      error: (err) => console.error('Failed to load invoices', err)
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadInvoices();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadInvoices();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.page = 1;
    this.loadInvoices();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadInvoices();
    }
  }

  deleteInvoice(id: string): void {
    if (confirm('Are you sure you want to delete this invoice and its file?')) {
      this.invoiceService.deleteInvoice(id).subscribe({
        next: () => this.loadInvoices(),
        error: (err) => alert('Failed to delete invoice: ' + (err.error?.detail || err.message))
      });
    }
  }
}
