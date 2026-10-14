import os
import shutil
import uuid
import aiofiles
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings


class StorageService:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, file: UploadFile) -> str:
        """Validate file extension and MIME type."""
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '.{ext}' is not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        return ext

    async def save_upload_file(self, file: UploadFile, invoice_id: str) -> Tuple[str, int]:
        """
        Save uploaded file into the storage directory with an invoice-specific prefix.
        Returns (relative_file_path, file_size_bytes).
        """
        self.validate_file(file)
        
        # Create safe unique filename
        ext = file.filename.split(".")[-1].lower()
        clean_name = f"{invoice_id}_{uuid.uuid4().hex[:8]}.{ext}"
        destination = self.base_dir / clean_name

        file_size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        async with aiofiles.open(destination, "wb") as out_file:
            while content := await file.read(1024 * 1024):  # Read in 1MB chunks
                file_size += len(content)
                if file_size > max_bytes:
                    # Clean up partial file
                    if destination.exists():
                        destination.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                    )
                await out_file.write(content)

        return str(destination), file_size

    def get_file_path(self, file_path_str: str) -> Path:
        """Verify and return absolute Path to stored file."""
        p = Path(file_path_str)
        if not p.is_absolute():
            p = self.base_dir / p.name
        if not p.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on storage"
            )
        return p

    def delete_file(self, file_path_str: str) -> bool:
        """Safely delete file from disk."""
        try:
            p = self.get_file_path(file_path_str)
            if p.exists():
                p.unlink()
                return True
        except Exception:
            pass
        return False


storage_service = StorageService()
