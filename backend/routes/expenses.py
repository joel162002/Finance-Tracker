"""
Expense routes: CRUD operations for expense entries
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db, require_auth

router = APIRouter(prefix="/expenses", tags=["expenses"])

# ============ MODELS ============

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

# ============ HELPER FUNCTIONS ============

async def check_budget_and_notify(user_id: str, category: str, month: str):
    """Check budget thresholds and create notifications if needed"""
    from routes.notifications import create_notification
    
    # Get budget for this category and month
    budget = await db.budget_limits.find_one(
        {"user_id": user_id, "category": category, "month": month},
        {"_id": 0}
    )
    
    if not budget:
        return
    
    # Get total spending for this category in this month
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "category_name": category,
            "date": {"$regex": f"^{month}"}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await db.expense_entries.aggregate(pipeline).to_list(1)
    current_spending = result[0]["total"] if result else 0
    
    limit_amount = budget.get("limit_amount", 0)
    if limit_amount <= 0:
        return
    
    percentage = (current_spending / limit_amount) * 100
    
    # Get user preferences for thresholds
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    threshold_warning = prefs.get("threshold_warning", 80) if prefs else 80
    threshold_danger = prefs.get("threshold_danger", 90) if prefs else 90
    
    # Check for existing notifications to avoid duplicates
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if percentage >= 100:
        existing = await db.notifications.find_one({
            "user_id": user_id,
            "type": "budget_exceeded",
            "related_entity_id": budget.get("id"),
            "created_at": {"$regex": f"^{today}"}
        })
        if not existing:
            await create_notification(
                user_id=user_id,
                notification_type="budget_exceeded",
                title=f"{category} Budget Exceeded!",
                message=f"You've spent {percentage:.0f}% of your {category} budget for {month}.",
                related_entity_type="budget",
                related_entity_id=budget.get("id"),
                priority="high",
                action_url="/budgets"
            )
    elif percentage >= threshold_danger:
        existing = await db.notifications.find_one({
            "user_id": user_id,
            "type": "budget_danger",
            "related_entity_id": budget.get("id"),
            "created_at": {"$regex": f"^{today}"}
        })
        if not existing:
            await create_notification(
                user_id=user_id,
                notification_type="budget_danger",
                title=f"{category} Budget Almost Exhausted",
                message=f"You've used {percentage:.0f}% of your {category} budget. Only {100-percentage:.0f}% remaining.",
                related_entity_type="budget",
                related_entity_id=budget.get("id"),
                priority="high",
                action_url="/budgets"
            )
    elif percentage >= threshold_warning:
        existing = await db.notifications.find_one({
            "user_id": user_id,
            "type": "budget_warning",
            "related_entity_id": budget.get("id"),
            "created_at": {"$regex": f"^{today}"}
        })
        if not existing:
            await create_notification(
                user_id=user_id,
                notification_type="budget_warning",
                title=f"{category} Budget Warning",
                message=f"You've used {percentage:.0f}% of your {category} budget for {month}.",
                related_entity_type="budget",
                related_entity_id=budget.get("id"),
                priority="normal",
                action_url="/budgets"
            )

# ============ ENDPOINTS ============

@router.get("", response_model=List[ExpenseEntry])
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

@router.post("", response_model=ExpenseEntry)
async def create_expense(expense: ExpenseEntryCreate, user_id: str = Depends(require_auth)):
    expense_obj = ExpenseEntry(user_id=user_id, **expense.model_dump())
    doc = expense_obj.model_dump()
    await db.expense_entries.insert_one(doc)
    
    # Check budget and create notification if threshold reached
    if expense_obj.category_name and expense_obj.date:
        month = expense_obj.date[:7]  # Extract YYYY-MM
        await check_budget_and_notify(user_id, expense_obj.category_name, month)
    
    return expense_obj

@router.put("/{expense_id}", response_model=ExpenseEntry)
async def update_expense(expense_id: str, expense: ExpenseEntryUpdate, user_id: str = Depends(require_auth)):
    update_data = {k: v for k, v in expense.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Get existing expense to check category
    existing = await db.expense_entries.find_one({"id": expense_id, "user_id": user_id}, {"_id": 0})
    
    # Only update if entry belongs to authenticated user
    result = await db.expense_entries.update_one(
        {"id": expense_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    updated_doc = await db.expense_entries.find_one({"id": expense_id, "user_id": user_id}, {"_id": 0})
    
    # Check budget for both old and new categories
    if existing:
        old_category = existing.get("category_name")
        new_category = updated_doc.get("category_name")
        month = updated_doc.get("date", "")[:7]
        
        if old_category and month:
            await check_budget_and_notify(user_id, old_category, month)
        if new_category and new_category != old_category and month:
            await check_budget_and_notify(user_id, new_category, month)
    
    return ExpenseEntry(**updated_doc)

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(require_auth)):
    # Only delete if entry belongs to authenticated user
    result = await db.expense_entries.delete_one({"id": expense_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    return {"message": "Expense entry deleted successfully"}
