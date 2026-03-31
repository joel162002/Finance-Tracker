from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Depends, Header
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import re
import io
import csv
import random
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("server")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ AUTH DEPENDENCY ============

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user_id from token. Returns None for unauthenticated requests."""
    if not authorization:
        logger.debug("No authorization header")
        return None
    
    # Token format: "token-{user_id}" or "Bearer token-{user_id}" or session token
    token = authorization.replace("Bearer ", "").strip()
    logger.debug(f"Token received: {token[:20]}..." if len(token) > 20 else f"Token received: {token}")
    
    # Handle "token-{user_id}" format (email login)
    if token.startswith("token-"):
        user_id = token.replace("token-", "")
        logger.debug(f"Token format: token-user_id, extracted: {user_id}")
        return user_id
    
    # Handle session token format (from Google OAuth) - both with and without prefix
    # First try with prefix
    if token.startswith("session_"):
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            logger.debug(f"Session found for prefixed token, user_id: {session.get('user_id')}")
            return session.get("user_id")
        else:
            logger.debug(f"No session found for prefixed token: {token[:20]}...")
    
    # Try looking up the token directly in user_sessions (for old tokens without prefix)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        logger.debug(f"Session found by direct lookup, user_id: {session.get('user_id')}")
        return session.get("user_id")
    
    # Direct user_id lookup for custom tokens
    user = await db.users.find_one({"$or": [{"id": token}, {"user_id": token}]}, {"_id": 0})
    if user:
        user_id = user.get("id") or user.get("user_id")
        logger.debug(f"User found by direct lookup: {user_id}")
        return user_id
    
    logger.debug("No user found for token")
    return None

async def require_auth(authorization: Optional[str] = Header(None)) -> str:
    """Require authentication - raises 401 if not authenticated."""
    user_id = await get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id

# Middleware to prevent browser caching of API responses
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add no-cache headers to all API responses
        if request.url.path.startswith('/api'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class ExpenseCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class IncomeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    day: str
    amount: float
    currency: str = "PHP"
    product_name: str
    person_name: str
    notes: Optional[str] = ""
    payment_status: str = "Paid"
    reference_number: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class IncomeEntryCreate(BaseModel):
    date: str
    day: str
    amount: float
    currency: str = "PHP"
    product_name: str
    person_name: str
    notes: Optional[str] = ""
    payment_status: str = "Paid"
    reference_number: Optional[str] = ""

class IncomeEntryUpdate(BaseModel):
    date: Optional[str] = None
    day: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    product_name: Optional[str] = None
    person_name: Optional[str] = None
    notes: Optional[str] = None
    payment_status: Optional[str] = None
    reference_number: Optional[str] = None

class ExpenseEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    day: str
    amount: float
    currency: str = "PHP"
    description: str
    category_name: str
    notes: Optional[str] = ""
    payment_method: Optional[str] = "Cash"
    reference_number: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseEntryCreate(BaseModel):
    date: str
    day: str
    amount: float
    currency: str = "PHP"
    description: str
    category_name: str
    notes: Optional[str] = ""
    payment_method: Optional[str] = "Cash"
    reference_number: Optional[str] = ""

class ExpenseEntryUpdate(BaseModel):
    date: Optional[str] = None
    day: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    category_name: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None

# Supported currencies
SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD"]

class UserSettings(BaseModel):
    user_id: str
    default_currency: str = "PHP"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ParsedEntry(BaseModel):
    type: str
    day: Optional[str] = ""
    amount: float
    product_or_description: str
    person_name: Optional[str] = ""
    raw_text: str

class ImportRequest(BaseModel):
    raw_text: str
    entry_type: str

# ============ RECURRING TRANSACTIONS ============

class RecurringTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "income" or "expense"
    amount: float
    currency: str = "PHP"
    description: str
    category_or_product: str
    frequency: str  # "daily", "weekly", "monthly", "yearly"
    start_date: str
    end_date: Optional[str] = None
    last_generated: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RecurringTransactionCreate(BaseModel):
    type: str
    amount: float
    currency: str = "PHP"
    description: str
    category_or_product: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None

class RecurringTransactionUpdate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    category_or_product: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

# ============ BUDGET LIMITS ============

class BudgetLimit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str  # "total" for overall, or specific category name
    month: str  # "2024-03" format
    limit_amount: float
    currency: str = "PHP"
    alert_threshold: float = 80.0  # Percentage to trigger alert
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BudgetLimitCreate(BaseModel):
    category: str
    month: str
    limit_amount: float
    currency: str = "PHP"
    alert_threshold: float = 80.0

class BudgetLimitUpdate(BaseModel):
    limit_amount: Optional[float] = None
    currency: Optional[str] = None
    alert_threshold: Optional[float] = None

# ============ AUTH ENDPOINTS ============

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    reset_code: str
    new_password: str

class SendVerificationRequest(BaseModel):
    email: str

class VerifyEmailRequest(BaseModel):
    email: str
    verification_code: str

@api_router.post("/auth/register")
async def register(request: RegisterRequest):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    existing_username = await db.users.find_one({"username": request.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Validate password length
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Generate verification code
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Create new user with email_verified = False
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "id": user_id,
        "user_id": user_id,
        "username": request.username,
        "email": request.email,
        "password": request.password,
        "name": request.username,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_income": 0,
        "total_expenses": 0,
        "net_profit": 0
    }
    
    await db.users.insert_one(new_user)
    
    # Store verification code
    await db.email_verifications.delete_many({"email": request.email})
    await db.email_verifications.insert_one({
        "email": request.email,
        "verification_code": verification_code,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    })
    
    logger.info(f"Email verification code for {request.email}: {verification_code}")
    
    # Remove password from response
    user_response = {k: v for k, v in new_user.items() if k not in ["password", "_id"]}
    
    return {
        "token": f"token-{user_id}",
        "user": user_response,
        "requires_verification": True,
        "demo_verification_code": verification_code  # Remove in production - send via email
    }

@api_router.post("/auth/send-verification")
async def send_verification(request: SendVerificationRequest):
    """Resend email verification code"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=400, detail="Email not found")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new verification code
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store verification code
    await db.email_verifications.delete_many({"email": request.email})
    await db.email_verifications.insert_one({
        "email": request.email,
        "verification_code": verification_code,
        "user_id": user.get("id") or user.get("user_id"),
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    })
    
    logger.info(f"Email verification code for {request.email}: {verification_code}")
    
    return {
        "message": "Verification code sent to your email",
        "demo_verification_code": verification_code  # Remove in production
    }

