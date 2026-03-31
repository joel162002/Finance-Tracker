# Shared models and utilities for KitaTracker
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

# ============ USER MODELS ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    password: str
    default_currency: str = "PHP"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserSettings(BaseModel):
    default_currency: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    name: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ============ INCOME MODELS ============
class IncomeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    date: str
    day: str
    amount: float
    product_name: str
    person_name: str
    notes: str = ""
    payment_status: str = "Paid"
    reference_number: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomeUpdate(BaseModel):
    date: Optional[str] = None
    day: Optional[str] = None
    amount: Optional[float] = None
    product_name: Optional[str] = None
    person_name: Optional[str] = None
    notes: Optional[str] = None
    payment_status: Optional[str] = None
    reference_number: Optional[str] = None

# ============ EXPENSE MODELS ============
class ExpenseEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    date: str
    day: str
    amount: float
    description: str
    category_name: str
    notes: str = ""
    payment_method: str = "Cash"
    reference_number: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    day: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category_name: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None

# ============ RECURRING TRANSACTION MODELS ============
class RecurringTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    type: str  # 'income' or 'expense'
    amount: float
    currency: str = "PHP"
    description: str
    category_or_product: str
    frequency: str = "monthly"  # daily, weekly, monthly, yearly
    start_date: str
    end_date: Optional[str] = None
    last_generated: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecurringTransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    category_or_product: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

# ============ BUDGET MODELS ============
class BudgetLimit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    category_name: str
    amount_limit: float
    currency: str = "PHP"
    month: str  # Format: YYYY-MM
    current_spent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetLimitUpdate(BaseModel):
    category_name: Optional[str] = None
    amount_limit: Optional[float] = None
    currency: Optional[str] = None
    month: Optional[str] = None

# ============ PRODUCT & CATEGORY MODELS ============
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    description: str = ""
    price: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float = 0.0

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: str = ""

# ============ BACKUP MODELS ============
class BackupData(BaseModel):
    income: List[dict] = []
    expenses: List[dict] = []
    products: List[dict] = []
    categories: List[dict] = []
    recurring: List[dict] = []
    budgets: List[dict] = []
    metadata: dict = {}

# ============ IMPORT MODELS ============
class ParsedEntry(BaseModel):
    day: Optional[str] = None
    amount: float
    product_or_description: str
    person_name: Optional[str] = None
    raw_text: str

# ============ CONSTANTS ============
SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD"]

CURRENCY_INFO = {
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
