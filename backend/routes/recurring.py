"""
Recurring transactions routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from database import db, require_auth

router = APIRouter(prefix="/recurring", tags=["recurring"])

# ============ MODELS ============

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

# Income/Expense Entry models for generation
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

# ============ HELPER FUNCTIONS ============

def calculate_next_date(date_str: str, frequency: str) -> str:
    """Calculate the next date based on frequency"""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    
    if frequency == "daily":
        next_date = date + timedelta(days=1)
    elif frequency == "weekly":
        next_date = date + timedelta(weeks=1)
    elif frequency == "monthly":
        month = date.month + 1
        year = date.year
        if month > 12:
            month = 1
            year += 1
        day = min(date.day, 28 if month == 2 else 30 if month in [4, 6, 9, 11] else 31)
        next_date = date.replace(year=year, month=month, day=day)
    elif frequency == "yearly":
        next_date = date.replace(year=date.year + 1)
    else:
        next_date = date + timedelta(days=30)
    
    return next_date.strftime("%Y-%m-%d")

async def check_budget_and_notify(user_id: str, category: str, month: str):
    """Check budget and notify - imports from expenses route"""
    from routes.expenses import check_budget_and_notify as expense_budget_check
    await expense_budget_check(user_id, category, month)

# ============ ENDPOINTS ============

@router.get("")
async def get_recurring_transactions(user_id: str = Depends(require_auth)):
    """Get all recurring transactions for the user"""
    transactions = await db.recurring_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

@router.post("")
async def create_recurring_transaction(
    transaction: RecurringTransactionCreate,
    user_id: str = Depends(require_auth)
):
    """Create a new recurring transaction"""
    trans_obj = RecurringTransaction(user_id=user_id, **transaction.model_dump())
    doc = trans_obj.model_dump()
    await db.recurring_transactions.insert_one(doc)
    return trans_obj

@router.put("/{transaction_id}")
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

@router.delete("/{transaction_id}")
async def delete_recurring_transaction(transaction_id: str, user_id: str = Depends(require_auth)):
    """Delete a recurring transaction"""
    result = await db.recurring_transactions.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted successfully"}

@router.post("/{transaction_id}/toggle")
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

@router.post("/generate")
async def generate_recurring_entries(user_id: str = Depends(require_auth)):
    """Generate entries from recurring transactions that are due"""
    from routes.notifications import create_notification
    
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
                # Check budget notification for auto-generated expenses
                month = entry_doc["date"][:7]
                await check_budget_and_notify(user_id, trans["category_or_product"], month)
            generated_entries.append({
                "type": entry_type,
                "date": entry_doc["date"],
                "amount": entry_doc["amount"],
                "description": trans["description"]
            })
        
        # Update last_generated and create notification if we created any entries
        if entries_to_create:
            await db.recurring_transactions.update_one(
                {"id": trans["id"], "user_id": user_id},
                {"$set": {"last_generated": last_generated}}
            )
            
            # Create notification for auto-generated entries
            type_label = "income" if trans["type"] == "income" else "expense"
            await create_notification(
                user_id=user_id,
                notification_type="recurring_created",
                title=f"Recurring {type_label.title()} Created",
                message=f"'{trans['description']}' auto-generated {len(entries_to_create)} {type_label} entries.",
                related_entity_type="recurring",
                related_entity_id=trans.get("id"),
                priority="low",
                action_url=f"/{type_label}"
            )
    
    return {
        "message": f"Generated {generated_count['income']} income and {generated_count['expense']} expense entries",
        "income_count": generated_count["income"],
        "expense_count": generated_count["expense"],
        "entries": generated_entries
    }