@api_router.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify email with code"""
    # Find valid verification code
    verification_doc = await db.email_verifications.find_one({
        "email": request.email,
        "verification_code": request.verification_code
    })
    
    if not verification_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    # Check expiry
    expires_at = verification_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.email_verifications.delete_one({"_id": verification_doc["_id"]})
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Mark email as verified
    result = await db.users.update_one(
        {"email": request.email},
        {"$set": {"email_verified": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to verify email")
    
    # Delete used verification code
    await db.email_verifications.delete_many({"email": request.email})
    
    # Get updated user
    user = await db.users.find_one({"email": request.email}, {"_id": 0, "password": 0})
    
    return {
        "message": "Email verified successfully!",
        "user": user
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code to user's email"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email exists, a reset code has been sent."}
    
    # Generate a 6-digit reset code
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store reset code with expiry (15 minutes)
    await db.password_resets.delete_many({"email": request.email})  # Remove old codes
    await db.password_resets.insert_one({
        "email": request.email,
        "reset_code": reset_code,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    })
    
    # In production, send email here. For demo, we'll return the code.
    # NOTE: In production, never return the code - send via email instead
    logger.info(f"Password reset code for {request.email}: {reset_code}")
    
    return {
        "message": "Reset code sent to your email.",
        "demo_code": reset_code  # Remove this in production
    }

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using reset code"""
    # Validate password length
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find valid reset code
    reset_doc = await db.password_resets.find_one({
        "email": request.email,
        "reset_code": request.reset_code
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    # Check expiry
    expires_at = reset_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"_id": reset_doc["_id"]})
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    # Update password
    result = await db.users.update_one(
        {"email": request.email},
        {"$set": {"password": request.new_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    # Delete used reset code
    await db.password_resets.delete_many({"email": request.email})
    
    return {"message": "Password reset successfully. You can now log in with your new password."}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password (simple comparison for demo purposes)
    stored_password = user_doc.get("password", "")
    if stored_password != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Remove password from response
    user_response = {k: v for k, v in user_doc.items() if k != "password"}
    
    return LoginResponse(
        token="token-" + user_doc.get("id", user_doc.get("user_id", "")),
        user=user_response
    )

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}

# ============ USER SETTINGS ============

@api_router.get("/user/settings")
async def get_user_settings(user_id: str = Depends(require_auth)):
    """Get user settings including default currency"""
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        # Return default settings
        settings = {"user_id": user_id, "default_currency": "PHP"}
    return settings

@api_router.put("/user/settings")
async def update_user_settings(settings: Dict[str, Any], user_id: str = Depends(require_auth)):
    """Update user settings"""
    # Validate currency if provided
    if "default_currency" in settings and settings["default_currency"] not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Invalid currency. Supported: {', '.join(SUPPORTED_CURRENCIES)}")
    
    settings["user_id"] = user_id
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    
    return settings

@api_router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies"""
    currency_info = {
        "PHP": {"name": "Philippine Peso", "symbol": "₱"},
        "USD": {"name": "US Dollar", "symbol": "$"},
        "EUR": {"name": "Euro", "symbol": "€"},
        "GBP": {"name": "British Pound", "symbol": "£"},
        "JPY": {"name": "Japanese Yen", "symbol": "¥"},
        "CNY": {"name": "Chinese Yuan", "symbol": "¥"},
        "KRW": {"name": "Korean Won", "symbol": "₩"},
        "SGD": {"name": "Singapore Dollar", "symbol": "S$"},
        "AUD": {"name": "Australian Dollar", "symbol": "A$"},
        "CAD": {"name": "Canadian Dollar", "symbol": "C$"}
    }
    return {"currencies": currency_info, "supported": SUPPORTED_CURRENCIES}

# ============ USER PROFILE MANAGEMENT ============

class UpdateProfileRequest(BaseModel):
    name: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.get("/user/profile")
async def get_user_profile(user_id: str = Depends(require_auth)):
    """Get current user's profile"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/user/profile")
async def update_user_profile(request: UpdateProfileRequest, user_id: str = Depends(require_auth)):
    """Update user's name"""
    if not request.name or len(request.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"name": request.name.strip()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user

@api_router.put("/user/password")
async def change_user_password(request: ChangePasswordRequest, user_id: str = Depends(require_auth)):
    """Change user's password"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not bcrypt.checkpw(request.current_password.encode('utf-8'), user["password"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Hash and update
    hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.delete("/user/account")
async def delete_user_account(user_id: str = Depends(require_auth)):
    """Delete user account and all associated data"""
    # Delete all user data
    await db.income_entries.delete_many({"user_id": user_id})
    await db.expense_entries.delete_many({"user_id": user_id})
    await db.recurring_transactions.delete_many({"user_id": user_id})
    await db.budget_limits.delete_many({"user_id": user_id})
    await db.user_settings.delete_many({"user_id": user_id})
    await db.products.delete_many({"user_id": user_id})
    await db.categories.delete_many({"user_id": user_id})
    
    # Delete the user
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Account deleted successfully"}

# ============ RECURRING TRANSACTIONS ENDPOINTS ============

@api_router.get("/recurring")
async def get_recurring_transactions(user_id: str = Depends(require_auth)):
    """Get all recurring transactions for the user"""
    transactions = await db.recurring_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

@api_router.post("/recurring")
async def create_recurring_transaction(
    transaction: RecurringTransactionCreate,
    user_id: str = Depends(require_auth)
):
    """Create a new recurring transaction"""
    trans_obj = RecurringTransaction(user_id=user_id, **transaction.model_dump())
    doc = trans_obj.model_dump()
    await db.recurring_transactions.insert_one(doc)
    return trans_obj

@api_router.put("/recurring/{transaction_id}")
async def update_recurring_transaction(
    transaction_id: str,
    transaction: RecurringTransactionUpdate,
    user_id: str = Depends(require_auth)
):
    """Update a recurring transaction"""
    update_data = {k: v for k, v in transaction.model_dump().items() if v is not None}
    
    result = await db.recurring_transactions.update_one(
        {"id": transaction_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    updated_doc = await db.recurring_transactions.find_one(
        {"id": transaction_id, "user_id": user_id},
        {"_id": 0}
    )
    return updated_doc

@api_router.delete("/recurring/{transaction_id}")
async def delete_recurring_transaction(transaction_id: str, user_id: str = Depends(require_auth)):
    """Delete a recurring transaction"""
    result = await db.recurring_transactions.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted successfully"}

@api_router.post("/recurring/{transaction_id}/toggle")
async def toggle_recurring_transaction(transaction_id: str, user_id: str = Depends(require_auth)):
    """Toggle active status of a recurring transaction"""
    trans = await db.recurring_transactions.find_one(
        {"id": transaction_id, "user_id": user_id},
        {"_id": 0}
    )
    if not trans:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    new_status = not trans.get("is_active", True)
    await db.recurring_transactions.update_one(
        {"id": transaction_id, "user_id": user_id},
        {"$set": {"is_active": new_status}}
    )
    return {"is_active": new_status}

@api_router.post("/recurring/generate")
async def generate_recurring_entries(user_id: str = Depends(require_auth)):
    """Generate entries from recurring transactions that are due"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get all active recurring transactions for this user
    transactions = await db.recurring_transactions.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    generated_count = {"income": 0, "expense": 0}
    generated_entries = []
    
    for trans in transactions:
        start_date = trans.get("start_date", today)
        end_date = trans.get("end_date")
        last_generated = trans.get("last_generated")
        frequency = trans.get("frequency", "monthly")
        
        # Skip if hasn't started yet
        if start_date > today:
            continue
            
        # Skip if already ended
        if end_date and end_date < today:
            continue
        
        # Determine next generation date
        if last_generated:
            next_date = calculate_next_date(last_generated, frequency)
        else:
            next_date = start_date
        
        # Generate entries for all due dates
        entries_to_create = []
        while next_date <= today:
            # Check if end_date is reached
            if end_date and next_date > end_date:
                break
                
            # Create entry for this date
            day_name = datetime.strptime(next_date, "%Y-%m-%d").strftime("%A")
            
            if trans["type"] == "income":
                entry = IncomeEntry(
                    user_id=user_id,
                    date=next_date,
                    day=day_name,
                    amount=trans["amount"],
                    product_name=trans["category_or_product"],
                    person_name=f"Recurring: {trans['description']}",
                    notes="Auto-generated from recurring transaction",
                    payment_status="Paid",
                    reference_number=f"REC-{trans['id'][:8]}"
                )
                entries_to_create.append(("income", entry.model_dump()))
            else:
                entry = ExpenseEntry(
                    user_id=user_id,
                    date=next_date,
                    day=day_name,
                    amount=trans["amount"],
                    description=trans["description"],
                    category_name=trans["category_or_product"],
                    notes="Auto-generated from recurring transaction",
                    payment_method="Auto",
                    reference_number=f"REC-{trans['id'][:8]}"
                )
                entries_to_create.append(("expense", entry.model_dump()))
            
            last_generated = next_date
            next_date = calculate_next_date(next_date, frequency)
        
        # Insert all entries and update last_generated
        for entry_type, entry_doc in entries_to_create:
            if entry_type == "income":
                await db.income_entries.insert_one(entry_doc)
                generated_count["income"] += 1
            else:
                await db.expense_entries.insert_one(entry_doc)
                generated_count["expense"] += 1
            generated_entries.append({
                "type": entry_type,
                "date": entry_doc["date"],
                "amount": entry_doc["amount"],
                "description": trans["description"]
            })
        
        # Update last_generated if we created any entries
        if entries_to_create:
            await db.recurring_transactions.update_one(
                {"id": trans["id"], "user_id": user_id},
                {"$set": {"last_generated": last_generated}}
            )
    
    return {
        "message": f"Generated {generated_count['income']} income and {generated_count['expense']} expense entries",
        "income_count": generated_count["income"],
        "expense_count": generated_count["expense"],
        "entries": generated_entries
    }

def calculate_next_date(date_str: str, frequency: str) -> str:
    """Calculate the next date based on frequency"""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    
    if frequency == "daily":
        next_date = date + timedelta(days=1)
    elif frequency == "weekly":
        next_date = date + timedelta(weeks=1)
    elif frequency == "monthly":
        # Add one month
        month = date.month + 1
        year = date.year
        if month > 12:
            month = 1
            year += 1
        # Handle edge cases like Jan 31 -> Feb 28
        day = min(date.day, 28 if month == 2 else 30 if month in [4, 6, 9, 11] else 31)
        next_date = date.replace(year=year, month=month, day=day)
    elif frequency == "yearly":
        next_date = date.replace(year=date.year + 1)
    else:
        next_date = date + timedelta(days=30)  # Default to monthly
    
    return next_date.strftime("%Y-%m-%d")

# ============ BUDGET LIMITS ENDPOINTS ============

@api_router.get("/budgets")
async def get_budgets(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    """Get budget limits for the user"""
    query = {"user_id": user_id}
    if month:
        query["month"] = month
    
    budgets = await db.budget_limits.find(query, {"_id": 0}).to_list(100)
    return budgets

@api_router.get("/budgets/status")
async def get_budget_status(month: str, user_id: str = Depends(require_auth)):
    """Get budget status with current spending for a month"""
    # Get all budgets for the month
    budgets = await db.budget_limits.find(
        {"user_id": user_id, "month": month},
        {"_id": 0}
    ).to_list(100)
    
    # Get expenses for the month
    expense_query = {"user_id": user_id, "date": {"$regex": f"^{month}"}}
    expenses = await db.expense_entries.find(expense_query, {"_id": 0}).to_list(10000)
    
    # Calculate spending by category
    spending_by_category = {}
    total_spending = 0
    for expense in expenses:
        category = expense.get("category_name", "Other")
        amount = expense.get("amount", 0)
        spending_by_category[category] = spending_by_category.get(category, 0) + amount
        total_spending += amount
    
    # Build status for each budget
    status = []
    alerts = []
    
    for budget in budgets:
        category = budget.get("category")
        limit_amount = budget.get("limit_amount", 0)
        threshold = budget.get("alert_threshold", 80)
        
        if category == "total":
            spent = total_spending
        else:
            spent = spending_by_category.get(category, 0)
        
        percentage = (spent / limit_amount * 100) if limit_amount > 0 else 0
        
        budget_status = {
            "id": budget.get("id"),
            "category": category,
            "limit_amount": limit_amount,
            "spent": spent,
            "remaining": limit_amount - spent,
            "percentage": round(percentage, 1),
            "currency": budget.get("currency", "PHP"),
            "is_over_budget": spent > limit_amount,
            "is_alert": percentage >= threshold
        }
        status.append(budget_status)
        
        if percentage >= threshold:
            alert_type = "over_budget" if spent > limit_amount else "warning"
            alerts.append({
                "type": alert_type,
                "category": category,
                "message": f"{'Over budget' if spent > limit_amount else 'Approaching limit'} for {category}: {round(percentage)}% used",
                "percentage": round(percentage, 1)
            })
    
    return {
        "month": month,
        "budgets": status,
        "alerts": alerts,
        "total_spending": total_spending,
        "spending_by_category": spending_by_category
    }

@api_router.post("/budgets")
async def create_budget(budget: BudgetLimitCreate, user_id: str = Depends(require_auth)):
    """Create a new budget limit"""
    # Check if budget already exists for this category and month
    existing = await db.budget_limits.find_one({
        "user_id": user_id,
        "category": budget.category,
        "month": budget.month
    })
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and month")
    
    budget_obj = BudgetLimit(user_id=user_id, **budget.model_dump())
    doc = budget_obj.model_dump()
    await db.budget_limits.insert_one(doc)
    return budget_obj

@api_router.put("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    budget: BudgetLimitUpdate,
    user_id: str = Depends(require_auth)
):
    """Update a budget limit"""
    update_data = {k: v for k, v in budget.model_dump().items() if v is not None}
    
    result = await db.budget_limits.update_one(
        {"id": budget_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    updated_doc = await db.budget_limits.find_one(
        {"id": budget_id, "user_id": user_id},
        {"_id": 0}
    )
    return updated_doc

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(require_auth)):
    """Delete a budget limit"""
    result = await db.budget_limits.delete_one({"id": budget_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted successfully"}

# Google OAuth - Exchange session_id for user data
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google/callback")
async def google_auth_callback(session_id: str = Query(...)):
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code == 404:
                logger.warning(f"Session not found or expired for session_id: {session_id[:20]}...")
                raise HTTPException(status_code=401, detail="Session expired. Please try signing in again.")
            
            if response.status_code != 200:
                logger.error(f"Emergent auth error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=401, detail="Invalid session")
            
            google_data = response.json()
            
            # Check if user exists
            existing_user = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
            
            if existing_user:
                # Update existing user
                await db.users.update_one(
                    {"email": google_data["email"]},
                    {"$set": {
                        "name": google_data.get("name", existing_user.get("name")),
                        "picture": google_data.get("picture"),
                        "last_login": datetime.now(timezone.utc).isoformat()
                    }}
                )
                user_doc = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
            else:
                # Create new user from Google data
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "id": user_id,
                    "user_id": user_id,
                    "email": google_data["email"],
                    "name": google_data.get("name", google_data["email"].split("@")[0]),
                    "username": google_data["email"].split("@")[0],
                    "picture": google_data.get("picture"),
                    "auth_provider": "google",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(new_user)
                user_doc = {k: v for k, v in new_user.items() if k != "_id"}
            
            # Store session - always generate our own session token with proper prefix
            our_session_token = f"session_{uuid.uuid4().hex}"
            await db.user_sessions.insert_one({
                "user_id": user_doc.get("id", user_doc.get("user_id")),
                "session_token": our_session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            })
            
            # Remove sensitive data from response
            user_response = {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
            
            return {
                "token": our_session_token,
                "user": user_response
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Authentication service error: {str(e)}")

# ============ PRODUCT ENDPOINTS ============

@api_router.get("/products", response_model=List[Product])
async def get_products(is_active: Optional[bool] = None):
    query = {} if is_active is None else {"is_active": is_active}
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    return product_obj

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate):
    update_data = product.model_dump()
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return Product(**updated_doc)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# ============ EXPENSE CATEGORY ENDPOINTS ============

@api_router.get("/categories", response_model=List[ExpenseCategory])
async def get_categories(is_active: Optional[bool] = None):
    query = {} if is_active is None else {"is_active": is_active}
    categories = await db.expense_categories.find(query, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=ExpenseCategory)
async def create_category(category: ExpenseCategoryCreate):
    category_obj = ExpenseCategory(**category.model_dump())
    doc = category_obj.model_dump()
    await db.expense_categories.insert_one(doc)
    return category_obj

@api_router.put("/categories/{category_id}", response_model=ExpenseCategory)
async def update_category(category_id: str, category: ExpenseCategoryCreate):
    update_data = category.model_dump()
    result = await db.expense_categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_doc = await db.expense_categories.find_one({"id": category_id}, {"_id": 0})
    return ExpenseCategory(**updated_doc)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.expense_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ============ INCOME ENDPOINTS ============

@api_router.get("/income", response_model=List[IncomeEntry])
async def get_income(
    month: Optional[str] = None,
    product_name: Optional[str] = None,
    person_name: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: str = Depends(require_auth)
):
    # Filter by authenticated user
    query = {"user_id": user_id}
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    
    if product_name:
        query["product_name"] = product_name
    
    if person_name:
        query["person_name"] = {"$regex": person_name, "$options": "i"}
    
    if payment_status:
        query["payment_status"] = payment_status
    
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"person_name": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return income_entries

@api_router.post("/income", response_model=IncomeEntry)
async def create_income(income: IncomeEntryCreate, user_id: str = Depends(require_auth)):
    income_obj = IncomeEntry(user_id=user_id, **income.model_dump())
    doc = income_obj.model_dump()
    await db.income_entries.insert_one(doc)
    return income_obj

@api_router.put("/income/{income_id}", response_model=IncomeEntry)
async def update_income(income_id: str, income: IncomeEntryUpdate, user_id: str = Depends(require_auth)):
    update_data = {k: v for k, v in income.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Only update if entry belongs to authenticated user
    result = await db.income_entries.update_one(
        {"id": income_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")
    
    updated_doc = await db.income_entries.find_one({"id": income_id, "user_id": user_id}, {"_id": 0})
    return IncomeEntry(**updated_doc)

@api_router.delete("/income/{income_id}")
async def delete_income(income_id: str, user_id: str = Depends(require_auth)):
    # Only delete if entry belongs to authenticated user
    result = await db.income_entries.delete_one({"id": income_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")
    return {"message": "Income entry deleted successfully"}

# ============ EXPENSE ENDPOINTS ============

@api_router.get("/expenses", response_model=List[ExpenseEntry])
async def get_expenses(
    month: Optional[str] = None,
    category_name: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: str = Depends(require_auth)
):
    # Filter by authenticated user
    query = {"user_id": user_id}
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    if date_from and date_to:
        query["date"] = {"$gte": date_from, "$lte": date_to}
    
    if category_name:
        query["category_name"] = category_name
    
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"category_name": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return expense_entries

@api_router.post("/expenses", response_model=ExpenseEntry)
async def create_expense(expense: ExpenseEntryCreate, user_id: str = Depends(require_auth)):
    expense_obj = ExpenseEntry(user_id=user_id, **expense.model_dump())
    doc = expense_obj.model_dump()
    await db.expense_entries.insert_one(doc)
    return expense_obj

@api_router.put("/expenses/{expense_id}", response_model=ExpenseEntry)
async def update_expense(expense_id: str, expense: ExpenseEntryUpdate, user_id: str = Depends(require_auth)):
    update_data = {k: v for k, v in expense.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Only update if entry belongs to authenticated user
    result = await db.expense_entries.update_one(
        {"id": expense_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    updated_doc = await db.expense_entries.find_one({"id": expense_id, "user_id": user_id}, {"_id": 0})
    return ExpenseEntry(**updated_doc)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(require_auth)):
    # Only delete if entry belongs to authenticated user
    result = await db.expense_entries.delete_one({"id": expense_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    return {"message": "Expense entry deleted successfully"}

# ============ BULK DATA OPERATIONS ============

@api_router.delete("/data/clear-all")
async def clear_all_data(user_id: str = Depends(require_auth)):
    """Clear all income and expense entries for the authenticated user"""
    try:
        # Only clear data for the authenticated user
        income_result = await db.income_entries.delete_many({"user_id": user_id})
        expense_result = await db.expense_entries.delete_many({"user_id": user_id})
        
        return {
            "message": "All your data cleared successfully",
            "deleted": {
                "income_entries": income_result.deleted_count,
                "expense_entries": expense_result.deleted_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")

# ============ ANALYTICS ENDPOINTS ============

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(entry["amount"] for entry in income_entries)
    total_expenses = sum(entry["amount"] for entry in expense_entries)
    net_profit = total_income - total_expenses
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        product_income[product] = product_income.get(product, 0) + entry["amount"]
    
    customer_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        customer_income[person] = customer_income.get(person, 0) + entry["amount"]
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        category_expenses[category] = category_expenses.get(category, 0) + entry["amount"]
    
    daily_income = {}
    daily_expenses = {}
    for entry in income_entries:
        date = entry["date"]
        daily_income[date] = daily_income.get(date, 0) + entry["amount"]
    
    for entry in expense_entries:
        date = entry["date"]
        daily_expenses[date] = daily_expenses.get(date, 0) + entry["amount"]
    
    all_dates = sorted(set(list(daily_income.keys()) + list(daily_expenses.keys())))
    daily_data = []
    for date in all_dates:
        daily_data.append({
            "date": date,
            "income": daily_income.get(date, 0),
            "expenses": daily_expenses.get(date, 0)
        })
    
    top_customers = sorted(
        [{"name": k, "amount": v} for k, v in customer_income.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]
    
    product_data = [{"name": k, "value": v} for k, v in product_income.items()]
    category_data = [{"name": k, "value": v} for k, v in category_expenses.items()]
    
    recent_income = sorted(income_entries, key=lambda x: x["created_at"], reverse=True)[:5]
    recent_expenses = sorted(expense_entries, key=lambda x: x["created_at"], reverse=True)[:5]
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "income_count": len(income_entries),
        "expense_count": len(expense_entries),
        "daily_data": daily_data,
        "product_data": product_data,
        "category_data": category_data,
        "top_customers": top_customers,
        "recent_income": recent_income,
        "recent_expenses": recent_expenses
    }

@api_router.get("/analytics/monthly")
async def get_monthly_analytics(month: str, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id, "date": {"$regex": f"^{month}"}}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(entry["amount"] for entry in income_entries)
    total_expenses = sum(entry["amount"] for entry in expense_entries)
    net_profit = total_income - total_expenses
    
    daily_breakdown = {}
    for entry in income_entries:
        date = entry["date"]
        if date not in daily_breakdown:
            daily_breakdown[date] = {"date": date, "income": 0, "expenses": 0, "profit": 0}
        daily_breakdown[date]["income"] += entry["amount"]
    
    for entry in expense_entries:
        date = entry["date"]
        if date not in daily_breakdown:
            daily_breakdown[date] = {"date": date, "income": 0, "expenses": 0, "profit": 0}
        daily_breakdown[date]["expenses"] += entry["amount"]
    
    for date in daily_breakdown:
        daily_breakdown[date]["profit"] = daily_breakdown[date]["income"] - daily_breakdown[date]["expenses"]
    
    daily_list = sorted(daily_breakdown.values(), key=lambda x: x["date"])
    
    best_earning_day = max(daily_list, key=lambda x: x["income"]) if daily_list else None
    highest_expense_day = max(daily_list, key=lambda x: x["expenses"]) if daily_list else None
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        product_income[product] = product_income.get(product, 0) + entry["amount"]
    
    top_product = max(product_income.items(), key=lambda x: x[1]) if product_income else None
    
    customer_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        customer_income[person] = customer_income.get(person, 0) + entry["amount"]
    
    top_customer = max(customer_income.items(), key=lambda x: x[1]) if customer_income else None
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        category_expenses[category] = category_expenses.get(category, 0) + entry["amount"]
    
    biggest_category = max(category_expenses.items(), key=lambda x: x[1]) if category_expenses else None
    
    savings_rate = (net_profit / total_income * 100) if total_income > 0 else 0
    
    return {
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "savings_rate": savings_rate,
        "daily_breakdown": daily_list,
        "best_earning_day": best_earning_day,
        "highest_expense_day": highest_expense_day,
        "top_product": {"name": top_product[0], "amount": top_product[1]} if top_product else None,
        "top_customer": {"name": top_customer[0], "amount": top_customer[1]} if top_customer else None,
        "biggest_category": {"name": biggest_category[0], "amount": biggest_category[1]} if biggest_category else None
    }

@api_router.get("/analytics/reports")
async def get_reports(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        if product not in product_income:
            product_income[product] = {"name": product, "amount": 0, "count": 0}
        product_income[product]["amount"] += entry["amount"]
        product_income[product]["count"] += 1
    
    person_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        if person not in person_income:
            person_income[person] = {"name": person, "amount": 0, "count": 0}
        person_income[person]["amount"] += entry["amount"]
        person_income[person]["count"] += 1
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        if category not in category_expenses:
            category_expenses[category] = {"name": category, "amount": 0, "count": 0}
        category_expenses[category]["amount"] += entry["amount"]
        category_expenses[category]["count"] += 1
    
    return {
        "income_by_product": sorted(product_income.values(), key=lambda x: x["amount"], reverse=True),
        "income_by_person": sorted(person_income.values(), key=lambda x: x["amount"], reverse=True),
        "expenses_by_category": sorted(category_expenses.values(), key=lambda x: x["amount"], reverse=True)
    }

# ============ IMPORT/PARSE ENDPOINTS ============

@api_router.post("/import/parse", response_model=List[ParsedEntry])
async def parse_import(request: ImportRequest):
    lines = request.raw_text.strip().split('\n')
    parsed_entries = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        day_match = re.match(r'^(\d+)-\s*(.+)$', line)
        if day_match:
            day = day_match.group(1)
            rest = day_match.group(2)
        else:
            day = ""
            rest = line
        
        amount_match = re.match(r'^([\d.]+(?:k)?)\s+(.+)$', rest)
        if not amount_match:
            continue
        
        amount_str = amount_match.group(1)
        description = amount_match.group(2)
        
        if amount_str.endswith('k'):
            amount = float(amount_str[:-1]) * 1000
        else:
            amount = float(amount_str)
        
        person_match = re.search(r'\(([^)]+)\)', description)
        if person_match:
            person_name = person_match.group(1)
            product_or_description = re.sub(r'\s*\([^)]+\)', '', description).strip()
        else:
            person_name = ""
            product_or_description = description.strip()
        
        parsed_entries.append(ParsedEntry(
            type=request.entry_type,
            day=day,
            amount=amount,
            product_or_description=product_or_description,
            person_name=person_name,
            raw_text=line
        ))
    
    return parsed_entries

# ============ EXPORT ENDPOINTS ============

@api_router.get("/export/income")
async def export_income(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "day", "amount", "product_name", "person_name", "notes", "payment_status", "reference_number"])
    writer.writeheader()
    
    for entry in income_entries:
        writer.writerow({
            "date": entry.get("date", ""),
            "day": entry.get("day", ""),
            "amount": entry.get("amount", 0),
            "product_name": entry.get("product_name", ""),
            "person_name": entry.get("person_name", ""),
            "notes": entry.get("notes", ""),
            "payment_status": entry.get("payment_status", ""),
            "reference_number": entry.get("reference_number", "")
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=income_{month or 'all'}.csv"}
    )

@api_router.get("/export/expenses")
async def export_expenses(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "day", "amount", "description", "category_name", "notes", "payment_method", "reference_number"])
    writer.writeheader()
    
    for entry in expense_entries:
        writer.writerow({
            "date": entry.get("date", ""),
            "day": entry.get("day", ""),
            "amount": entry.get("amount", 0),
            "description": entry.get("description", ""),
            "category_name": entry.get("category_name", ""),
            "notes": entry.get("notes", ""),
            "payment_method": entry.get("payment_method", ""),
            "reference_number": entry.get("reference_number", "")
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{month or 'all'}.csv"}
    )

# ============ SUGGESTIONS ENDPOINTS ============

@api_router.get("/suggestions/products")
async def get_product_suggestions(user_id: str = Depends(require_auth)):
    products = await db.products.find({"is_active": True}, {"_id": 0, "name": 1}).to_list(1000)
    # Get products from user's own income entries
    income_entries = await db.income_entries.find({"user_id": user_id}, {"_id": 0, "product_name": 1}).to_list(1000)
    
    product_names = set([p["name"] for p in products])
    product_names.update([e["product_name"] for e in income_entries])
    
    return {"suggestions": sorted(list(product_names))}

@api_router.get("/suggestions/persons")
async def get_person_suggestions(user_id: str = Depends(require_auth)):
    # Get persons from user's own income entries
    income_entries = await db.income_entries.find({"user_id": user_id}, {"_id": 0, "person_name": 1}).to_list(1000)
    person_names = set([e["person_name"] for e in income_entries if e["person_name"]])
    
    return {"suggestions": sorted(list(person_names))}

@api_router.get("/suggestions/categories")
async def get_category_suggestions(user_id: str = Depends(require_auth)):
    categories = await db.expense_categories.find({"is_active": True}, {"_id": 0, "name": 1}).to_list(1000)
    # Get categories from user's own expense entries
    expense_entries = await db.expense_entries.find({"user_id": user_id}, {"_id": 0, "category_name": 1}).to_list(1000)
    
    category_names = set([c["name"] for c in categories])
    category_names.update([e["category_name"] for e in expense_entries])
    
    return {"suggestions": sorted(list(category_names))}

@api_router.get("/analytics/quick-summary")
async def get_quick_summary(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    """Fast endpoint for quick totals - optimized for speed"""
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    # Use aggregation for faster sum calculation
    income_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    expense_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    
    income_result = await db.income_entries.aggregate(income_pipeline).to_list(1)
    expense_result = await db.expense_entries.aggregate(expense_pipeline).to_list(1)
    
    total_income = income_result[0]["total"] if income_result else 0
    total_expenses = expense_result[0]["total"] if expense_result else 0
    income_count = income_result[0]["count"] if income_result else 0
    expense_count = expense_result[0]["count"] if expense_result else 0
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses,
        "income_count": income_count,
        "expense_count": expense_count
    }

app.include_router(api_router)

# Add NoCacheMiddleware BEFORE CORS middleware
app.add_middleware(NoCacheMiddleware)

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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
