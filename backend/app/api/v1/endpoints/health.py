import redis
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db

router = APIRouter()


@router.get("")
def health_check(db: Session = Depends(get_db)):
    """Health check for PostgreSQL/SQLite and Redis connectivity."""
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "ok"
    try:
        r = redis.from_url(settings.CELERY_BROKER_URL, socket_timeout=2)
        r.ping()
    except Exception as e:
        redis_status = f"unreachable: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "app_name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "redis": redis_status
    }
