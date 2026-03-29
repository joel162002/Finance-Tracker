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

### Income Management
- Full CRUD operations (Create, Read, Update, Delete)
- Filter by month, search, product, person, payment status
- Export to CSV functionality
- Product dropdown with auto-populate text input
- Customer/Person dropdown with auto-populate text input

### Expense Management
- Full CRUD operations
- Filter by month, search, category
- Export to CSV functionality
- Category dropdown with auto-populate text input
- Payment method selection (Cash, GCash, Card, Bank Transfer)

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
- Mobile-responsive tabs with horizontal scrolling

### Smart Import
- Parse raw text into structured income/expense entries
- Auto-categorization for expenses
- Support for various formats (day-amount-description)

### PWA Features
- Service worker for offline caching
- Installable as mobile app
- Manifest for app appearance

## Authentication
- **MOCKED**: Uses hardcoded demo user (demo@finance.com / demo123)
- Context-based auth state management

## Database Schema
- `users`: Mock user data
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
- GET `/api/dashboard/analytics`
- GET `/api/suggestions/products`
- GET `/api/suggestions/persons`
- GET `/api/suggestions/categories`
- POST `/api/import/parse`
- GET `/api/export/income`
- GET `/api/export/expenses`

## Recent Updates (March 29, 2026)
- Fixed dropdown functionality: Replaced HTML datalist with Shadcn Select components
- Dropdowns now properly populate corresponding text input fields when item selected
- Settings page tabs are horizontally scrollable on mobile
- All CRUD operations verified working
- Mobile responsiveness verified across all pages

## Future/Backlog Tasks (P2/P3)
1. Recurring income/expense tracking (P2)
2. Monthly budget limits with alerts (P2)
3. Multi-currency support (P3)
4. Real authentication integration (optional)
5. Data visualization enhancements

## Test Credentials
- Email: demo@finance.com
- Password: demo123
