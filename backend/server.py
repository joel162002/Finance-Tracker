"""
KitaTracker Backend - Refactored Main Server
Personal business finance tracking API
"""
from fastapi import FastAPI, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import os
import logging
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database
from database import db, close_db

# Import all routers
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.income import router as income_router
from routes.expenses import router as expenses_router
from routes.recurring import router as recurring_router
from routes.budgets import router as budgets_router
from routes.notifications import router as notifications_router
from routes.analytics import router as analytics_router
from routes.misc import router as misc_router

# Create FastAPI app
app = FastAPI(
    title="KitaTracker API",
    description="Personal business finance tracking API",
    version="2.0.0"
)

# ============ MIDDLEWARE ============

class NoCacheMiddleware(BaseHTTPMiddleware):
    """Prevent browser caching of API responses"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith('/api'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

# Add middleware (order matters - NoCacheMiddleware before CORS)
app.add_middleware(NoCacheMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ INCLUDE ROUTERS ============

# All routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(income_router, prefix="/api")
app.include_router(expenses_router, prefix="/api")
app.include_router(recurring_router, prefix="/api")
app.include_router(budgets_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(misc_router, prefix="/api")

# ============ EVENTS ============

@app.on_event("startup")
async def create_indexes():
    """Create database indexes for faster queries"""
    try:
        # Index on date field for faster filtering
        await db.income_entries.create_index("date")
        await db.expense_entries.create_index("date")
        # Index on created_at for faster sorting
        await db.income_entries.create_index("created_at")
        await db.expense_entries.create_index("created_at")
        # Index on user_id for data isolation
        await db.income_entries.create_index("user_id")
        await db.expense_entries.create_index("user_id")
        # Compound index for common queries (user_id + date)
        await db.income_entries.create_index([("user_id", 1), ("date", 1), ("created_at", -1)])
        await db.expense_entries.create_index([("user_id", 1), ("date", 1), ("created_at", -1)])
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    close_db()

# ============ HEALTH CHECK ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}
