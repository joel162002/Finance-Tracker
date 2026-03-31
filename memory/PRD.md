# KitaTracker - Product Requirements Document

## Original Problem Statement
Build a clean, modern, mobile-friendly web application for personal business finance tracking (KitaTracker). Core features include Dashboard, Income/Expense CRUD, Recurring Transactions, Budget Limits, Monthly Summaries, Reports, Settings, Smart Import, PWA offline support, and Premium Authentication UI.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Motor (Async MongoDB)
- **Database**: MongoDB
- **PWA**: Service Worker + Manifest
- **Authentication**: JWT tokens, Google OAuth via Emergent Integrations

## Core Features

### Dashboard
- Summary cards (Total Income, Expenses, Net Profit, Transactions)
- Interactive charts (Income vs Expenses line chart)
- Top Customers list
- Month selector
- **Currency selector in header** (quick access)

### Income/Expense Management
- Full CRUD operations
- Multi-currency support per entry
- Filter by month, search, category
- Export to CSV
- Product/Category dropdowns

### Recurring Transactions (NEW - March 31, 2026)
- Manage recurring income and expenses
- Frequencies: Daily, Weekly, Monthly, Yearly
- Start/End dates
- Pause/Resume functionality
- Separate cards for income vs expenses

### Budget Limits (NEW - March 31, 2026)
- Set spending limits by category or total
- Monthly budget periods
- Progress bar visualization
- Alert thresholds (default 80%)
- Real-time alerts:
  - Warning when approaching limit (yellow)
  - Over budget alert (red)
- Spending breakdown by category

### Multi-Currency Support (10 currencies)
- PHP (₱), USD ($), EUR (€), GBP (£), JPY (¥)
- CNY (¥), KRW (₩), SGD (S$), AUD (A$), CAD (C$)
- **Currency selector in header** for quick switching
- Per-entry currency selection
- User default currency in settings

### Email Verification
- 6-digit code during signup
- Must verify before accessing app
- Demo mode: code shown on screen
- Resend option, 15-minute expiry

### Backup & Restore
- Export all data as JSON (v2.0 format)
- **Replaces existing data** on restore (not additive)
- Confirmation dialog with backup details
- Loading modal with progress + Cancel button

### Settings
- Products management
- Categories management
- Currency settings (grid view)
- Smart Import
- Backup & Restore

### Authentication
- Premium glassmorphism UI
- Email/Password + Email verification
- Google OAuth
- Forgot password flow
- JWT tokens

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (returns verification code)
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/send-verification` - Resend code
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/google/callback` - Google OAuth

### User Settings
- `GET /api/user/settings` - Get settings
- `PUT /api/user/settings` - Update settings
- `GET /api/currencies` - Get supported currencies

### Recurring Transactions
- `GET /api/recurring` - List all
- `POST /api/recurring` - Create
- `PUT /api/recurring/{id}` - Update
- `DELETE /api/recurring/{id}` - Delete
- `POST /api/recurring/{id}/toggle` - Pause/Resume

### Budget Limits
- `GET /api/budgets` - List budgets
- `GET /api/budgets/status` - Get status with spending
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/{id}` - Update
- `DELETE /api/budgets/{id}` - Delete

### Data (all require auth)
- `GET/POST/PUT/DELETE /api/income` - Income CRUD
- `GET/POST/PUT/DELETE /api/expenses` - Expenses CRUD
- `GET /api/analytics/dashboard` - Dashboard data
- `DELETE /api/data/clear-all` - Clear user data

## Database Collections
- `users` - User accounts
- `user_settings` - User preferences (currency, etc.)
- `income_entries` - Income records
- `expense_entries` - Expense records
- `recurring_transactions` - Recurring setups
- `budget_limits` - Budget configurations
- `email_verifications` - Verification codes
- `user_sessions` - OAuth sessions

## Navigation
- Dashboard
- Income
- Expenses
- **Recurring** (NEW)
- **Budgets** (NEW)
- Reports
- Settings

## Test Credentials
- Main: joeljalapitjr@gmail.com / joelpogi
- Demo: demo@finance.com / demo123

## Recent Updates (March 31, 2026)
1. ✅ Recurring transactions (income/expenses)
2. ✅ Budget limits with alerts
3. ✅ Currency selector in header
4. ✅ Multi-currency support (10 currencies)
5. ✅ Email verification during signup
6. ✅ Backup restore improvements (replace mode)
7. ✅ **Fixed global currency formatting** - Currency symbol now updates across all pages (Dashboard, Income, Expenses, Reports, Budgets, Recurring) when changed from header
8. ✅ **Removed redundant Currency tab from Settings** - Currency selection is now only in the header
9. ✅ **User Profile Management** - Clickable profile in header with options to edit name, change password, and delete account

## Future/Backlog
- Auto-generate entries from recurring (cron job)
- Email notifications for budget alerts
- Refactor server.py into /routes directory
