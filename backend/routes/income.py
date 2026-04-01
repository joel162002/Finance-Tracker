"""
Income routes: CRUD operations for income entries
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db, require_auth

router = APIRouter(prefix="/income", tags=["income"])

# ============ MODELS ============

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

# ============ ENDPOINTS ============

@router.get("", response_model=List[IncomeEntry])
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

@router.post("", response_model=IncomeEntry)
async def create_income(income: IncomeEntryCreate, user_id: str = Depends(require_auth)):
    income_obj = IncomeEntry(user_id=user_id, **income.model_dump())
    doc = income_obj.model_dump()
    await db.income_entries.insert_one(doc)
    return income_obj

@router.put("/{income_id}", response_model=IncomeEntry)
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

@router.delete("/{income_id}")
async def delete_income(income_id: str, user_id: str = Depends(require_auth)):
    # Only delete if entry belongs to authenticated user
    result = await db.income_entries.delete_one({"id": income_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")
    return {"message": "Income entry deleted successfully"}
