import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary, SpendByVendorItem, MonthlyTrendItem } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/reports';

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
  }

  getSpendByVendor(limit: number = 10): Observable<SpendByVendorItem[]> {
    return this.http.get<SpendByVendorItem[]>(`${this.apiUrl}/spend-by-vendor?limit=${limit}`);
  }

  getMonthlyTrends(): Observable<MonthlyTrendItem[]> {
    return this.http.get<MonthlyTrendItem[]>(`${this.apiUrl}/monthly-trends`);
  }

  downloadCsv(): void {
    window.open(`${this.apiUrl}/export`, '_blank');
  }
}
