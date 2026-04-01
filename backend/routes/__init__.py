"""
Routes package - contains all API route modules
"""
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.income import router as income_router
from routes.expenses import router as expenses_router
from routes.recurring import router as recurring_router
from routes.budgets import router as budgets_router
from routes.notifications import router as notifications_router
from routes.analytics import router as analytics_router
from routes.misc import router as misc_router

__all__ = [
    'auth_router',
    'users_router', 
    'income_router',
    'expenses_router',
    'recurring_router',
    'budgets_router',
    'notifications_router',
    'analytics_router',
    'misc_router'
]
