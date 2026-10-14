import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.core.database import Base


class TimestampMixin:
    """Mixin for models requiring created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def generate_uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid.uuid4())
