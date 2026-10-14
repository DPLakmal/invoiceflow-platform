import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvoiceService } from '../../../core/services/invoice.service';
import { Invoice, InvoiceItem } from '../../../core/models/invoice.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="detail-page" *ngIf="invoice">
      <!-- Top Action Bar -->
      <div class="top-bar">
        <div class="top-bar-left">
          <a routerLink="/invoices" class="back-link">&larr; Back to Invoices</a>
          <div class="invoice-heading">
            <h1 class="invoice-title">
              {{ invoice.vendor_name_extracted || 'Invoice' }}
              <span class="invoice-num font-mono">#{{ invoice.invoice_number || 'UNASSIGNED' }}</span>
            </h1>
            <app-status-badge [status]="invoice.status"></app-status-badge>
          </div>
        </div>

        <div class="top-bar-actions">
          <button (click)="saveInvoice()" [disabled]="saving" class="btn btn-secondary">
            {{ saving ? 'Saving...' : 'Save Draft' }}
          </button>
          <button 
            *ngIf="invoice.status !== 'APPROVED'" 
            (click)="setStatus('APPROVED')" 
            class="btn btn-success">
            &check; Approve Invoice
          </button>
          <button 
            *ngIf="invoice.status === 'APPROVED'" 
            (click)="setStatus('PAID')" 
            class="btn btn-primary">
            Mark as Paid
          </button>
          <button 
            *ngIf="invoice.status !== 'REJECTED'" 
            (click)="setStatus('REJECTED')" 
            class="btn btn-danger">
            Reject
          </button>
        </div>
      </div>

      <!-- Validation Warning Banner (if low confidence or mismatch) -->
      <div *ngIf="invoice.confidence_score < 0.85 || isMathMismatch()" class="validation-banner">
        <div class="banner-icon">&excl;</div>
        <div class="banner-text">
          <span class="banner-title">Human Verification Recommended:</span>
          <span>
            OCR extraction confidence is {{ (invoice.confidence_score * 100) | number:'1.0-0' }}%. 
            Please verify line items and totals against the original document on the left before approving.
          </span>
        </div>
      </div>

      <!-- Split-Screen Workspace -->
      <div class="split-workspace">
        <!-- Left: Document Viewer -->
        <div class="card doc-viewer-pane">
          <div class="card-header doc-header">
            <span class="doc-title">Original Document: {{ invoice.file_name }}</span>
            <div class="doc-controls">
              <a [href]="documentUrl" target="_blank" class="btn btn-sm btn-secondary">
                Open in New Tab &nearr;
              </a>
            </div>
          </div>
          <div class="doc-frame-wrapper">
            <iframe 
              *ngIf="isPdf" 
              [src]="sanitizedDocUrl" 
              class="doc-iframe" 
              title="Invoice PDF Viewer">
            </iframe>
            <div *ngIf="!isPdf" class="image-viewer-container">
              <img [src]="documentUrl" alt="Invoice Image" class="doc-image">
            </div>
          </div>
        </div>

        <!-- Right: Structured Data Form -->
        <div class="card form-pane">
          <div class="card-header">
            <h2 class="card-title">Extracted Structured Fields</h2>
            <div class="confidence-tag">
              Confidence: <b>{{ (invoice.confidence_score * 100) | number:'1.0-0' }}%</b>
            </div>
          </div>

          <div class="card-body form-body">
            <!-- Header Metadata Fields -->
            <div class="fields-grid">
              <div class="form-group">
                <label class="form-label">Vendor Name</label>
                <input type="text" [(ngModel)]="invoice.vendor_name_extracted" class="form-input">
              </div>

              <div class="form-group">
                <label class="form-label">Invoice Number</label>
                <input type="text" [(ngModel)]="invoice.invoice_number" class="form-input font-mono">
              </div>

              <div class="form-group">
                <label class="form-label">P.O. Number</label>
                <input type="text" [(ngModel)]="invoice.po_number" class="form-input font-mono">
              </div>

              <div class="form-group">
                <label class="form-label">Currency</label>
                <select [(ngModel)]="invoice.currency" class="form-select">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Invoice Date</label>
                <input type="date" [(ngModel)]="invoice.invoice_date" class="form-input">
              </div>

              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" [(ngModel)]="invoice.due_date" class="form-input">
              </div>
            </div>

            <!-- Line Items Table -->
            <div class="line-items-section">
              <div class="section-header">
                <h3 class="section-title">Line Items ({{ invoice.items.length }})</h3>
                <button (click)="addLineItem()" class="btn btn-sm btn-secondary">
                  + Add Item
                </button>
              </div>

              <div class="table-container">
                <table class="table line-table">
                  <thead>
                    <tr>
                      <th style="width: 50%;">Description</th>
                      <th style="width: 15%;">Qty</th>
                      <th style="width: 15%;">Unit Price</th>
                      <th style="width: 15%;">Total</th>
                      <th style="width: 5%;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of invoice.items; let i = index">
                      <td>
                        <input type="text" [(ngModel)]="item.description" class="form-input form-input-sm">
                      </td>
                      <td>
                        <input 
                          type="number" 
                          [(ngModel)]="item.quantity" 
                          (ngModelChange)="recalculateRow(item)" 
                          class="form-input form-input-sm" 
                          step="0.5">
                      </td>
                      <td>
                        <input 
                          type="number" 
                          [(ngModel)]="item.unit_price" 
                          (ngModelChange)="recalculateRow(item)" 
                          class="form-input form-input-sm" 
                          step="0.01">
                      </td>
                      <td class="font-mono font-bold">
                        \${{ item.total_price | number:'1.2-2' }}
                      </td>
                      <td style="text-align: center;">
                        <button (click)="removeLineItem(i)" class="btn-icon-danger" title="Remove line">&times;</button>
                      </td>
                    </tr>
                    <tr *ngIf="invoice.items.length === 0">
                      <td colspan="5" style="text-align: center; color: var(--slate-400); padding: 1.5rem;">
                        No line items parsed. Click "+ Add Item" to input manually.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Totals -->
            <div class="totals-grid">
              <div class="notes-box">
                <label class="form-label">Reviewer Notes</label>
                <textarea 
                  [(ngModel)]="invoice.notes" 
                  rows="3" 
                  placeholder="Add approval notes or discrepancies for audit trail..." 
                  class="form-textarea">
                </textarea>
              </div>

              <div class="totals-summary-box">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <input 
                    type="number" 
                    [(ngModel)]="invoice.subtotal" 
                    (ngModelChange)="recalculateGrandTotal()" 
                    class="form-input form-input-sm total-input font-mono" 
                    step="0.01">
                </div>
                <div class="total-row">
                  <span>Tax Amount:</span>
                  <input 
                    type="number" 
                    [(ngModel)]="invoice.tax_amount" 
                    (ngModelChange)="recalculateGrandTotal()" 
                    class="form-input form-input-sm total-input font-mono" 
                    step="0.01">
                </div>
                <div class="total-row">
                  <span>Discount:</span>
                  <input 
                    type="number" 
                    [(ngModel)]="invoice.discount_amount" 
                    (ngModelChange)="recalculateGrandTotal()" 
                    class="form-input form-input-sm total-input font-mono" 
                    step="0.01">
                </div>
                <div class="total-row grand-total-row">
                  <span>Total Amount:</span>
                  <span class="grand-total-val">\${{ invoice.total_amount | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Audit Trail History -->
            <div *ngIf="invoice.audit_logs && invoice.audit_logs.length > 0" class="audit-section">
              <h4 class="section-title">Audit Log History</h4>
              <div class="audit-list">
                <div *ngFor="let log of invoice.audit_logs" class="audit-item">
                  <div class="audit-meta">
                    <span class="audit-action">{{ log.action }}</span>
                    <span class="audit-actor">by {{ log.actor }}</span>
                  </div>
                  <div class="audit-details">{{ log.details }}</div>
                  <div class="audit-time">{{ log.timestamp | date:'medium' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .back-link {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--slate-500);
      text-decoration: none;
      display: inline-block;
      margin-bottom: 0.25rem;
    }
    .back-link:hover { color: var(--primary); }
    .invoice-heading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .invoice-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--slate-900);
    }
    .invoice-num {
      color: var(--slate-500);
      font-size: 1.125rem;
      font-weight: 500;
    }
    .top-bar-actions {
      display: flex;
      gap: 0.5rem;
    }
    .validation-banner {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .banner-icon {
      width: 1.5rem;
      height: 1.5rem;
      background-color: #f59e0b;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.875rem;
    }
    .banner-title {
      font-weight: 700;
      color: #92400e;
      margin-right: 0.375rem;
    }
    .banner-text {
      font-size: 0.8125rem;
      color: #78350f;
    }
    .split-workspace {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      min-height: calc(100vh - 220px);
    }
    @media (max-width: 1100px) {
      .split-workspace { grid-template-columns: 1fr; }
    }
    .doc-viewer-pane {
      display: flex;
      flex-direction: column;
    }
    .doc-header {
      padding: 0.875rem 1.25rem;
    }
    .doc-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-700);
    }
    .doc-frame-wrapper {
      flex: 1;
      min-height: 650px;
      background-color: var(--slate-100);
      position: relative;
    }
    .doc-iframe {
      width: 100%;
      height: 100%;
      min-height: 650px;
      border: none;
    }
    .image-viewer-container {
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: auto;
      max-height: 750px;
    }
    .doc-image {
      max-width: 100%;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .form-pane {
      display: flex;
      flex-direction: column;
    }
    .form-body {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem;
    }
    .confidence-tag {
      font-size: 0.75rem;
      color: var(--slate-600);
      background-color: var(--slate-100);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
    }
    .line-items-section {
      border: 1px solid var(--slate-200);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .section-header {
      background-color: var(--slate-50);
      padding: 0.625rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--slate-200);
    }
    .section-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--slate-800);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .form-input-sm {
      padding: 0.25rem 0.5rem !important;
      font-size: 0.8125rem !important;
    }
    .btn-icon-danger {
      background: none;
      border: none;
      color: var(--danger);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
    }
    .btn-icon-danger:hover { color: #b91c1c; }
    .totals-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.25rem;
      align-items: flex-start;
    }
    .totals-summary-box {
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--slate-600);
    }
    .total-input {
      width: 100px !important;
      text-align: right;
    }
    .grand-total-row {
      border-top: 2px solid var(--slate-300);
      padding-top: 0.5rem;
      margin-top: 0.25rem;
      font-size: 1rem;
      font-weight: 800;
      color: var(--slate-900);
    }
    .grand-total-val {
      color: var(--primary);
    }
    .audit-section {
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--slate-200);
    }
    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .audit-item {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
      background-color: var(--slate-50);
      border-radius: 0.375rem;
      border-left: 3px solid var(--primary);
    }
    .audit-meta {
      display: flex;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--slate-800);
    }
    .audit-actor { color: var(--slate-500); font-weight: normal; }
    .audit-details { color: var(--slate-600); margin-top: 0.125rem; }
    .audit-time { color: var(--slate-400); font-size: 0.6875rem; margin-top: 0.25rem; }
  `]
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invoiceService = inject(InvoiceService);
  private sanitizer = inject(DomSanitizer);

  invoice: Invoice | null = null;
  saving = false;
  documentUrl = '';
  sanitizedDocUrl: SafeResourceUrl | null = null;
  isPdf = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
  }

  loadInvoice(id: string): void {
    this.invoiceService.getInvoice(id).subscribe({
      next: (data) => {
        this.invoice = data;
        this.documentUrl = this.invoiceService.getDocumentUrl(id);
        this.sanitizedDocUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentUrl);
        this.isPdf = data.file_type.includes('pdf') || data.file_name.toLowerCase().endsWith('.pdf');
      },
      error: (err) => {
        alert('Failed to load invoice: ' + (err.error?.detail || err.message));
        this.router.navigate(['/invoices']);
      }
    });
  }

  recalculateRow(item: InvoiceItem): void {
    item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
    this.recalculateFromItems();
  }

  recalculateFromItems(): void {
    if (!this.invoice) return;
    const sub = this.invoice.items.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
    this.invoice.subtotal = Number(sub.toFixed(2));
    this.recalculateGrandTotal();
  }

  recalculateGrandTotal(): void {
    if (!this.invoice) return;
    const total = (this.invoice.subtotal || 0) + (this.invoice.tax_amount || 0) - (this.invoice.discount_amount || 0);
    this.invoice.total_amount = Number(total.toFixed(2));
  }

  addLineItem(): void {
    if (!this.invoice) return;
    const nextNum = this.invoice.items.length + 1;
    this.invoice.items.push({
      line_number: nextNum,
      description: 'New Item',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    });
  }

  removeLineItem(index: number): void {
    if (!this.invoice) return;
    this.invoice.items.splice(index, 1);
    this.recalculateFromItems();
  }

  isMathMismatch(): boolean {
    if (!this.invoice) return false;
    const expected = Number(((this.invoice.subtotal || 0) + (this.invoice.tax_amount || 0) - (this.invoice.discount_amount || 0)).toFixed(2));
    return Math.abs(expected - (this.invoice.total_amount || 0)) > 0.05;
  }

  saveInvoice(): void {
    if (!this.invoice) return;
    this.saving = true;

    this.invoiceService.updateInvoice(this.invoice.id, this.invoice).subscribe({
      next: (updated) => {
        this.invoice = updated;
        this.saving = false;
        alert('Invoice changes saved successfully.');
      },
      error: (err) => {
        this.saving = false;
        alert('Failed to save changes: ' + (err.error?.detail || err.message));
      }
    });
  }

  setStatus(status: 'APPROVED' | 'REJECTED' | 'PAID'): void {
    if (!this.invoice) return;
    this.invoice.status = status;
    this.saveInvoice();
  }
}
