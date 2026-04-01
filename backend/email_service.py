"""
Email service using SendGrid
"""
import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger("email_service")

SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@kitatracker.com')

def is_sendgrid_configured() -> bool:
    """Check if SendGrid is configured"""
    return bool(SENDGRID_API_KEY and len(SENDGRID_API_KEY) > 10)

async def send_verification_email(to_email: str, verification_code: str, username: str = "User") -> bool:
    """Send email verification code via SendGrid"""
    if not is_sendgrid_configured():
        logger.warning("SendGrid not configured, skipping email send")
        return False
    
    try:
        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject='Verify your KitaTracker account',
            html_content=f'''
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
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Verification email sent to {to_email}, status: {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
        return False

async def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    """Send password reset code via SendGrid"""
    if not is_sendgrid_configured():
        logger.warning("SendGrid not configured, skipping email send")
        return False
    
    try:
        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject='Reset your KitaTracker password',
            html_content=f'''
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
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Password reset email sent to {to_email}, status: {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        return False
