"""
Email service using Resend API with Templates
"""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger("email_service")

# Resend configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'KitaTracker <onboarding@resend.dev>')
VERIFICATION_TEMPLATE_ID = os.environ.get('VERIFICATION_TEMPLATE_ID')
PASSWORD_RESET_TEMPLATE_ID = os.environ.get('PASSWORD_RESET_TEMPLATE_ID')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

def is_email_configured() -> bool:
    """Check if Resend is configured"""
    return bool(RESEND_API_KEY and len(RESEND_API_KEY) > 5)

async def send_verification_email(to_email: str, verification_code: str, username: str = "User") -> bool:
    """Send email verification code via Resend using template"""
    if not is_email_configured():
        logger.warning("Resend not configured, skipping email send")
        return False
    
    try:
        # Use template if available
        if VERIFICATION_TEMPLATE_ID:
            params = {
                "from": SENDER_EMAIL,
                "to": [to_email],
                "subject": "Verify your KitaTracker account",
                "template": {
                    "id": VERIFICATION_TEMPLATE_ID,
                    "variables": {
                        "username": username,
                        "verification_code": verification_code,
                        "code": verification_code,
                        "name": username
                    }
                }
            }
        else:
            # Fallback to inline HTML
            params = {
                "from": SENDER_EMAIL,
                "to": [to_email],
                "subject": "Verify your KitaTracker account",
                "html": f'''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #10b981; margin: 0;">KitaTracker</h1>
                        <p style="color: #64748b; margin-top: 5px;">Personal Business Finance Tracking</p>
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center;">
                        <h2 style="color: #1e293b; margin-top: 0;">Verify Your Email</h2>
                        <p style="color: #475569;">Hi {username},</p>
                        <p style="color: #475569;">Thank you for signing up! Please use the code below to verify your email address:</p>
                        
                        <div style="background: #10b981; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; margin: 25px 0; display: inline-block;">
                            {verification_code}
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                        <p>If you didn't create an account with KitaTracker, you can safely ignore this email.</p>
                    </div>
                </div>
                '''
            }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {to_email}, id: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
        return False

async def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    """Send password reset code via Resend using template"""
    if not is_email_configured():
        logger.warning("Resend not configured, skipping email send")
        return False
    
    try:
        # Use template if available
        if PASSWORD_RESET_TEMPLATE_ID:
            params = {
                "from": SENDER_EMAIL,
                "to": [to_email],
                "subject": "Reset your KitaTracker password",
                "template": {
                    "id": PASSWORD_RESET_TEMPLATE_ID,
                    "variables": {
                        "reset_code": reset_code,
                        "code": reset_code
                    }
                }
            }
        else:
            # Fallback to inline HTML
            params = {
                "from": SENDER_EMAIL,
                "to": [to_email],
                "subject": "Reset your KitaTracker password",
                "html": f'''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #10b981; margin: 0;">KitaTracker</h1>
                        <p style="color: #64748b; margin-top: 5px;">Personal Business Finance Tracking</p>
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center;">
                        <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
                        <p style="color: #475569;">We received a request to reset your password. Use the code below:</p>
                        
                        <div style="background: #f59e0b; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; margin: 25px 0; display: inline-block;">
                            {reset_code}
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                        <p>If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                </div>
                '''
            }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {to_email}, id: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        return False
