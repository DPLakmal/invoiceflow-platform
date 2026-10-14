export interface DashboardSummary {
  total_invoices: number;
  pending_processing: number;
  review_required: number;
  approved: number;
  rejected: number;
  paid: number;
  total_spend: number;
  total_tax: number;
  avg_confidence_score: number;
  success_rate_pct: number;
}

export interface SpendByVendorItem {
  vendor_name: string;
  total_amount: number;
  invoice_count: number;
}

export interface MonthlyTrendItem {
  month: string;
  total_amount: number;
  invoice_count: number;
}
