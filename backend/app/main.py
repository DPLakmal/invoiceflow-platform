import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("invoiceflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event to initialize database schema and resources."""
    logger.info("Initializing InvoiceFlow Platform...")
    init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down InvoiceFlow Platform...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Asynchronous Document-Processing Pipeline & Invoice Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "operational",
        "documentation": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }
