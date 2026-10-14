import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Invoice, InvoiceSummary, InvoiceUploadResponse, PaginatedInvoices } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private http = inject(HttpClient);
  // Default to relative /api/v1 proxy or localhost:8000 for direct dev
  private apiUrl = '/api/v1/invoices';

  uploadInvoice(file: File): Observable<InvoiceUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<InvoiceUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getInvoices(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    vendor?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Observable<PaginatedInvoices> {
    let params = new HttpParams();
    if (options.page) params = params.set('page', options.page.toString());
    if (options.pageSize) params = params.set('page_size', options.pageSize.toString());
    if (options.status) params = params.set('status', options.status);
    if (options.vendor) params = params.set('vendor', options.vendor);
    if (options.search) params = params.set('search', options.search);
    if (options.startDate) params = params.set('start_date', options.startDate);
    if (options.endDate) params = params.set('end_date', options.endDate);
    if (options.sortBy) params = params.set('sort_by', options.sortBy);
    if (options.sortOrder) params = params.set('sort_order', options.sortOrder);

    return this.http.get<PaginatedInvoices>(this.apiUrl, { params });
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  updateInvoice(id: string, updateData: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/${id}`, updateData);
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDocumentUrl(id: string): string {
    return `${this.apiUrl}/${id}/document`;
  }
}
