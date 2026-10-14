import { ProcessingJob } from './job.model';

export type InvoiceStatus = 'PENDING' | 'EXTRACTED' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface InvoiceItem {
  id?: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details?: string;
  timestamp: string;
}

export interface InvoiceSummary {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  vendor_name_extracted?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency: string;
  total_amount: number;
  confidence_score: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice extends InvoiceSummary {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  po_number?: string;
  raw_text?: string;
  notes?: string;
  file_path: string;
  items: InvoiceItem[];
  jobs: ProcessingJob[];
  audit_logs: AuditLog[];
}

export interface InvoiceUploadResponse {
  message: string;
  invoice_id: string;
  job_id: string;
  file_name: string;
  status: string;
}

export interface PaginatedInvoices {
  items: InvoiceSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
