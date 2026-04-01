"""
Budget routes: budget limits and spending tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db, require_auth

router = APIRouter(prefix="/budgets", tags=["budgets"])

# ============ MODELS ============

class BudgetLimit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str  # "total" for overall, or specific category name
    month: str  # "2024-03" format
    limit_amount: float
    currency: str = "PHP"
    alert_threshold: float = 80.0
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

# ============ ENDPOINTS ============

@router.get("")
async def get_budgets(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    """Get budget limits for the user"""
    query = {"user_id": user_id}
    if month:
        query["month"] = month
    
    budgets = await db.budget_limits.find(query, {"_id": 0}).to_list(100)
    return budgets

@router.get("/status")
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

@router.post("")
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

@router.put("/{budget_id}")
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

@router.delete("/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(require_auth)):
    """Delete a budget limit"""
    result = await db.budget_limits.delete_one({"id": budget_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted successfully"}
