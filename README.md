# InvoiceFlow Platform

> **Enterprise Invoice Management Platform with an Asynchronous Document-Processing Pipeline**

InvoiceFlow is a full-stack document intelligence platform built with **Python**, **FastAPI**, **Angular**, **PostgreSQL**, **Celery**, **Redis**, and **Docker**. It automates the end-to-end ingestion, text extraction, structured parsing, validation, human-in-the-loop review, and financial reporting for PDF and image invoices.

---

## 🚀 Key Features

- **Asynchronous Processing Pipeline**: Offloads heavy document parsing and OCR to distributed Celery workers with a Redis message broker.
- **Dual-Path Text & OCR Extraction**:
  - **Native Digital PDF Extraction** via `pdfplumber` and `pypdf` for pixel-perfect digital text and tabular extraction.
  - **Scanned Document & Image OCR** via `pytesseract` and `pdf2image` with image pre-processing (grayscale, contrast normalization, thresholding).
- **Intelligent Structured Information Extractor**:
  - Regex and heuristic extraction of vendor names, invoice numbers, purchase order (P.O.) numbers, invoice & due dates, currencies, and line items.
  - **Checksum Validation**: Mathematically cross-checks `subtotal + tax - discount == total`.
  - **Confidence Scoring**: Dynamically calculates a confidence score ($0.0 - 1.0$) and automatically flags questionable invoices as `REVIEW_REQUIRED`.
- **Fault-Tolerant Retry Handling**:
  - Celery workers feature automatic **exponential backoff retries** ($5\text{s}, 10\text{s}, 20\text{s}$) on transient errors.
  - Granular job stage tracking persisted in PostgreSQL (`PENDING` $\rightarrow$ `QUEUED` $\rightarrow$ `EXTRACTING_TEXT` $\rightarrow$ `PARSING_FIELDS` $\rightarrow$ `VALIDATING` $\rightarrow$ `COMPLETED` / `FAILED`).
  - Dead-letter handling and one-click manual retry endpoint.
- **Split-Screen Human-in-the-Loop Review (Angular)**:
  - High-fidelity document viewer on the left alongside an editable structured form on the right.
  - Interactive line items table with real-time recalculation of subtotals and totals.
  - Status management: `APPROVED`, `REJECTED`, `PAID`, `REVIEW_REQUIRED`.
  - Full audit trail logging user and system edits.
- **Executive Analytics & Reporting**:
  - Spend by vendor distribution and monthly expenditure trends.
  - Instant CSV export of invoice registers.
- **Mobile Application Extension**:
  - Built-in Capacitor configuration ready for iOS and Android deployment.
  - Enables camera receipt scanning with auto-cropping and on-the-go "Swipe-to-Approve" workflows.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Client Applications"]
        UI["Angular Web Dashboard\n(Split-Screen Review, Reports)"]
        MobileApp["Mobile App (Capacitor/iOS/Android)\n(Camera Scan, Push Alerts, 1-Tap Approval)"]
        JobTracker["Real-Time Job Poller / Status Tracker"]
    end

    subgraph Gateway["API & Backend Layer (FastAPI)"]
        API["FastAPI REST Endpoints\n(/api/v1/invoices, /api/v1/jobs, /api/v1/reports)"]
        Storage["Shared Volume Storage\n(/app/uploads)"]
        DBEngine["SQLAlchemy 2.0 ORM"]
    end

    subgraph Messaging["Message Broker & Queue"]
        Redis[("Redis 7 Broker & Result Backend")]
    end

    subgraph Processing["Worker Layer (Celery)"]
        CeleryWorker["Celery Worker Pool\n(Concurrency, Exponential Backoff)"]
        Extractor["Document Ingestion\n- Native PDF (pdfplumber/pypdf)\n- Image OCR (Tesseract / pytesseract)"]
        Parser["Structured Parser\n(Regex, Heuristics, Line-Item Matcher, Checksum)"]
        RetryHandler["Automatic Retry & Dead-Letter Handling"]
    end

    subgraph Persistence["Storage & Database Layer"]
        PG[("PostgreSQL 16 DB\n- invoices\n- invoice_items\n- processing_jobs\n- vendors\n- audit_logs")]
    end

    UI -->|1. Upload PDF/Image| API
    API -->|2. Save File| Storage
    API -->|3. Create Job (PENDING)| DBEngine
    DBEngine --> PG
    API -->|4. Dispatch Task| Redis
    Redis -->|5. Consume Task| CeleryWorker

    CeleryWorker -->|6. Read File| Storage
    CeleryWorker -->|7. OCR & Extract Text| Extractor
    Extractor -->|8. Parse Fields & Items| Parser
    Parser -->|9. Update Job & Insert Invoice Data| DBEngine
    CeleryWorker -.->|On Failure: Retry with Backoff| RetryHandler

    JobTracker -->|Poll Status /api/v1/jobs/{id}| API
    UI -->|Fetch & Update Invoice Details| API
    UI -->|Aggregate Spend & Trends| API
    MobileApp -->|Camera Capture & 1-Tap Approvals| API
