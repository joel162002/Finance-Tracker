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

### Expense Management
- Full CRUD operations
- Filter by month, search, category
- Export to CSV functionality
- Category dropdown with auto-populate text input

### Settings
- Product management (Add/Edit/Delete)
- Expense category management
- Smart Import feature for bulk data entry
- **Backup & Restore** - Export/Import data as JSON
- **Sync & Refresh** - Clear browser cache and reload fresh data

### PWA Features
- Service worker for offline caching (static assets only)
- **API calls always fetch from network** (never cached)
- Installable as mobile app

## Authentication System (March 31, 2026)

### Premium Auth UI
- Animated glassmorphism design with inline conditional rendering
- Landing page with Google and Email login options
- Sign in / Sign up / Forgot password flows
- Google OAuth via Emergent Integrations
- JWT token-based authentication

### User Data Isolation (FIXED - March 31, 2026)
- All CRUD endpoints require authentication
- MongoDB queries filter by user_id
- New users see empty dashboard (₱0.00)
- Centralized API utility adds Authorization header automatically

## Recent Updates (March 31, 2026)

### P0 Bug Fixes - COMPLETED ✅

1. **Keyboard Bug on Auth Screens (FIXED)**
   - **Root Cause**: Inner component functions (LandingView, SignInView, etc.) were recreated on every state change, causing React to unmount/remount inputs and lose focus
   - **Solution**: Completely rewrote LoginPage.js to use inline conditional rendering with native HTML inputs and individual useState hooks
   - Tested on mobile viewport (390x844) - can type full email/password without keyboard closing
   - All 12 tests passed

2. **User Data Isolation (FIXED)**
   - Added `require_auth` dependency to all CRUD/analytics endpoints
   - All MongoDB queries filter by authenticated user_id
   - New users see empty dashboard
   - 16/16 backend tests passed

3. **Backup/Restore (VERIFIED WORKING)**
   - Export Backup downloads JSON file with user's data only
   - Success toast shows entry count: "Backup created! X income + Y expense entries"
   - Restore uploads and imports data correctly

## Test Credentials
- Main: joeljalapitjr@gmail.com / joelpogi
- Demo: demo@finance.com / demo123

## API Endpoints (All require auth except /auth/*)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with code
- `GET/POST/PUT/DELETE /api/income` - Income CRUD (requires auth)
- `GET/POST/PUT/DELETE /api/expenses` - Expenses CRUD (requires auth)
- `GET /api/analytics/dashboard` - Dashboard analytics (requires auth)
- `GET /api/analytics/quick-summary` - Quick totals (requires auth)
- `DELETE /api/data/clear-all` - Clear user's data (requires auth)

## Future/Backlog Tasks (P2/P3)
1. Recurring income/expense tracking (P2)
2. Monthly budget limits with alerts (P2)
3. Email verification (P2)
4. Multi-currency support (P3)
5. Refactor server.py (~1000 lines) into `/routes` directory (P3)

## Code Architecture
```
/app/
├── backend/
│   ├── server.py              # FastAPI app, MongoDB, Auth & CRUD routes
│   ├── requirements.txt
│   └── .env                   # MONGO_URL, DB_NAME
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js   # Inline conditional rendering (FIXED)
│   │   │   ├── DashboardPage.js
│   │   │   └── ...
│   │   ├── components/
│   │   │   └── BackupRestore.js
│   │   ├── utils/
│   │   │   └── api.js         # Axios with auth interceptor
│   │   └── context/
│   │       └── AuthContext.js
│   └── package.json
└── test_reports/
    ├── iteration_3.json       # User data isolation tests
    └── iteration_4.json       # Keyboard & backup tests
```
