import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { ProcessingJob } from '../../core/models/job.model';

@Component({
  selector: 'app-jobs-monitor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="jobs-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Background Pipeline Jobs</h1>
          <p class="page-subtitle">Real-time status of Celery worker tasks, OCR execution pipeline, and automatic retries.</p>
        </div>
        <div class="header-actions">
          <button (click)="loadJobs()" class="btn btn-secondary">
            <svg style="width: 1rem; height: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Jobs Table Card -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Job / Task ID</th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Pipeline Stage</th>
                <th>Progress</th>
                <th>Retries</th>
                <th>Created</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let job of jobs">
                <td>
                  <div class="id-cell">
                    <span class="job-id font-mono">{{ job.id.substring(0, 8) }}...</span>
                    <span class="task-id font-mono">{{ job.task_id ? 'Celery: ' + job.task_id.substring(0, 8) + '...' : 'Queue pending' }}</span>
                  </div>
                </td>
                <td>
                  <a [routerLink]="['/invoices', job.invoice_id]" class="invoice-link">
                    Invoice &rarr;
                  </a>
                </td>
                <td>
                  <span class="stage-tag" [ngClass]="getStatusClass(job.status)">
                    {{ job.status }}
                  </span>
                </td>
                <td>
                  <span class="font-mono text-sm">{{ job.stage }}</span>
                </td>
                <td>
                  <div class="progress-box">
                    <div class="progress-track" style="width: 80px;">
                      <div 
                        class="progress-fill" 
                        [style.width.%]="job.progress_pct"
                        [style.background-color]="job.status === 'FAILED' ? '#ef4444' : '#2563eb'">
                      </div>
                    </div>
                    <span class="progress-text">{{ job.progress_pct }}%</span>
                  </div>
                </td>
                <td>
                  <span [class.text-danger]="job.retry_count > 0">
                    {{ job.retry_count }} / {{ job.max_retries }}
                  </span>
                </td>
                <td class="text-sm text-slate-500">
                  {{ job.created_at | date:'short' }}
                </td>
                <td style="text-align: right;">
                  <button 
                    *ngIf="job.status === 'FAILED' || job.status === 'RETRYING'" 
                    (click)="retryJob(job.id)" 
                    class="btn btn-sm btn-primary">
                    Retry Task
                  </button>
                  <button 
                    *ngIf="job.error_traceback" 
                    (click)="toggleError(job.id)" 
                    class="btn btn-sm btn-secondary">
                    {{ expandedJobId === job.id ? 'Hide Error' : 'View Error' }}
                  </button>
                </td>
              </tr>

              <!-- Error Log Drawer Row -->
              <ng-container *ngFor="let job of jobs">
                <tr *ngIf="expandedJobId === job.id && job.error_traceback" class="error-log-row">
                  <td colspan="8">
                    <div class="error-log-box">
                      <div class="error-log-header">
                        <b>Error Traceback:</b> {{ job.error_message }}
                      </div>
                      <pre class="traceback-pre">{{ job.error_traceback }}</pre>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="jobs.length === 0">
                <td colspan="8" class="empty-cell">
                  No background jobs recorded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .jobs-page {
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
    .id-cell {
      display: flex;
      flex-direction: column;
    }
    .job-id {
      font-weight: 600;
      color: var(--slate-800);
    }
    .task-id {
      font-size: 0.75rem;
      color: var(--slate-500);
    }
    .invoice-link {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }
    .invoice-link:hover { text-decoration: underline; }
    .stage-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .status-completed { background-color: #d1fae5; color: #065f46; }
    .status-processing { background-color: #dbeafe; color: #1e40af; }
    .status-failed { background-color: #fee2e2; color: #991b1b; }
    .status-retrying { background-color: #fef3c7; color: #92400e; }
    .status-queued { background-color: #f1f5f9; color: #475569; }
    .progress-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .progress-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--slate-600);
    }
    .font-mono { font-family: monospace; }
    .text-sm { font-size: 0.8125rem; }
    .text-danger { color: #dc2626; font-weight: 600; }
    .empty-cell {
      text-align: center;
      padding: 3rem 1rem !important;
      color: var(--slate-500);
    }
    .error-log-row {
      background-color: #fff1f2 !important;
    }
    .error-log-box {
      padding: 1rem;
      font-size: 0.8125rem;
    }
    .error-log-header {
      color: #9f1239;
      margin-bottom: 0.5rem;
    }
    .traceback-pre {
      background-color: #881337;
      color: #ffe4e6;
      padding: 0.75rem;
      border-radius: 0.375rem;
      font-family: monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class JobsMonitorComponent implements OnInit, OnDestroy {
  private jobService = inject(JobService);

  jobs: ProcessingJob[] = [];
  expandedJobId: string | null = null;
  private pollInterval: any;

  ngOnInit(): void {
    this.loadJobs();
    // Auto-refresh jobs every 3 seconds while on this view
    this.pollInterval = setInterval(() => this.loadJobs(), 3000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadJobs(): void {
    this.jobService.listJobs(30).subscribe({
      next: (data) => this.jobs = data,
      error: (err) => console.error('Failed to load jobs', err)
    });
  }

  retryJob(jobId: string): void {
    this.jobService.retryJob(jobId).subscribe({
      next: () => {
        alert('Task successfully dispatched to Celery worker queue.');
        this.loadJobs();
      },
      error: (err) => alert('Failed to retry: ' + (err.error?.detail || err.message))
    });
  }

  toggleError(jobId: string): void {
    this.expandedJobId = this.expandedJobId === jobId ? null : jobId;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status-completed';
      case 'PROCESSING': return 'status-processing';
      case 'FAILED': return 'status-failed';
      case 'RETRYING': return 'status-retrying';
      default: return 'status-queued';
    }
  }
}
