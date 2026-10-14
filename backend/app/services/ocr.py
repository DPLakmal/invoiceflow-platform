import logging
import shutil
from pathlib import Path
from typing import Optional
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)

# Check if tesseract binary exists
HAS_TESSERACT = shutil.which("tesseract") is not None


class OCRService:
    def __init__(self):
        self.has_tesseract = HAS_TESSERACT
        if not self.has_tesseract:
            logger.warning(
                "Tesseract OCR binary not found in PATH. Native PDF text extraction will be prioritized, "
                "with fallback for local environments."
            )

    def extract_text(self, file_path_str: str) -> str:
        """
        Extract raw text from PDF or image using the optimal pipeline:
        1. For PDFs: attempt high-precision digital text extraction via pdfplumber/pypdf first.
        2. If PDF contains scanned images or sparse text, convert to image and run Tesseract OCR.
        3. For Images: run image pre-processing (contrast/grayscale) and run Tesseract OCR.
        """
        file_path = Path(file_path_str)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path_str}")

        ext = file_path.suffix.lower().replace(".", "")

        if ext == "pdf":
            return self._extract_from_pdf(file_path)
        elif ext in ["png", "jpg", "jpeg", "tiff", "webp"]:
            return self._extract_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file format for OCR: {ext}")

    def _extract_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF, falling back to OCR if digital text is empty."""
        extracted_text = ""

        # Step 1: Try pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
        except Exception as e:
            logger.debug(f"pdfplumber extraction failed: {e}")

        # Step 2: Try pypdf fallback if empty
        if not extracted_text.strip():
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(file_path))
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception as e:
                logger.debug(f"pypdf extraction failed: {e}")

        # Step 3: Scanned PDF fallback via pdf2image and pytesseract
        if len(extracted_text.strip()) < 50 and self.has_tesseract:
            try:
                from pdf2image import convert_from_path
                import pytesseract

                images = convert_from_path(str(file_path), first_page=1, last_page=3)
                ocr_pages = []
                for img in images:
                    processed_img = self._preprocess_image(img)
                    text = pytesseract.image_to_string(processed_img)
                    ocr_pages.append(text)
                extracted_text = "\n".join(ocr_pages)
            except Exception as e:
                logger.warning(f"Scanned PDF OCR failed: {e}")

        return extracted_text.strip()

    def _extract_from_image(self, file_path: Path) -> str:
        """Extract text from an image file using OCR with image pre-processing."""
        if not self.has_tesseract:
            logger.warning("OCR requested for image but Tesseract binary is not installed.")
            # Return placeholder or basic metadata text
            return f"[Image File: {file_path.name} - Install Tesseract OCR for text extraction]"

        try:
            import pytesseract
            with Image.open(file_path) as img:
                processed_img = self._preprocess_image(img)
                text = pytesseract.image_to_string(processed_img)
                return text.strip()
        except Exception as e:
            logger.error(f"Image OCR failed for {file_path.name}: {e}")
            raise

    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        """Preprocess image to boost OCR accuracy (grayscale, sharpening, contrast)."""
        # Convert to Grayscale
        gray = img.convert("L")
        # Increase contrast
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.8)
        # Slight sharpening
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        return sharpened


ocr_service = OCRService()
