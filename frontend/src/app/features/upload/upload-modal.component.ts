import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InvoiceService } from '../../core/services/invoice.service';
import { JobService } from '../../core/services/job.service';

interface UploadItem {
  file: File;
  name: string;
  size: number;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  stage: string;
  progress: number;
  invoiceId?: string;
  jobId?: string;
  error?: string;
}

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Upload Invoices</h3>
            <p class="modal-desc">Drag & drop PDF or image invoices to trigger asynchronous OCR extraction.</p>
          </div>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Dropzone -->
          <div 
            class="dropzone"
            [class.dropzone-active]="isDragging"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()">
            <input 
              #fileInput 
              type="file" 
              multiple 
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp" 
              style="display: none;" 
              (change)="onFilesSelected($event)">
            
            <div class="dropzone-icon">
              <svg style="width: 2rem; height: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="dropzone-title">Click to upload or drag & drop files here</p>
            <p class="dropzone-hint">Supports PDF, PNG, JPG, JPEG, TIFF (Max 25MB)</p>
          </div>

          <!-- Upload Queue -->
          <div *ngIf="uploadQueue.length > 0" class="queue-container">
            <h4 class="queue-title">Processing Queue ({{ uploadQueue.length }})</h4>
            <div class="queue-list">
              <div *ngFor="let item of uploadQueue" class="queue-item">
                <div class="queue-item-header">
                  <div class="file-info">
                    <span class="file-name">{{ item.name }}</span>
                    <span class="file-size">{{ (item.size / 1024).toFixed(1) }} KB</span>
                  </div>
                  <div class="stage-badge" [ngClass]="getStageClass(item)">
                    {{ item.stage }}
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="progress-track" style="margin-top: 0.5rem;">
                  <div 
                    class="progress-fill" 
                    [style.width.%]="item.progress"
                    [style.background-color]="item.status === 'FAILED' ? '#ef4444' : '#2563eb'">
                  </div>
                </div>

                <div class="queue-item-footer" *ngIf="item.status === 'COMPLETED' || item.status === 'FAILED'">
                  <span *ngIf="item.status === 'COMPLETED'" class="success-msg">
                    Extraction finished successfully.
                  </span>
                  <span *ngIf="item.status === 'FAILED'" class="error-msg">
                    {{ item.error || 'Processing error occurred.' }}
                  </span>

                  <button 
                    *ngIf="item.status === 'COMPLETED' && item.invoiceId" 
                    (click)="viewInvoice(item.invoiceId)" 
                    class="btn btn-sm btn-primary">
                    Review Invoice &rarr;
                  </button>
                  <button 
                    *ngIf="item.status === 'FAILED' && item.jobId" 
                    (click)="retryItem(item)" 
                    class="btn btn-sm btn-secondary">
                    Retry Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button (click)="close.emit()" class="btn btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--slate-200);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--slate-900);
    }
    .modal-desc {
      font-size: 0.8125rem;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      color: var(--slate-400);
      cursor: pointer;
    }
    .close-btn:hover { color: var(--slate-700); }
    .modal-body {
      padding: 1.5rem;
    }
    .dropzone {
      border: 2px dashed var(--slate-300);
      border-radius: 0.75rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      background-color: var(--slate-50);
      transition: all 0.2s ease;
    }
    .dropzone:hover, .dropzone-active {
      border-color: var(--primary);
      background-color: var(--primary-light);
    }
    .dropzone-icon {
      color: var(--primary);
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: center;
    }
    .dropzone-title {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--slate-800);
    }
    .dropzone-hint {
      font-size: 0.75rem;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
    .queue-container {
      margin-top: 1.5rem;
    }
    .queue-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-700);
      margin-bottom: 0.75rem;
    }
    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .queue-item {
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
    }
    .queue-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-800);
    }
    .file-size {
      font-size: 0.75rem;
      color: var(--slate-500);
      margin-left: 0.5rem;
    }
    .stage-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .stage-queued { background-color: #e2e8f0; color: #475569; }
    .stage-processing { background-color: #dbeafe; color: #1e40af; }
    .stage-completed { background-color: #d1fae5; color: #065f46; }
    .stage-failed { background-color: #fee2e2; color: #991b1b; }
    .queue-item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.625rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--slate-200);
    }
    .success-msg { font-size: 0.75rem; color: #059669; font-weight: 500; }
    .error-msg { font-size: 0.75rem; color: #dc2626; font-weight: 500; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--slate-200);
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class UploadModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() uploadFinished = new EventEmitter<void>();

  private invoiceService = inject(InvoiceService);
  private jobService = inject(JobService);
  private router = inject(Router);

  isDragging = false;
  uploadQueue: UploadItem[] = [];

  onBackdropClick(event: MouseEvent) {
    this.close.emit();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]) {
    for (const file of files) {
      const item: UploadItem = {
        file,
        name: file.name,
        size: file.size,
        status: 'PENDING',
        stage: 'QUEUED',
        progress: 10
      };
      this.uploadQueue.unshift(item);
      this.startUpload(item);
    }
  }

  private startUpload(item: UploadItem) {
    item.status = 'UPLOADING';
    item.stage = 'UPLOADING';
    item.progress = 25;

    this.invoiceService.uploadInvoice(item.file).subscribe({
      next: (res) => {
        item.invoiceId = res.invoice_id;
        item.jobId = res.job_id;
        item.status = 'PROCESSING';
        item.stage = 'OCR_PROCESSING';
        item.progress = 45;

        // Poll job status until done
        this.pollJob(item);
      },
      error: (err) => {
        item.status = 'FAILED';
        item.stage = 'FAILED';
        item.progress = 100;
        item.error = err.error?.detail || 'Upload failed.';
      }
    });
  }

  private pollJob(item: UploadItem) {
    if (!item.jobId) return;

    this.jobService.pollJob(item.jobId).subscribe({
      next: (job) => {
        item.progress = Math.max(item.progress, job.progress_pct);
        item.stage = job.stage || job.status;

        if (job.status === 'COMPLETED') {
          item.status = 'COMPLETED';
          item.stage = 'COMPLETED';
          item.progress = 100;
          this.uploadFinished.emit();
        } else if (job.status === 'FAILED') {
          item.status = 'FAILED';
          item.stage = 'FAILED';
          item.progress = 100;
          item.error = job.error_message || 'OCR extraction failed.';
        }
      },
      error: (err) => {
        item.status = 'FAILED';
        item.error = 'Lost connection to pipeline monitor.';
      }
    });
  }

  retryItem(item: UploadItem) {
    if (!item.jobId) return;
    item.status = 'PROCESSING';
    item.stage = 'RETRYING';
    item.progress = 20;

    this.jobService.retryJob(item.jobId).subscribe({
      next: () => {
        this.pollJob(item);
      },
      error: (err) => {
        item.status = 'FAILED';
        item.error = err.error?.detail || 'Retry failed.';
      }
    });
  }

  viewInvoice(invoiceId: string) {
    this.close.emit();
    this.router.navigate(['/invoices', invoiceId]);
  }

  getStageClass(item: UploadItem): string {
    if (item.status === 'COMPLETED') return 'stage-completed';
    if (item.status === 'FAILED') return 'stage-failed';
    if (item.status === 'PROCESSING') return 'stage-processing';
    return 'stage-queued';
  }
}