```

---

## 📦 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn |
| **Worker & Queue** | Celery 5.4, Redis 7, Flower (Monitoring) |
| **Document OCR** | `pdfplumber`, `pypdf`, `pytesseract`, `Pillow`, `pdf2image`, `poppler-utils` |
| **Database** | PostgreSQL 16 (production), SQLite (local dev fallback) |
| **Frontend** | Angular 18/19 (Standalone Components, Signals, Reactive Forms) |
| **Mobile** | Capacitor 6 (iOS & Android native bridge) |
| **DevOps** | Docker, Docker Compose, Nginx (Reverse Proxy & SPA server) |

---

## ⚡ Quickstart with Docker Compose

To start the entire platform with PostgreSQL, Redis, FastAPI, Celery worker, Flower, and Angular:

```bash
# 1. Clone the repository and enter the directory
cd invoiceflow-platform

# 2. Copy the environment template
cp .env.example .env

# 3. Spin up all containers
docker compose up --build -d
```

Once running, access the services:
- **Angular Dashboard**: [http://localhost:80](http://localhost:80) (or `http://localhost:4200`)
- **FastAPI Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Celery Flower Task Monitor**: [http://localhost:5555](http://localhost:5555)
- **System Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 🛠️ Local Development (Standalone)

### 1. Backend Setup
```bash
# Create virtual environment
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run demo data seeder (creates sample PDFs & populates database)
PYTHONPATH=backend python backend/scripts/seed_demo_data.py

# Start FastAPI server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Celery Worker (Requires local Redis)
```bash
PYTHONPATH=backend celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
The frontend will start at [http://localhost:4200](http://localhost:4200).

---

## 🧪 Running Automated Tests

Run the backend integration test suite, parser verification, and PDF extraction tests:

```bash
PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests/ -v
```

---

## 📂 Project Structure

```
invoiceflow-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints (invoices, jobs, vendors, reports, health)
│   │   ├── core/            # Config, Database engine, Security
│   │   ├── models/          # SQLAlchemy ORM (Invoice, InvoiceItem, ProcessingJob, etc.)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Storage, OCR, Parser, Report services
│   │   ├── workers/         # Celery app and async pipeline tasks
│   │   └── main.py          # FastAPI application entrypoint
│   ├── scripts/             # PDF generators and database seeder
│   ├── tests/               # Pytest integration and unit tests
│   ├── Dockerfile           # API Dockerfile
│   ├── Dockerfile.worker    # Worker Dockerfile with Tesseract & Poppler
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        # Models and HTTP API services
│   │   │   ├── features/    # Dashboard, Invoices list & split review, Reports, Jobs
│   │   │   └── shared/      # Navbar, Status Badge, File Dropzone
│   │   ├── styles.css       # Clean SaaS design system
│   │   └── main.ts
│   ├── capacitor.config.ts  # Mobile iOS/Android bridge configuration
│   ├── Dockerfile           # Multi-stage Angular build with Nginx
│   ├── nginx.conf           # Reverse proxy configuration
│   └── package.json
├── docker-compose.yml       # 6-container production orchestration
├── .env.example
└── README.md
```

---

## 📄 License
MIT License. Built for enterprise invoice automation.
