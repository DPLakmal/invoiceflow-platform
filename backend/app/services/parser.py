import re
import logging
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


class InvoiceParser:
    """Extracts structured invoice fields and line items from OCR/extracted raw text."""

    def parse(self, text: str) -> Dict[str, Any]:
        """Parse raw document text and return structured dictionary."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        vendor_name = self._extract_vendor(lines)
        invoice_number = self._extract_invoice_number(text)
        po_number = self._extract_po_number(text)
        invoice_date = self._extract_invoice_date(text)
        due_date = self._extract_due_date(text)
        currency, curr_symbol = self._extract_currency(text)
        
        subtotal, tax_amount, discount_amount, total_amount = self._extract_financials(text)
        items = self._extract_line_items(lines, currency)

        # Cross-validation & item math sync
        if not subtotal and items:
            calculated_subtotal = round(sum(item["total_price"] for item in items), 2)
            if calculated_subtotal > 0:
                subtotal = calculated_subtotal
        
        if not total_amount and subtotal:
            total_amount = round(subtotal + tax_amount - discount_amount, 2)

        # Calculate confidence score
        confidence_score, issues = self._calculate_confidence(
            invoice_number=invoice_number,
            vendor_name=vendor_name,
            invoice_date=invoice_date,
            total_amount=total_amount,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            items=items
        )

        status = "EXTRACTED"
        if confidence_score < 0.85 or issues:
            status = "REVIEW_REQUIRED"

        return {
            "vendor_name_extracted": vendor_name,
            "invoice_number": invoice_number,
            "po_number": po_number,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "currency": currency,
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "discount_amount": discount_amount,
            "total_amount": total_amount,
            "confidence_score": confidence_score,
            "status": status,
            "items": items,
            "validation_issues": issues,
            "raw_text": text
        }

    def _extract_vendor(self, lines: List[str]) -> Optional[str]:
        """Detect vendor name from top of the document or company patterns."""
        if not lines:
            return None

        # Look for corporate identifiers in first 10 lines
        company_indicators = [
            "inc", "llc", "corp", "corporation", "ltd", "limited",
            "gmbh", "technologies", "services", "solutions", "group", "co."
        ]
        
        for line in lines[:10]:
            lower = line.lower()
            if any(ind in lower for ind in company_indicators) and len(line) < 60:
                # Exclude lines that are clearly addresses or labels
                if not any(skip in lower for skip in ["invoice", "bill to", "ship to", "due date"]):
                    return line.strip()

        # Fallback to the first prominent line that isn't a header keyword
        for line in lines[:5]:
            lower = line.lower()
            if not any(kw in lower for kw in ["invoice", "receipt", "statement", "tax", "bill", "date", "page"]):
                if 2 < len(line) < 50:
                    return line.strip()

        return lines[0][:60] if lines else None

    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice identifier."""
        patterns = [
            r"(?i)invoice\s*(?:no|number|#|code)\s*[:.\-]?\s*([A-Za-z0-9\-_/]+)",
            r"(?i)inv\s*[:.\-#]?\s*([A-Za-z0-9\-_/]+)",
            r"(?i)bill\s*(?:no|number|#)\s*[:.\-]?\s*([A-Za-z0-9\-_/]+)",
            r"\b(INV-\d{4,8})\b",
            r"(?i)#\s*([0-9]{4,10})\b"
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                inv_no = match.group(1).strip()
                if len(inv_no) >= 2 and not inv_no.lower() in ["date", "due", "to"]:
                    return inv_no
        return None

    def _extract_po_number(self, text: str) -> Optional[str]:
        """Extract purchase order reference."""
        patterns = [
            r"(?i)(?:purchase\s*order|p\.?o\.?)\s*(?:no|number|#)?\s*[:.\-]\s*([A-Za-z0-9\-_/]+)",
            r"(?i)\border\b\s*(?:no|number|#)\s*[:.\-]\s*([A-Za-z0-9\-_/]+)"
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                val = match.group(1).strip()
                if len(val) >= 2 and val.lower() not in ["date", "no", "number"]:
                    return val
        return None

    def _parse_date_string(self, raw_str: str) -> Optional[date]:
        """Extract and parse standard date format from a string."""
        if not raw_str:
            return None

        # Clean string to single line
        line = raw_str.split("\n")[0].strip()

        # Try to find a date token within the line
        date_patterns = [
            r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b",           # 2024-10-10 or 2024/10/10
            r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b",         # 10/10/2024 or 10-10-2024
            r"\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b",     # October 10, 2024
            r"\b(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})\b"      # 10 October 2024
        ]

        found_token = None
        for dp in date_patterns:
            m = re.search(dp, line)
            if m:
                found_token = m.group(1).replace(",", "")
                break

        if not found_token:
            found_token = line[:20].replace(",", "").strip()

        formats = [
            "%Y-%m-%d", "%Y/%m/%d",
            "%m/%d/%Y", "%d/%m/%Y",
            "%m-%d-%Y", "%d-%m-%Y",
            "%B %d %Y", "%b %d %Y",
            "%d %B %Y", "%d %b %Y"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(found_token, fmt).date()
            except ValueError:
                continue
        return None

    def _extract_invoice_date(self, text: str) -> Optional[date]:
        """Extract invoice issuance date (avoiding due date)."""
        # Look for explicit invoice date headers
        patterns = [
            r"(?i)(?:invoice\s*date|bill\s*date|issue\s*date|date\s*of\s*issue)\s*[:.\-]?\s*([^\n\r]+)",
            r"(?im)^(?:\s*date)\s*[:.\-]?\s*([^\n\r]+)",
            r"(?i)(?<!due\s)\bdate\s*[:.\-]?\s*([^\n\r]+)"
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                parsed = self._parse_date_string(match.group(1))
                if parsed:
                    return parsed
        return None

    def _extract_due_date(self, text: str) -> Optional[date]:
        """Extract payment due date."""
        patterns = [
            r"(?i)(?:due\s*date|payment\s*due|pay\s*by)\s*[:.\-]?\s*([^\n\r]+)"
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                parsed = self._parse_date_string(match.group(1))
                if parsed:
                    return parsed
        return None

    def _extract_currency(self, text: str) -> Tuple[str, str]:
        """Detect currency symbol and standard 3-letter code."""
        if "€" in text or "EUR" in text.upper():
            return "EUR", "€"
        if "£" in text or "GBP" in text.upper():
            return "GBP", "£"
        if "CAD" in text.upper():
            return "CAD", "$"
        if "AUD" in text.upper():
            return "AUD", "$"
        # Default USD
        return "USD", "$"

    def _clean_amount(self, val_str: str) -> float:
        """Sanitize numerical string and convert to float."""
        try:
            # Remove symbols, spaces, commas
            cleaned = re.sub(r"[^\d.]", "", val_str.replace(",", ""))
            return float(cleaned) if cleaned else 0.0
        except ValueError:
            return 0.0

    def _extract_financials(self, text: str) -> Tuple[float, float, float, float]:
        """Extract subtotal, tax, discount, and total amounts."""
        subtotal = 0.0
        tax_amount = 0.0
        discount_amount = 0.0
        total_amount = 0.0

        # Subtotal
        subtotal_match = re.search(r"(?i)(?:subtotal|sub-total|sub\s*total|net\s*amount)\s*[:.\-]?\s*[$€£]?\s*([0-9,]+\.[0-9]{2})", text)
        if subtotal_match:
            subtotal = self._clean_amount(subtotal_match.group(1))

        # Tax / VAT / GST
        tax_match = re.search(r"(?i)(?:tax|vat|gst|sales\s*tax)(?:\s*\([^)]*\))?\s*[:.\-]?\s*[$€£]?\s*([0-9,]+\.[0-9]{2})", text)
        if tax_match:
            tax_amount = self._clean_amount(tax_match.group(1))

        # Discount
        discount_match = re.search(r"(?i)discount\s*[:.\-]?\s*[$€£]?\s*([0-9,]+\.[0-9]{2})", text)
        if discount_match:
            discount_amount = self._clean_amount(discount_match.group(1))

        # Total Amount
        total_patterns = [
            r"(?i)(?:total\s*amount|grand\s*total|balance\s*due|amount\s*due)\s*[:.\-]?\s*[$€£]?\s*([0-9,]+\.[0-9]{2})",
            r"(?i)\btotal\s*[:.\-]?\s*[$€£]?\s*([0-9,]+\.[0-9]{2})"
        ]
        for pattern in total_patterns:
            total_match = re.search(pattern, text)
            if total_match:
                total_amount = self._clean_amount(total_match.group(1))
                break

        return subtotal, tax_amount, discount_amount, total_amount

    def _extract_line_items(self, lines: List[str], currency: str) -> List[Dict[str, Any]]:
        """Identify line items from table-like text lines."""
        items = []
        line_num = 1

        # Pattern: [Description] [Quantity] [Unit Price] [Total]
        # Example: "Cloud Hosting Standard 1 120.00 120.00"
        # Example: "Consulting Hours 10.0 $85.00 $850.00"
        item_regex = re.compile(
            r"^(.+?)\s+(\d+(?:\.\d+)?)\s+[$€£]?\s*(\d+(?:,\d+)?\.\d{2})\s+[$€£]?\s*(\d+(?:,\d+)?\.\d{2})$"
        )

        for line in lines:
            line_str = line.strip()
            # Skip obvious header or total lines
            lower = line_str.lower()
            if any(kw in lower for kw in ["description", "subtotal", "total", "tax", "vat", "invoice", "date", "balance"]):
                continue

            match = item_regex.match(line_str)
            if match:
                desc = match.group(1).strip()
                qty = float(match.group(2))
                unit_price = self._clean_amount(match.group(3))
                total_price = self._clean_amount(match.group(4))

                if len(desc) > 2 and total_price > 0:
                    items.append({
                        "line_number": line_num,
                        "description": desc,
                        "quantity": qty,
                        "unit_price": unit_price,
                        "total_price": total_price
                    })
                    line_num += 1

        return items

    def _calculate_confidence(
        self,
        invoice_number: Optional[str],
        vendor_name: Optional[str],
        invoice_date: Optional[date],
        total_amount: float,
        subtotal: float,
        tax_amount: float,
        discount_amount: float,
        items: List[Dict[str, Any]]
    ) -> Tuple[float, List[str]]:
        """Calculate overall extraction confidence score and identify validation discrepancies."""
        score = 0.0
        issues = []

        if invoice_number:
            score += 0.25
        else:
            issues.append("Missing invoice number")

        if total_amount > 0:
            score += 0.25
        else:
            issues.append("Missing or zero total amount")

        if vendor_name:
            score += 0.20
        else:
            issues.append("Uncertain vendor name")

        if invoice_date:
            score += 0.15
        else:
            issues.append("Missing invoice date")

        if items:
            score += 0.15
        else:
            issues.append("No line items extracted")

        # Mathematical Checksum Validation
        if subtotal > 0 and total_amount > 0:
            expected_total = round(subtotal + tax_amount - discount_amount, 2)
            if abs(expected_total - total_amount) > 0.05:
                issues.append(
                    f"Financial mismatch: Subtotal ({subtotal}) + Tax ({tax_amount}) - Discount ({discount_amount}) != Total ({total_amount})"
                )
                score = max(0.5, score - 0.20)

        return round(min(1.0, score), 2), issues


invoice_parser = InvoiceParser()
