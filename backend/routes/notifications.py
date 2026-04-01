"""
Notification routes: in-app notification system
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from database import db, require_auth

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ============ MODELS ============

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # budget_warning, budget_danger, budget_exceeded, recurring_due, recurring_created, system_info
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    is_read: bool = False
    priority: str = "normal"
    action_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NotificationPreferencesUpdate(BaseModel):
    enable_notifications: Optional[bool] = None
    budget_alerts: Optional[bool] = None
    recurring_alerts: Optional[bool] = None
    threshold_warning: Optional[int] = None
    threshold_danger: Optional[int] = None

# ============ HELPER FUNCTIONS ============

async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    related_entity_type: str = None,
    related_entity_id: str = None,
    priority: str = "normal",
    action_url: str = None
):
    """Helper function to create a notification"""
    # Check user preferences
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        prefs = {"enable_notifications": True, "budget_alerts": True, "recurring_alerts": True}
    
    if not prefs.get("enable_notifications", True):
        return None
    
    # Check specific preference
    if notification_type.startswith("budget_") and not prefs.get("budget_alerts", True):
        return None
    if notification_type.startswith("recurring_") and not prefs.get("recurring_alerts", True):
        return None
    
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        priority=priority,
        action_url=action_url
    )
    
    await db.notifications.insert_one(notification.model_dump())
    return notification

async def cleanup_old_notifications():
    """Delete notifications older than 15 days"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
    await db.notifications.delete_many({"created_at": {"$lt": cutoff}})

# ============ ENDPOINTS ============

@router.get("")
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    user_id: str = Depends(require_auth)
):
    """Get notifications for the current user"""
    # Clean up old notifications
    await cleanup_old_notifications()
    
    query = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get unread count
    unread_count = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = Depends(require_auth)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@router.put("/read-all")
async def mark_all_notifications_read(user_id: str = Depends(require_auth)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_id: str = Depends(require_auth)):
    """Delete a notification"""
    result = await db.notifications.delete_one({"id": notification_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@router.delete("")
async def clear_all_notifications(user_id: str = Depends(require_auth)):
    """Clear all notifications for the user"""
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "All notifications cleared"}

@router.get("/preferences")
async def get_notification_preferences(user_id: str = Depends(require_auth)):
    """Get notification preferences for the user"""
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        prefs = {
            "user_id": user_id,
            "enable_notifications": True,
            "budget_alerts": True,
            "recurring_alerts": True,
            "threshold_warning": 80,
            "threshold_danger": 90
        }
    return prefs

@router.put("/preferences")
async def update_notification_preferences(
    prefs: NotificationPreferencesUpdate,
    user_id: str = Depends(require_auth)
):
    """Update notification preferences"""
    update_data = {k: v for k, v in prefs.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    updated_prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    return updated_prefs

@router.get("/check-recurring")
async def check_recurring_notifications(user_id: str = Depends(require_auth)):
    """Check for due recurring transactions and create notifications"""
    from routes.recurring import calculate_next_date
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get active recurring transactions
    recurring = await db.recurring_transactions.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    notifications_created = 0
    
    for trans in recurring:
        start_date = trans.get("start_date", today)
        last_generated = trans.get("last_generated")
        frequency = trans.get("frequency", "monthly")
        
        # Calculate next due date
        if last_generated:
            next_due = calculate_next_date(last_generated, frequency)
        else:
            next_due = start_date
        
        # Check if due today or overdue
        if next_due <= today:
            # Check if we already notified today
            existing = await db.notifications.find_one({
                "user_id": user_id,
                "type": "recurring_due",
                "related_entity_id": trans.get("id"),
                "created_at": {"$regex": f"^{today}"}
            })
            
            if not existing:
                type_label = "income" if trans.get("type") == "income" else "expense"
                await create_notification(
                    user_id=user_id,
                    notification_type="recurring_due",
                    title=f"Recurring {type_label.title()} Due",
                    message=f"'{trans.get('description')}' ({trans.get('frequency')}) is due today.",
                    related_entity_type="recurring",
                    related_entity_id=trans.get("id"),
                    priority="normal",
                    action_url="/recurring"
                )
                notifications_created += 1
    
    return {"notifications_created": notifications_created}
