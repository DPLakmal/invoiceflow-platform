export interface ProcessingJob {
  id: string;
  task_id?: string;
  invoice_id: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  stage: string;
  progress_pct: number;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  error_traceback?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobRetryResponse {
  message: string;
  job_id: string;
  new_task_id: string;
  status: string;
}
