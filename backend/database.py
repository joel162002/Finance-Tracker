"""
Database connection and shared dependencies
"""
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Header, HTTPException
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger("database")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auth dependency functions
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

def close_db():
    """Close database connection"""
    client.close()
