# KitaTracker - Product Requirements Document

## Original Problem Statement
Build a clean, modern, mobile-friendly web application for personal business finance tracking (KitaTracker). Core features include Dashboard (summary cards, charts), Income/Expense CRUD, Monthly Summaries, Reports, Settings, a "Smart paste-to-import" tool, Progressive Web App (PWA) offline support, and a Premium Authentication UI.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Motor (Async MongoDB)
- **Database**: MongoDB
- **PWA**: Service Worker + Manifest for offline capability
- **Authentication**: JWT tokens, Google OAuth via Emergent Integrations

## Core Features Implemented

### Dashboard
- Summary cards showing total income, expenses, and net balance
- Interactive charts (pie charts, bar charts) using Recharts
- Mobile-optimized layout with responsive chart legends
- Auto-refresh when data changes via DataContext
- **User Data Isolation**: Each user sees only their own data

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

## Authentication System (March 31, 2026)

### Premium Auth UI
- Animated glassmorphism design
- Landing page with Google and Email login options
- Sign in / Sign up / Forgot password flows
- Google OAuth via Emergent Integrations
- JWT token-based authentication

### User Data Isolation (FIXED - March 31, 2026)
- All CRUD endpoints require authentication
- MongoDB queries filter by user_id
- New users see empty dashboard (₱0.00)
- Each user's data is completely isolated
- Centralized API utility adds Authorization header automatically

### Security
- Unauthenticated requests return 401
- Password reset with 6-digit code (15-minute expiry)
- Session management with logout

## Database Schema
- `users`: {id, user_id, email, password, name, username, created_at}
- `products`: {name, description}
- `expense_categories`: {name, description}
- `income_entries`: {date, day, amount, product_name, person_name, payment_status, notes, **user_id**}
- `expense_entries`: {date, day, amount, description, category_name, payment_method, notes, **user_id**}
- `user_sessions`: {user_id, session_token, expires_at}
- `password_resets`: {email, reset_code, expires_at}

## API Endpoints
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with code
- `POST /api/auth/google/callback` - Google OAuth callback
- `GET/POST/PUT/DELETE /api/income` - Income CRUD (requires auth)
- `GET/POST/PUT/DELETE /api/expenses` - Expenses CRUD (requires auth)
- `GET/POST/PUT/DELETE /api/products` - Products CRUD
- `GET/POST/PUT/DELETE /api/categories` - Categories CRUD
- `GET /api/analytics/dashboard` - Dashboard analytics (requires auth)
- `GET /api/analytics/monthly` - Monthly analytics (requires auth)
- `GET /api/analytics/reports` - Reports data (requires auth)
- `GET /api/analytics/quick-summary` - Quick totals (requires auth)
- `GET /api/suggestions/*` - Autocomplete suggestions (requires auth)
- `GET /api/export/income` - Export income CSV (requires auth)
- `GET /api/export/expenses` - Export expenses CSV (requires auth)
- `DELETE /api/data/clear-all` - Clear user's data (requires auth)

## Recent Updates (March 31, 2026)

### P0 Bug Fixes
1. **User Data Isolation (FIXED)**
   - Added `require_auth` dependency to all CRUD/analytics endpoints
   - All MongoDB queries filter by authenticated user_id
   - New users see empty dashboard
   - Test confirmed: 16/16 backend tests passed

2. **Keyboard Bug on Auth Screens (FIXED)**
   - Input components use memo() to prevent re-renders
   - Handlers use useCallback() for stable references
   - Tested on mobile viewport (390x844)

### Earlier Fixes
- Data sync bug: Service worker now excludes `/api/*` from caching
- Added `Cache-Control: no-store` headers to all API responses
- Added password verification to login
- Created user account system
- Database indexes for faster queries

## Test Credentials
- Main: joeljalapitjr@gmail.com / joelpogi
- Demo: demo@finance.com / demo123

## Future/Backlog Tasks (P2/P3)
1. Recurring income/expense tracking (P2)
2. Monthly budget limits with alerts (P2)
3. Email verification (P2)
4. Multi-currency support (P3)
5. Data visualization enhancements (P3)

## Code Architecture
```
/app/
├── backend/
│   ├── server.py              # FastAPI app, MongoDB, Auth & CRUD routes
│   ├── tests/                 # Pytest tests for user data isolation
│   ├── requirements.txt
│   └── .env                   # MONGO_URL, DB_NAME
├── frontend/
│   ├── public/
│   │   ├── manifest.json      # PWA config (KitaTracker)
│   │   ├── service-worker.js  # PWA offline cache (API excluded)
│   │   └── logo...            # KitaTracker logos
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   ├── Layout.js
│   │   │   └── BackupRestore.js
│   │   ├── pages/
│   │   │   ├── DashboardPage.js
│   │   │   ├── IncomePage.js
│   │   │   ├── ExpensesPage.js
│   │   │   ├── LoginPage.js   # Premium Auth UI (memo/useCallback)
│   │   │   └── AuthCallback.js
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── DataContext.js
│   │   ├── utils/
│   │   │   └── api.js         # Centralized axios with auth interceptor
│   │   └── App.js
│   └── package.json
└── test_reports/
```
