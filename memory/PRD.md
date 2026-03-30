# Income & Expense Tracker - Product Requirements Document

## Original Problem Statement
Build a clean, modern, mobile-friendly web application for personal business finance tracking (Income & Expense Tracker). Core features include Dashboard (summary cards, charts), Income/Expense CRUD, Monthly Summaries, Reports, Settings, and a "Smart paste-to-import" tool to convert raw text logs into structured entries.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Motor (Async MongoDB)
- **Database**: MongoDB
- **PWA**: Service Worker + Manifest for offline capability

## Core Features Implemented

### Dashboard
- Summary cards showing total income, expenses, and net balance
- Interactive charts (pie charts, bar charts) using Recharts
- Mobile-optimized layout with responsive chart legends
- Auto-refresh when data changes via DataContext

### Income Management
- Full CRUD operations (Create, Read, Update, Delete)
- Filter by month, search, product, person, payment status
- Export to CSV functionality
- Product dropdown with auto-populate text input
- Customer/Person dropdown with auto-populate text input
- "Saving..." loading state on submit button

### Expense Management
- Full CRUD operations
- Filter by month, search, category
- Export to CSV functionality
- Category dropdown with auto-populate text input
- Payment method selection (Cash, GCash, Card, Bank Transfer)
- "Saving..." loading state on submit button

### Monthly Summary
- Monthly breakdown of income and expenses
- Visual charts for trend analysis

### Reports
- Comprehensive financial reports
- Export capabilities

### Settings
- Product management (Add/Edit/Delete)
- Expense category management
- Smart Import feature for bulk data entry
- Database backup and restore functionality
- **Sync & Refresh** - Clear browser cache and reload fresh data
- Mobile-responsive tabs with horizontal scrolling

### Smart Import
- Parse raw text into structured income/expense entries
- Auto-categorization for expenses
- Support for various formats (day-amount-description)

### PWA Features
- Service worker for offline caching (static assets only)
- **API calls always fetch from network** (never cached)
- Installable as mobile app
- Manifest for app appearance

## Authentication
- Password-verified login
- Main account: joeljalapitjr@gmail.com / joelpogi
- Demo account: demo@finance.com / demo123

## Database Schema
- `users`: {id, email, password, name, created_at}
- `products`: {name, description}
- `expense_categories`: {name, description}
- `income_entries`: {date, day, amount, product_name, person_name, payment_status, notes}
- `expense_entries`: {date, day, amount, description, category_name, payment_method, notes}

## API Endpoints
- GET/POST/PUT/DELETE `/api/income`
- GET/POST/PUT/DELETE `/api/expenses`
- GET/POST/PUT/DELETE `/api/products`
- GET/POST/PUT/DELETE `/api/categories`
- GET `/api/dashboard/summary`
- GET `/api/analytics/dashboard`
- GET `/api/analytics/quick-summary`
- DELETE `/api/data/clear-all`
- POST `/api/auth/login`

## Recent Updates (March 30, 2026)

### Data Sync Bug Fix (CRITICAL)
- **Root Cause**: Service worker was caching API responses, causing each browser to show different data
- **Fix**: Service worker now excludes `/api/*` from caching
- **Fix**: Added `Cache-Control: no-store` headers to all API responses
- **Fix**: Added "Sync & Refresh" button to manually clear browser cache

### Other Fixes
- Added password verification to login
- Created user account system
- Improved data loading with "Saving..." states
- Database indexes for faster queries

## Future/Backlog Tasks (P2/P3)
1. Recurring income/expense tracking (P2)
2. Monthly budget limits with alerts (P2)
3. Multi-currency support (P3)
4. Data visualization enhancements

## Test Credentials
- Main: joeljalapitjr@gmail.com / joelpogi
- Demo: demo@finance.com / demo123
