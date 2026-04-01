"""
User routes: profile, settings, account management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime, timezone
import bcrypt

from database import db, require_auth

router = APIRouter(prefix="/user", tags=["user"])

# Supported currencies
SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD"]

# ============ MODELS ============

class UpdateProfileRequest(BaseModel):
    name: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ============ SETTINGS ENDPOINTS ============

@router.get("/settings")
async def get_user_settings(user_id: str = Depends(require_auth)):
    """Get user settings including default currency"""
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        # Return default settings
        settings = {"user_id": user_id, "default_currency": "PHP"}
    return settings

@router.put("/settings")
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

# ============ PROFILE ENDPOINTS ============

@router.get("/profile")
async def get_user_profile(user_id: str = Depends(require_auth)):
    """Get current user's profile"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile")
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

@router.put("/password")
async def change_user_password(request: ChangePasswordRequest, user_id: str = Depends(require_auth)):
    """Change user's password"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if password is hashed (bcrypt) or plain text
    stored_password = user.get("password", "")
    
    # Try bcrypt comparison first
    try:
        if stored_password.startswith("$2"):
            # It's a bcrypt hash
            if not bcrypt.checkpw(request.current_password.encode('utf-8'), stored_password.encode('utf-8')):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
        else:
            # Plain text comparison (legacy)
            if stored_password != request.current_password:
                raise HTTPException(status_code=400, detail="Current password is incorrect")
    except Exception:
        # Fallback to plain text comparison
        if stored_password != request.current_password:
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

@router.delete("/account")
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
    await db.notifications.delete_many({"user_id": user_id})
    await db.notification_preferences.delete_many({"user_id": user_id})
    
    # Delete the user
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Account deleted successfully"}
