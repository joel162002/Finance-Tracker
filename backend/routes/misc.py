"""
Miscellaneous routes: products, categories, import/export, suggestions, currencies, data operations
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re
import io
import csv

from database import db, require_auth

router = APIRouter(tags=["misc"])

# Supported currencies
SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD"]

# ============ MODELS ============

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class ExpenseCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class ParsedEntry(BaseModel):
    type: str
    day: Optional[str] = ""
    amount: float
    product_or_description: str
    person_name: Optional[str] = ""
    raw_text: str

class ImportRequest(BaseModel):
    raw_text: str
    entry_type: str

# ============ CURRENCY ENDPOINTS ============

@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies"""
    currency_info = {
        "PHP": {"name": "Philippine Peso", "symbol": "₱"},
        "USD": {"name": "US Dollar", "symbol": "$"},
        "EUR": {"name": "Euro", "symbol": "€"},
        "GBP": {"name": "British Pound", "symbol": "£"},
        "JPY": {"name": "Japanese Yen", "symbol": "¥"},
        "CNY": {"name": "Chinese Yuan", "symbol": "¥"},
        "KRW": {"name": "Korean Won", "symbol": "₩"},
        "SGD": {"name": "Singapore Dollar", "symbol": "S$"},
        "AUD": {"name": "Australian Dollar", "symbol": "A$"},
        "CAD": {"name": "Canadian Dollar", "symbol": "C$"}
    }
    return {"currencies": currency_info, "supported": SUPPORTED_CURRENCIES}

# ============ PRODUCT ENDPOINTS ============

@router.get("/products", response_model=List[Product])
async def get_products(is_active: Optional[bool] = None, user_id: str = Depends(require_auth)):
    query = {"user_id": user_id}
    if is_active is not None:
        query["is_active"] = is_active
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, user_id: str = Depends(require_auth)):
    product_obj = Product(user_id=user_id, **product.model_dump())
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    return product_obj

