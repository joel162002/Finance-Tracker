# KitaTracker - Product Requirements Document

## Original Problem Statement
Build a clean, modern, mobile-friendly web application for personal business finance tracking (KitaTracker). Core features include Dashboard, Income/Expense CRUD, Monthly Summaries, Reports, Settings, Smart Import, PWA offline support, and Premium Authentication UI.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Motor (Async MongoDB)
- **Database**: MongoDB
- **PWA**: Service Worker + Manifest
- **Authentication**: JWT tokens, Google OAuth via Emergent Integrations

## Core Features Implemented

### Dashboard
- Summary cards with totals
- Interactive charts (Recharts)
- User data isolation - each user sees only their data

### Income/Expense Management
- Full CRUD operations
- Multi-currency support (10 currencies)
- Filter by month, search, category
- Export to CSV

### Multi-Currency Support (NEW - March 31, 2026)
Supported currencies:
- **PHP** (₱) - Philippine Peso
- **USD** ($) - US Dollar
- **EUR** (€) - Euro
- **GBP** (£) - British Pound
- **JPY** (¥) - Japanese Yen
- **CNY** (¥) - Chinese Yuan
- **KRW** (₩) - Korean Won
- **SGD** (S$) - Singapore Dollar
- **AUD** (A$) - Australian Dollar
- **CAD** (C$) - Canadian Dollar

User can set default currency in Settings > Currency tab.

### Email Verification (NEW - March 31, 2026)
- 6-digit verification code sent during signup
- User must verify email before accessing app
- Demo mode: code displayed on screen
- Resend code option
- 15-minute code expiry

### Backup & Restore (IMPROVED - March 31, 2026)
- **Export**: Download all data as JSON
- **Restore**: Confirmation dialog with backup details
- **REPLACES existing data** (not additive)
- Loading modal during restore with Cancel button
- Progress indicator showing import status
- Cannot dismiss modal by clicking outside

### Settings
- Products management
- Categories management
- **Currency settings** (NEW)
- Smart Import
- Backup & Restore

### Authentication
- Premium glassmorphism UI
- Email/Password login
- **Email verification** (NEW)
- Google OAuth via Emergent
- Forgot password flow
- JWT tokens

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (returns verification code)
- `POST /api/auth/send-verification` - Resend verification code
- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/google/callback` - Google OAuth callback

### User Settings
- `GET /api/user/settings` - Get user settings (currency, etc.)
- `PUT /api/user/settings` - Update user settings
- `GET /api/currencies` - Get supported currencies list

### Data (all require auth)
- `GET/POST/PUT/DELETE /api/income` - Income CRUD
- `GET/POST/PUT/DELETE /api/expenses` - Expenses CRUD
- `GET /api/analytics/dashboard` - Dashboard data
- `DELETE /api/data/clear-all` - Clear all user data

## Database Schema

### users
```json
{
  "id": "user_xxx",
  "email": "user@example.com",
  "password": "hashed",
  "username": "username",
  "email_verified": true/false,
  "created_at": "ISO date"
}
```

### user_settings
```json
{
  "user_id": "user_xxx",
  "default_currency": "PHP"
}
```

### income_entries / expense_entries
```json
{
  "id": "uuid",
  "user_id": "user_xxx",
  "date": "2024-03-31",
  "amount": 1000,
  "currency": "PHP",
  ...
}
```

### email_verifications
```json
{
  "email": "user@example.com",
  "verification_code": "123456",
  "user_id": "user_xxx",
  "expires_at": "ISO date"
}
```

## Test Credentials
- Main: joeljalapitjr@gmail.com / joelpogi
- Demo: demo@finance.com / demo123

## Recent Updates (March 31, 2026)
1. ✅ Multi-currency support (10 currencies)
2. ✅ Email verification during signup
3. ✅ Backup restore improvements (replace not add, confirmation dialog, loading modal)

## Future/Backlog
- Recurring income/expense tracking (P2)
- Monthly budget limits with alerts (P2)
- Refactor server.py into /routes directory (P3)
