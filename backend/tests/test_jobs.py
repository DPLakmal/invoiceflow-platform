from unittest.mock import patch
from app.models.invoice import Invoice
from app.models.job import ProcessingJob


def test_get_job_status(client, db_session):
    inv = Invoice(file_name="job_inv.pdf", file_path="/tmp/test.pdf")
    db_session.add(inv)
    db_session.commit()

    job = ProcessingJob(
        invoice_id=inv.id,
        task_id="test-task-abc",
        status="PROCESSING",
        stage="EXTRACTING_TEXT",
        progress_pct=40
    )
    db_session.add(job)
    db_session.commit()

    res = client.get(f"/api/v1/jobs/{job.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PROCESSING"
    assert data["stage"] == "EXTRACTING_TEXT"
    assert data["progress_pct"] == 40


def test_retry_job(client, db_session):
    inv = Invoice(file_name="job_retry.pdf", file_path="/tmp/test.pdf")
    db_session.add(inv)
    db_session.commit()

    job = ProcessingJob(
        invoice_id=inv.id,
        status="FAILED",
        stage="FAILED",
        error_message="Simulated OCR crash"
    )
    db_session.add(job)
    db_session.commit()

    with patch("app.workers.tasks.process_invoice_task.delay") as mock_delay:
        mock_delay.return_value.id = "new-retry-task-id"
        res = client.post(f"/api/v1/jobs/{job.id}/retry")
        assert res.status_code == 200
        assert res.json()["new_task_id"] == "new-retry-task-id"
        assert res.json()["status"] == "QUEUED"
