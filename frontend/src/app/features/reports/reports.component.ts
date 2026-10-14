import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { SpendByVendorItem, MonthlyTrendItem, DashboardSummary } from '../../core/models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reports-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Reports & Analytics</h1>
          <p class="page-subtitle">Aggregated accounts payable insights, vendor spend distribution, and historical monthly trends.</p>
        </div>
        <button (click)="exportCsv()" class="btn btn-primary">
          <svg style="width: 1rem; height: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV Report
        </button>
      </div>

      <!-- Quick Summary Cards -->
      <div class="summary-cards">
        <div class="stat-card">
          <span class="stat-label">Total Spend (YTD)</span>
          <span class="stat-val">\${{ summary?.total_spend | number:'1.2-2' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Invoices Processed</span>
          <span class="stat-val">{{ summary?.total_invoices || 0 }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Sales Tax</span>
          <span class="stat-val">\${{ summary?.total_tax | number:'1.2-2' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Average OCR Confidence</span>
          <span class="stat-val">{{ ((summary?.avg_confidence_score || 0) * 100) | number:'1.0-0' }}%</span>
        </div>
      </div>

      <!-- Main Analytics Layout -->
      <div class="analytics-grid">
        <!-- Spend By Vendor -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Top Vendors by Expenditure</h2>
          </div>
          <div class="card-body">
            <div class="vendor-list" *ngIf="vendorSpend.length > 0">
              <div *ngFor="let v of vendorSpend" class="vendor-item">
                <div class="vendor-meta">
                  <span class="vendor-name">{{ v.vendor_name }}</span>
                  <span class="vendor-count">({{ v.invoice_count }} {{ v.invoice_count === 1 ? 'invoice' : 'invoices' }})</span>
                  <span class="vendor-amount">\${{ v.total_amount | number:'1.2-2' }}</span>
                </div>
                <div class="progress-track" style="height: 0.5rem; margin-top: 0.375rem;">
                  <div class="progress-fill" [style.width.%]="getVendorPercent(v.total_amount)"></div>
                </div>
              </div>
            </div>
            <div *ngIf="vendorSpend.length === 0" class="empty-text">
              No vendor data accumulated yet.
            </div>
          </div>
        </div>

        <!-- Monthly Trends Table / Bars -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Monthly Spend Trends</h2>
          </div>
          <div class="card-body">
            <div class="monthly-list" *ngIf="monthlyTrends.length > 0">
              <div *ngFor="let m of monthlyTrends" class="month-row">
                <div class="month-label font-mono">{{ m.month }}</div>
                <div class="month-bar-wrapper">
                  <div class="month-bar-fill" [style.width.%]="getMonthPercent(m.total_amount)"></div>
                </div>
                <div class="month-amount">\${{ m.total_amount | number:'1.2-2' }}</div>
              </div>
            </div>
            <div *ngIf="monthlyTrends.length === 0" class="empty-text">
              No monthly trend data recorded yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page {
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
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background-color: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--slate-500);
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--slate-900);
    }
    .analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .analytics-grid { grid-template-columns: 1fr; }
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--slate-900);
    }
    .vendor-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .vendor-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
    }
    .vendor-name { font-weight: 600; color: var(--slate-800); }
    .vendor-count { color: var(--slate-500); font-size: 0.75rem; margin-left: 0.5rem; }
    .vendor-amount { font-weight: 700; color: var(--slate-900); }
    .monthly-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .month-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.8125rem;
    }
    .month-label { width: 70px; color: var(--slate-600); }
    .month-bar-wrapper {
      flex: 1;
      height: 1.25rem;
      background-color: var(--slate-100);
      border-radius: 0.25rem;
      overflow: hidden;
    }
    .month-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 0.25rem;
    }
    .month-amount {
      width: 90px;
      text-align: right;
      font-weight: 700;
      color: var(--slate-800);
    }
    .empty-text {
      text-align: center;
      color: var(--slate-400);
      padding: 2rem;
    }
  `]
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);

  summary: DashboardSummary | null = null;
  vendorSpend: SpendByVendorItem[] = [];
  monthlyTrends: MonthlyTrendItem[] = [];
  maxVendorSpend = 1;
  maxMonthlySpend = 1;

  ngOnInit(): void {
    this.reportService.getSummary().subscribe(s => this.summary = s);
    this.reportService.getSpendByVendor(10).subscribe(data => {
      this.vendorSpend = data;
      this.maxVendorSpend = Math.max(...data.map(v => v.total_amount), 1);
    });
    this.reportService.getMonthlyTrends().subscribe(trends => {
      this.monthlyTrends = trends;
      this.maxMonthlySpend = Math.max(...trends.map(m => m.total_amount), 1);
    });
  }

  getVendorPercent(amount: number): number {
    return (amount / this.maxVendorSpend) * 100;
  }

  getMonthPercent(amount: number): number {
    return (amount / this.maxMonthlySpend) * 100;
  }

  exportCsv(): void {
    this.reportService.downloadCsv();
  }
}
