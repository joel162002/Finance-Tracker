"""
Authentication routes: login, register, password reset, email verification, Google OAuth
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import uuid
import random
import logging
import bcrypt

from database import db, require_auth
from email_service import send_verification_email, send_password_reset_email, is_sendgrid_configured

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("auth")

# ============ MODELS ============

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
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

# ============ ENDPOINTS ============

@router.post("/register")
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
    
    # Send verification email via SendGrid
    email_sent = await send_verification_email(request.email, verification_code, request.username)
    
    logger.info(f"Email verification code for {request.email}: {verification_code}")
    
    # Remove password from response
    user_response = {k: v for k, v in new_user.items() if k not in ["password", "_id"]}
    
    response = {
        "token": f"token-{user_id}",
        "user": user_response,
        "requires_verification": True,
    }
    
    # Only include demo code if email was NOT sent successfully
    if not email_sent:
        response["demo_verification_code"] = verification_code
        response["email_sent"] = False
    else:
        response["email_sent"] = True
    
    return response

@router.post("/send-verification")
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
    
    # Send verification email
    email_sent = await send_verification_email(request.email, verification_code, user.get("name", "User"))
    
    logger.info(f"Email verification code for {request.email}: {verification_code}")
    
    response = {"message": "Verification code sent to your email"}
    
    # Only include demo code if email was NOT sent
    if not email_sent:
        response["demo_verification_code"] = verification_code
    
    return response

@router.post("/verify-email")
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

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code to user's email"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email exists, a reset code has been sent."}
    
    # Generate a 6-digit reset code
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store reset code with expiry (15 minutes)
    await db.password_resets.delete_many({"email": request.email})
    await db.password_resets.insert_one({
        "email": request.email,
        "reset_code": reset_code,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
    })
    
    # Send password reset email
    email_sent = await send_password_reset_email(request.email, reset_code)
    
    logger.info(f"Password reset code for {request.email}: {reset_code}")
    
    response = {"message": "Reset code sent to your email."}
    
    # Only include demo code if email was NOT sent
    if not email_sent:
        response["demo_code"] = reset_code
    
    return response

@router.post("/reset-password")
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

@router.post("/login")
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password (simple comparison for demo purposes)
    stored_password = user_doc.get("password", "")
    if stored_password != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if email is verified
    if not user_doc.get("email_verified", False):
        # Generate new verification code
        verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        await db.email_verifications.delete_many({"email": request.email})
        await db.email_verifications.insert_one({
            "email": request.email,
            "verification_code": verification_code,
            "user_id": user_doc.get("id") or user_doc.get("user_id"),
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
        })
        
        # Send verification email
        email_sent = await send_verification_email(request.email, verification_code, user_doc.get("name", "User"))
        
        logger.info(f"Email verification code for {request.email}: {verification_code}")
        
        response = {
            "requires_verification": True,
            "email": request.email,
            "message": "Please verify your email to continue"
        }
        
        if not email_sent:
            response["demo_verification_code"] = verification_code
        
        raise HTTPException(status_code=403, detail=response)
    
    # Remove password from response
    user_response = {k: v for k, v in user_doc.items() if k != "password"}
    
    return {
        "token": "token-" + user_doc.get("id", user_doc.get("user_id", "")),
        "user": user_response
    }

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}

# Google OAuth - Exchange session_id for user data
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@router.post("/google/callback")
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
