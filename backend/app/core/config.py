import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General
    PROJECT_NAME: str = "InvoiceFlow Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "invoiceflow-super-secret-key-change-in-production-2026"
    API_V1_PREFIX: str = "/api/v1"

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:4200",
        "http://localhost:80",
        "http://localhost:3000",
        "capacitor://localhost",
        "http://localhost"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    # Database
    DATABASE_URL: str = "sqlite:///./invoiceflow.db"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "invoiceflow"
    POSTGRES_PASSWORD: str = "invoiceflow_secure_password"
    POSTGRES_DB: str = "invoiceflow_db"

    # Celery & Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "png", "jpg", "jpeg", "tiff", "webp"]

    # Extraction & OCR
    TESSERACT_CMD: str = "tesseract"
    POPPLER_PATH: str = ""
    CONFIDENCE_THRESHOLD: float = 0.85


settings = Settings()