@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate, user_id: str = Depends(require_auth)):
    update_data = product.model_dump()
    result = await db.products.update_one(
        {"id": product_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_doc = await db.products.find_one({"id": product_id, "user_id": user_id}, {"_id": 0})
    return Product(**updated_doc)

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, user_id: str = Depends(require_auth)):
    result = await db.products.delete_one({"id": product_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# ============ EXPENSE CATEGORY ENDPOINTS ============

@router.get("/categories", response_model=List[ExpenseCategory])
async def get_categories(is_active: Optional[bool] = None, user_id: str = Depends(require_auth)):
    query = {"user_id": user_id}
    if is_active is not None:
        query["is_active"] = is_active
    categories = await db.expense_categories.find(query, {"_id": 0}).to_list(1000)
    return categories

@router.post("/categories", response_model=ExpenseCategory)
async def create_category(category: ExpenseCategoryCreate, user_id: str = Depends(require_auth)):
    category_obj = ExpenseCategory(user_id=user_id, **category.model_dump())
    doc = category_obj.model_dump()
    await db.expense_categories.insert_one(doc)
    return category_obj

@router.put("/categories/{category_id}", response_model=ExpenseCategory)
async def update_category(category_id: str, category: ExpenseCategoryCreate, user_id: str = Depends(require_auth)):
    update_data = category.model_dump()
    result = await db.expense_categories.update_one(
        {"id": category_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_doc = await db.expense_categories.find_one({"id": category_id, "user_id": user_id}, {"_id": 0})
    return ExpenseCategory(**updated_doc)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user_id: str = Depends(require_auth)):
    result = await db.expense_categories.delete_one({"id": category_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ============ IMPORT/PARSE ENDPOINTS ============

@router.post("/import/parse", response_model=List[ParsedEntry])
async def parse_import(request: ImportRequest):
    lines = request.raw_text.strip().split('\n')
    parsed_entries = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        day_match = re.match(r'^(\d+)-\s*(.+)$', line)
        if day_match:
            day = day_match.group(1)
            rest = day_match.group(2)
        else:
            day = ""
            rest = line
        
        amount_match = re.match(r'^([\d.]+(?:k)?)\s+(.+)$', rest)
        if not amount_match:
            continue
        
        amount_str = amount_match.group(1)
        description = amount_match.group(2)
        
        if amount_str.endswith('k'):
            amount = float(amount_str[:-1]) * 1000
        else:
            amount = float(amount_str)
        
        person_match = re.search(r'\(([^)]+)\)', description)
        if person_match:
            person_name = person_match.group(1)
            product_or_description = re.sub(r'\s*\([^)]+\)', '', description).strip()
        else:
            person_name = ""
            product_or_description = description.strip()
        
        parsed_entries.append(ParsedEntry(
            type=request.entry_type,
            day=day,
            amount=amount,
            product_or_description=product_or_description,
            person_name=person_name,
            raw_text=line
        ))
    
    return parsed_entries

# ============ EXPORT ENDPOINTS ============

@router.get("/export/income")
async def export_income(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "day", "amount", "product_name", "person_name", "notes", "payment_status", "reference_number"])
    writer.writeheader()
    
    for entry in income_entries:
        writer.writerow({
            "date": entry.get("date", ""),
            "day": entry.get("day", ""),
            "amount": entry.get("amount", 0),
            "product_name": entry.get("product_name", ""),
            "person_name": entry.get("person_name", ""),
            "notes": entry.get("notes", ""),
            "payment_status": entry.get("payment_status", ""),
            "reference_number": entry.get("reference_number", "")
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=income_{month or 'all'}.csv"}
    )

@router.get("/export/expenses")
async def export_expenses(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "day", "amount", "description", "category_name", "notes", "payment_method", "reference_number"])
    writer.writeheader()
    
    for entry in expense_entries:
        writer.writerow({
            "date": entry.get("date", ""),
            "day": entry.get("day", ""),
            "amount": entry.get("amount", 0),
            "description": entry.get("description", ""),
            "category_name": entry.get("category_name", ""),
            "notes": entry.get("notes", ""),
            "payment_method": entry.get("payment_method", ""),
            "reference_number": entry.get("reference_number", "")
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{month or 'all'}.csv"}
    )

# ============ BULK DATA OPERATIONS ============

@router.delete("/data/clear-all")
async def clear_all_data(user_id: str = Depends(require_auth)):
    """Clear all income and expense entries for the authenticated user"""
    try:
        income_result = await db.income_entries.delete_many({"user_id": user_id})
        expense_result = await db.expense_entries.delete_many({"user_id": user_id})
        
        return {
            "message": "All your data cleared successfully",
            "deleted": {
                "income_entries": income_result.deleted_count,
                "expense_entries": expense_result.deleted_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")

# ============ SUGGESTIONS ENDPOINTS ============

@router.get("/suggestions/products")
async def get_product_suggestions(user_id: str = Depends(require_auth)):
    products = await db.products.find({"is_active": True}, {"_id": 0, "name": 1}).to_list(1000)
    income_entries = await db.income_entries.find({"user_id": user_id}, {"_id": 0, "product_name": 1}).to_list(1000)
    
    product_names = set([p["name"] for p in products])
    product_names.update([e["product_name"] for e in income_entries])
    
    return {"suggestions": sorted(list(product_names))}

@router.get("/suggestions/persons")
async def get_person_suggestions(user_id: str = Depends(require_auth)):
    income_entries = await db.income_entries.find({"user_id": user_id}, {"_id": 0, "person_name": 1}).to_list(1000)
    person_names = set([e["person_name"] for e in income_entries if e["person_name"]])
    
    return {"suggestions": sorted(list(person_names))}

@router.get("/suggestions/categories")
async def get_category_suggestions(user_id: str = Depends(require_auth)):
    categories = await db.expense_categories.find({"is_active": True}, {"_id": 0, "name": 1}).to_list(1000)
    expense_entries = await db.expense_entries.find({"user_id": user_id}, {"_id": 0, "category_name": 1}).to_list(1000)
    
    category_names = set([c["name"] for c in categories])
    category_names.update([e["category_name"] for e in expense_entries])
    
    return {"suggestions": sorted(list(category_names))}
