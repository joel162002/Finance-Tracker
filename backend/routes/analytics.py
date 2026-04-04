"""
Analytics routes: dashboard, reports, quick summary
"""
from fastapi import APIRouter, Depends
from typing import Optional

from database import db, require_auth

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ============ ENDPOINTS ============

@router.get("/dashboard")
async def get_dashboard_analytics(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(entry["amount"] for entry in income_entries)
    total_expenses = sum(entry["amount"] for entry in expense_entries)
    net_profit = total_income - total_expenses
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        product_income[product] = product_income.get(product, 0) + entry["amount"]
    
    customer_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        customer_income[person] = customer_income.get(person, 0) + entry["amount"]
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        category_expenses[category] = category_expenses.get(category, 0) + entry["amount"]
    
    daily_income = {}
    daily_expenses = {}
    for entry in income_entries:
        date = entry["date"]
        daily_income[date] = daily_income.get(date, 0) + entry["amount"]
    
    for entry in expense_entries:
        date = entry["date"]
        daily_expenses[date] = daily_expenses.get(date, 0) + entry["amount"]
    
    all_dates = sorted(set(list(daily_income.keys()) + list(daily_expenses.keys())))
    daily_data = []
    for date in all_dates:
        daily_data.append({
            "date": date,
            "income": daily_income.get(date, 0),
            "expenses": daily_expenses.get(date, 0)
        })
    
    top_customers = sorted(
        [{"name": k, "amount": v} for k, v in customer_income.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]
    
    product_data = [{"name": k, "value": v} for k, v in product_income.items()]
    category_data = [{"name": k, "value": v} for k, v in category_expenses.items()]
    
    recent_income = sorted(income_entries, key=lambda x: x["created_at"], reverse=True)[:5]
    recent_expenses = sorted(expense_entries, key=lambda x: x["created_at"], reverse=True)[:5]
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "income_count": len(income_entries),
        "expense_count": len(expense_entries),
        "daily_data": daily_data,
        "product_data": product_data,
        "category_data": category_data,
        "top_customers": top_customers,
        "recent_income": recent_income,
        "recent_expenses": recent_expenses
    }

@router.get("/monthly")
async def get_monthly_analytics(month: str, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id, "date": {"$regex": f"^{month}"}}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(entry["amount"] for entry in income_entries)
    total_expenses = sum(entry["amount"] for entry in expense_entries)
    net_profit = total_income - total_expenses
    
    daily_breakdown = {}
    for entry in income_entries:
        date = entry["date"]
        if date not in daily_breakdown:
            daily_breakdown[date] = {"date": date, "income": 0, "expenses": 0, "profit": 0}
        daily_breakdown[date]["income"] += entry["amount"]
    
    for entry in expense_entries:
        date = entry["date"]
        if date not in daily_breakdown:
            daily_breakdown[date] = {"date": date, "income": 0, "expenses": 0, "profit": 0}
        daily_breakdown[date]["expenses"] += entry["amount"]
    
    for date in daily_breakdown:
        daily_breakdown[date]["profit"] = daily_breakdown[date]["income"] - daily_breakdown[date]["expenses"]
    
    daily_list = sorted(daily_breakdown.values(), key=lambda x: x["date"])
    
    best_earning_day = max(daily_list, key=lambda x: x["income"]) if daily_list else None
    highest_expense_day = max(daily_list, key=lambda x: x["expenses"]) if daily_list else None
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        product_income[product] = product_income.get(product, 0) + entry["amount"]
    
    top_product = max(product_income.items(), key=lambda x: x[1]) if product_income else None
    
    customer_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        customer_income[person] = customer_income.get(person, 0) + entry["amount"]
    
    top_customer = max(customer_income.items(), key=lambda x: x[1]) if customer_income else None
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        category_expenses[category] = category_expenses.get(category, 0) + entry["amount"]
    
    biggest_category = max(category_expenses.items(), key=lambda x: x[1]) if category_expenses else None
    
    savings_rate = (net_profit / total_income * 100) if total_income > 0 else 0
    
    return {
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "savings_rate": savings_rate,
        "daily_breakdown": daily_list,
        "best_earning_day": best_earning_day,
        "highest_expense_day": highest_expense_day,
        "top_product": {"name": top_product[0], "amount": top_product[1]} if top_product else None,
        "top_customer": {"name": top_customer[0], "amount": top_customer[1]} if top_customer else None,
        "biggest_category": {"name": biggest_category[0], "amount": biggest_category[1]} if biggest_category else None
    }

@router.get("/reports")
async def get_reports(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    income_entries = await db.income_entries.find(query, {"_id": 0}).to_list(10000)
    expense_entries = await db.expense_entries.find(query, {"_id": 0}).to_list(10000)
    
    product_income = {}
    for entry in income_entries:
        product = entry["product_name"]
        if product not in product_income:
            product_income[product] = {"name": product, "amount": 0, "count": 0}
        product_income[product]["amount"] += entry["amount"]
        product_income[product]["count"] += 1
    
    person_income = {}
    for entry in income_entries:
        person = entry["person_name"]
        if person not in person_income:
            person_income[person] = {"name": person, "amount": 0, "count": 0}
        person_income[person]["amount"] += entry["amount"]
        person_income[person]["count"] += 1
    
    category_expenses = {}
    for entry in expense_entries:
        category = entry["category_name"]
        if category not in category_expenses:
            category_expenses[category] = {"name": category, "amount": 0, "count": 0}
        category_expenses[category]["amount"] += entry["amount"]
        category_expenses[category]["count"] += 1
    
    return {
        "income_by_product": sorted(product_income.values(), key=lambda x: x["amount"], reverse=True),
        "income_by_person": sorted(person_income.values(), key=lambda x: x["amount"], reverse=True),
        "expenses_by_category": sorted(category_expenses.values(), key=lambda x: x["amount"], reverse=True)
    }

@router.get("/quick-summary")
async def get_quick_summary(month: Optional[str] = None, user_id: str = Depends(require_auth)):
    """Fast endpoint for quick totals - optimized for speed"""
    # Filter by authenticated user
    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    # Use aggregation for faster sum calculation
    income_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    expense_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    
    income_result = await db.income_entries.aggregate(income_pipeline).to_list(1)
    expense_result = await db.expense_entries.aggregate(expense_pipeline).to_list(1)
    
    total_income = income_result[0]["total"] if income_result else 0
    total_expenses = expense_result[0]["total"] if expense_result else 0
    income_count = income_result[0]["count"] if income_result else 0
    expense_count = expense_result[0]["count"] if expense_result else 0
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses,
        "income_count": income_count,
        "expense_count": expense_count
    }

@router.get("/monthly-comparison")
async def get_monthly_comparison(months: int = 3, user_id: str = Depends(require_auth)):
    """Get comparison data for multiple months (default: last 3 months)"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    # Limit to max 6 months
    months = min(months, 6)
    
    # Calculate month strings for the requested period
    current_date = datetime.now()
    month_data = []
    
    for i in range(months):
        target_date = current_date - relativedelta(months=i)
        month_str = target_date.strftime("%Y-%m")
        month_label = target_date.strftime("%b %Y")
        
        query = {"user_id": user_id, "date": {"$regex": f"^{month_str}"}}
        
        # Fetch totals for this month
        income_pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        expense_pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        
        income_result = await db.income_entries.aggregate(income_pipeline).to_list(1)
        expense_result = await db.expense_entries.aggregate(expense_pipeline).to_list(1)
        
        total_income = income_result[0]["total"] if income_result else 0
        total_expenses = expense_result[0]["total"] if expense_result else 0
        income_count = income_result[0]["count"] if income_result else 0
        expense_count = expense_result[0]["count"] if expense_result else 0
        
        month_data.append({
            "month": month_str,
            "label": month_label,
            "income": total_income,
            "expenses": total_expenses,
            "profit": total_income - total_expenses,
            "income_count": income_count,
            "expense_count": expense_count
        })
    
    # Reverse so oldest is first (for chart display)
    month_data.reverse()
    
    # Calculate percentage changes (current vs previous month)
    comparison = {}
    if len(month_data) >= 2:
        current = month_data[-1]  # Most recent
        previous = month_data[-2]  # Previous month
        
        def calc_change(current_val, previous_val):
            if previous_val == 0:
                return 100 if current_val > 0 else 0
            return round(((current_val - previous_val) / previous_val) * 100, 1)
        
        comparison = {
            "income_change": calc_change(current["income"], previous["income"]),
            "expense_change": calc_change(current["expenses"], previous["expenses"]),
            "profit_change": calc_change(current["profit"], previous["profit"]) if previous["profit"] != 0 else (100 if current["profit"] > 0 else (-100 if current["profit"] < 0 else 0)),
            "current_month": current["label"],
            "previous_month": previous["label"]
        }
    
    return {
        "months": month_data,
        "comparison": comparison
    }
