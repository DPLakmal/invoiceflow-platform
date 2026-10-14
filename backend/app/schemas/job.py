from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class JobBase(BaseModel):
    invoice_id: str
    status: str
    stage: str
    progress_pct: int = 0
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None


class JobResponse(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: Optional[str] = None
    error_traceback: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class JobRetryResponse(BaseModel):
    message: str
    job_id: str
    new_task_id: str
    status: str
