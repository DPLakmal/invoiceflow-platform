import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { DashboardSummary } from '../../core/models/report.model';
import { InvoiceSummary } from '../../core/models/invoice.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="dashboard-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Executive Dashboard</h1>
          <p class="page-subtitle">Real-time overview of document ingestion, processing queue, and invoice financial metrics.</p>
        </div>
        <div class="header-actions">
          <button (click)="exportReport()" class="btn btn-secondary">
            <svg style="width: 1rem; height: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <!-- Total Spend -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Spend</span>
            <div class="kpi-icon-box bg-blue">
              <svg class="kpi-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">\${{ summary?.total_spend | number:'1.2-2' }}</div>
          <div class="kpi-subtext">Tax Accrued: \${{ summary?.total_tax | number:'1.2-2' }}</div>
        </div>

        <!-- Invoices Volume -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Invoices</span>
            <div class="kpi-icon-box bg-slate">
              <svg class="kpi-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ summary?.total_invoices || 0 }}</div>
          <div class="kpi-subtext">
            <span>{{ summary?.approved || 0 }} Approved</span> &bull; 
            <span>{{ summary?.paid || 0 }} Paid</span>
          </div>
        </div>

        <!-- Pending Review -->
        <div class="kpi-card" [class.kpi-alert]="(summary?.review_required || 0) > 0">
          <div class="kpi-header">
            <span class="kpi-label">Review Required</span>
            <div class="kpi-icon-box bg-amber">
              <svg class="kpi-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ summary?.review_required || 0 }}</div>
          <div class="kpi-subtext">
            <span *ngIf="(summary?.review_required || 0) > 0">Attention required for low confidence or discrepancies</span>
            <span *ngIf="(summary?.review_required || 0) === 0">All invoices verified</span>
          </div>
        </div>

        <!-- OCR Success Rate -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Pipeline Success Rate</span>
            <div class="kpi-icon-box bg-emerald">
              <svg class="kpi-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ summary?.success_rate_pct || 100 }}%</div>
          <div class="kpi-subtext">Avg Confidence: {{ ((summary?.avg_confidence_score || 0) * 100) | number:'1.0-0' }}%</div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Recent Invoices Table -->
        <div class="card recent-invoices-card">
          <div class="card-header">
            <h2 class="card-title">Recent Invoices</h2>
            <a routerLink="/invoices" class="view-all-link">View all &rarr;</a>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inv of recentInvoices">
                  <td>
                    <div class="vendor-cell">
                      <span class="vendor-name">{{ inv.vendor_name_extracted || 'Unidentified Vendor' }}</span>
                      <span class="file-cell">{{ inv.file_name }}</span>
                    </div>
                  </td>
                  <td class="font-mono">{{ inv.invoice_number || 'N/A' }}</td>
                  <td>{{ inv.invoice_date || (inv.created_at | date:'yyyy-MM-dd') }}</td>
                  <td class="font-bold">\${{ inv.total_amount | number:'1.2-2' }}</td>
                  <td>
                    <div class="confidence-indicator">
                      <div class="conf-bar-track">
                        <div class="conf-bar-fill" [style.width.%]="inv.confidence_score * 100"></div>
                      </div>
                      <span>{{ (inv.confidence_score * 100) | number:'1.0-0' }}%</span>
                    </div>
                  </td>
                  <td>
                    <app-status-badge [status]="inv.status"></app-status-badge>
                  </td>
                  <td>
                    <a [routerLink]="['/invoices', inv.id]" class="btn btn-sm btn-secondary">
                      Review
                    </a>
                  </td>
                </tr>
                <tr *ngIf="recentInvoices.length === 0">
                  <td colspan="7" class="empty-cell">
                    No invoices uploaded yet. Click <b>Upload Invoice</b> above to process your first document!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Status Breakdown / Pipeline Info Card -->
        <div class="card status-card">
          <div class="card-header">
            <h2 class="card-title">Status Breakdown</h2>
          </div>
          <div class="card-body">
            <div class="breakdown-list">
              <div class="breakdown-item">
                <div class="breakdown-label">
                  <span>Approved & Paid</span>
                  <span>{{ (summary?.approved || 0) + (summary?.paid || 0) }}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="getPercent((summary?.approved || 0) + (summary?.paid || 0))" style="background-color: #10b981;"></div>
                </div>
              </div>

              <div class="breakdown-item">
                <div class="breakdown-label">
                  <span>Pending / Review Required</span>
                  <span>{{ (summary?.pending_processing || 0) + (summary?.review_required || 0) }}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="getPercent((summary?.pending_processing || 0) + (summary?.review_required || 0))" style="background-color: #f59e0b;"></div>
                </div>
              </div>

              <div class="breakdown-item">
                <div class="breakdown-label">
                  <span>Rejected</span>
                  <span>{{ summary?.rejected || 0 }}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="getPercent(summary?.rejected || 0)" style="background-color: #ef4444;"></div>
                </div>
              </div>
            </div>

            <!-- Pipeline Specs box -->
            <div class="pipeline-spec-box">
              <h4 class="spec-title">Pipeline Architecture</h4>
              <ul class="spec-list">
                <li>&bull; <b>Worker:</b> Celery 5.4 Pool</li>
                <li>&bull; <b>Broker:</b> Redis 7 Queue</li>
                <li>&bull; <b>OCR Engine:</b> Dual-path (PDF + Tesseract)</li>
                <li>&bull; <b>Retry Policy:</b> 3x Exponential Backoff</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }
    .kpi-card {
      background-color: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .kpi-alert {
      border-color: #fde68a;
      background-color: #fffdf5;
    }
    .kpi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .kpi-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--slate-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-icon-box {
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bg-blue { background-color: #dbeafe; color: #2563eb; }
    .bg-slate { background-color: #e2e8f0; color: #475569; }
    .bg-amber { background-color: #fef3c7; color: #d97706; }
    .bg-emerald { background-color: #d1fae5; color: #059669; }
    .kpi-icon { width: 1.125rem; height: 1.125rem; }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--slate-900);
      line-height: 1.2;
    }
    .kpi-subtext {
      font-size: 0.75rem;
      color: var(--slate-500);
      margin-top: 0.375rem;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--slate-900);
    }
    .view-all-link {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }
    .view-all-link:hover { text-decoration: underline; }
    .vendor-cell { display: flex; flex-direction: column; }
    .vendor-name { font-weight: 600; color: var(--slate-800); }
    .file-cell { font-size: 0.75rem; color: var(--slate-500); }
    .font-mono { font-family: monospace; font-size: 0.8125rem; }
    .font-bold { font-weight: 700; }
    .confidence-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .conf-bar-track {
      width: 40px;
      height: 6px;
      background-color: var(--slate-200);
      border-radius: 9999px;
      overflow: hidden;
    }
    .conf-bar-fill {
      height: 100%;
      background-color: #10b981;
      border-radius: 9999px;
    }
    .empty-cell {
      text-align: center;
      padding: 3rem 1rem !important;
      color: var(--slate-500);
    }
    .breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .breakdown-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--slate-700);
      margin-bottom: 0.375rem;
    }
    .pipeline-spec-box {
      margin-top: 1.5rem;
      padding: 1rem;
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 0.5rem;
    }
    .spec-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--slate-800);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .spec-list {
      list-style: none;
      font-size: 0.75rem;
      color: var(--slate-600);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);
  private invoiceService = inject(InvoiceService);

  summary: DashboardSummary | null = null;
  recentInvoices: InvoiceSummary[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.reportService.getSummary().subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Error loading dashboard summary', err)
    });

    this.invoiceService.getInvoices({ page: 1, pageSize: 6, sortBy: 'created_at', sortOrder: 'desc' }).subscribe({
      next: (res) => this.recentInvoices = res.items,
      error: (err) => console.error('Error loading recent invoices', err)
    });
  }

  exportReport(): void {
    this.reportService.downloadCsv();
  }

  getPercent(val: number): number {
    if (!this.summary || this.summary.total_invoices === 0) return 0;
    return (val / this.summary.total_invoices) * 100;
  }
}
