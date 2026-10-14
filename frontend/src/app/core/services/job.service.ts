import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, tap } from 'rxjs';
import { ProcessingJob, JobRetryResponse } from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/jobs';

  getJobStatus(jobId: string): Observable<ProcessingJob> {
    return this.http.get<ProcessingJob>(`${this.apiUrl}/${jobId}`);
  }

  retryJob(jobId: string): Observable<JobRetryResponse> {
    return this.http.post<JobRetryResponse>(`${this.apiUrl}/${jobId}/retry`, {});
  }

  listJobs(limit: number = 20): Observable<ProcessingJob[]> {
    return this.http.get<ProcessingJob[]>(`${this.apiUrl}?limit=${limit}`);
  }

  pollJob(jobId: string, intervalMs: number = 1500): Observable<ProcessingJob> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getJobStatus(jobId)),
      takeWhile(job => job.status !== 'COMPLETED' && job.status !== 'FAILED', true)
    );
  }
}
