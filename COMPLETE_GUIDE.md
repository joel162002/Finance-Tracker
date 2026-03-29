# Finance Tracker - Complete Testing & Usage Guide

## ✅ System Status: CLEAN SLATE

All test data has been cleared. Database is empty and ready for your real data.

---

## 📋 COMPREHENSIVE FEATURE TEST

### 1. ✅ BACKUP & RESTORE (NEW!)

**Export Backup:**
1. Go to Settings → Backup & Restore tab
2. Click "Export Backup"
3. Downloads `finance-backup-YYYY-MM-DD.json`
4. Contains ALL income, expenses, products, categories

**Restore Backup:**
1. Go to Settings → Backup & Restore tab
2. Click "Restore Backup"
3. Select your .json backup file
4. All data restored automatically
5. Page refreshes to show data

**Clear All Data:**
1. Go to Settings → Backup & Restore tab
2. Click "Clear All Data"
3. Confirm deletion
4. All income & expense entries deleted
5. **WARNING**: Cannot be undone!

---

### 2. ✅ INCOME MANAGEMENT

**Add Income:**
1. Click "Add Income" button (green)
2. Fill in:
   - Date (auto-sets day name)
   - Amount (required)
   - Product (with auto-suggest)
   - Customer/Person (with auto-suggest)
   - Payment Status (Paid/Pending)
   - Reference Number (optional)
   - Notes (optional)
3. Click "Add Income"
4. Success toast appears
5. Table updates immediately

**Edit Income:**
1. Find entry in table
2. Click pencil icon (edit button)
3. Modify fields
4. Click "Update Income"
5. Entry updates immediately

**Delete Income:**
1. Find entry in table
2. Click trash icon (delete button)
3. Confirm deletion in popup
4. Entry removed immediately

**Search & Filter:**
- Search box: Finds in product, person, notes
- Month filter: Shows specific month
- Product filter: Filter by product name
- Person filter: Filter by customer
- Status filter: Paid or Pending

**Export:**
- Click "Export CSV"
- Downloads income_{month}.csv
- Open in Excel/Sheets

---

### 3. ✅ EXPENSE MANAGEMENT

**Add Expense:**
1. Click "Add Expense" button (red)
2. Fill in:
   - Date (auto-sets day name)
   - Amount (required)
   - Description (required)
   - Category (with auto-suggest)
   - Payment Method (Cash/GCash/Card/Bank)
   - Reference Number (optional)
   - Notes (optional)
3. Click "Add Expense"
4. Success toast appears
5. Table updates immediately

**Edit Expense:**
1. Find entry in table
2. Click pencil icon
3. Modify fields
4. Click "Update Expense"
5. Entry updates immediately

**Delete Expense:**
1. Find entry in table
2. Click trash icon
3. Confirm deletion
4. Entry removed immediately

**Search & Filter:**
- Search box: Finds in description, category, notes
- Month filter: Shows specific month
- Category filter: Filter by category

**Export:**
- Click "Export CSV"
- Downloads expenses_{month}.csv

---

### 4. ✅ BULK IMPORT

**Import Income/Expenses:**
1. Go to Settings → Import Data tab
2. Select "Income" or "Expense"
3. Paste data in format:
   ```
   2- 489 Motionarray (Gian Mendoza)
   3- 699 ChatGPT Plus (Dave Salvatus)
   21- 100 Food
   ```
4. Click "Parse Data"
5. Review parsed entries
6. Click "Import X Entries"
7. Page refreshes automatically
8. Data appears in tables

**Auto-Categorization (Expenses):**
- Food: food, lunch, dinner, breakfast, ulam, hapunan, umagahan
- Offering: offering, pledge, church
- Gas: gas, fuel, oil
- Grocery: grocery, groceries
- Utilities: bill, water, electric
- Transportation: motor, cabs, taxi, grab
- Personal: baon, personal
- Load: load, prepaid
- Medical: dental, medical, medicine
- Miscellaneous: everything else

---

### 5. ✅ DASHBOARD ANALYTICS

**Summary Cards:**
- Total Income (green)
- Total Expenses (red)
- Net Profit (blue/red based on positive/negative)
- Transactions count

**Charts:**
- Income vs Expenses (line chart by day)
- Income by Product (pie chart, top 6)
- Expenses by Category (pie chart, top 6)

**Lists:**
- Top 5 Customers
- Recent Income (last 5)
- Recent Expenses (last 5)

**Month Filter:**
- Change month to view different periods
- Defaults to current month

---

### 6. ✅ MONTHLY SUMMARY

**Metrics:**
- Total Income
- Total Expenses
- Net Profit
- Savings Rate (%)

**Highlights:**
- Best Earning Day
- Highest Expense Day
- Top Product
- Top Customer
- Biggest Expense Category

**Daily Breakdown:**
- Chart showing income/expenses by day
- Table with daily totals and profit

---

### 7. ✅ REPORTS

**Income by Product:**
- Bar chart
- Table with sales count and total

**Income by Customer:**
- Bar chart
- Table with transaction count and total

**Expenses by Category:**
- Bar chart
- Table with count and total

**Print:**
- Click "Print" button
- Prints current report view

---

### 8. ✅ SETTINGS

**Products:**
- Add/Edit/Delete products
- Used for income entries
- Auto-suggest when adding income

**Expense Categories:**
- Add/Edit/Delete categories
- Used for expense entries
- Auto-suggest when adding expenses

**Import Data:**
- Bulk import income/expenses
- Smart parsing and categorization

**Backup & Restore:**
- Export all data
- Restore from backup
- Clear all data

---

### 9. ✅ MOBILE APP (PWA)

**Install:**
- Tap "Install" popup OR
- Android: Menu → Add to Home Screen
- iOS: Share → Add to Home Screen

**Features:**
- Works offline
- Full-screen app mode
- Home screen icon
- Quick actions

---

## 🔧 TROUBLESHOOTING

**Data not updating?**
- Refresh the page (pull down on mobile)
- Check month filter is set correctly
- Clear browser cache

**Can't delete entry?**
- Check browser console for errors (F12)
- Verify internet connection
- Try refreshing page

**Import not working?**
- Check format: `day- amount description`
- Verify each line has amount and description
- Try with smaller batch first

**Backup/Restore issues?**
- Ensure .json file is valid
- Check file wasn't corrupted
- Re-export if needed

---

## 💡 BEST PRACTICES

1. **Export Backup Weekly**
   - Go to Settings → Backup & Restore
   - Download backup regularly
   - Store in safe location (Google Drive, etc.)

2. **Use Consistent Names**
   - Products: Keep names consistent (Adobe All Apps vs Adobe)
   - Categories: Stick to default categories
   - Customers: Use full names

3. **Add Notes**
   - Use notes field for extra details
   - Helps with tracking and searching
   - Good for reference numbers

4. **Review Monthly**
   - Check Monthly Summary regularly
   - Export reports for records
   - Verify all entries are correct

5. **Clean Data**
   - Delete test entries
   - Fix typos immediately
   - Keep categories organized

---

## 🎯 QUICK START GUIDE

**First Time Setup:**
1. ✅ Install app to home screen (mobile)
2. ✅ Go to Settings → Products (verify default products)
3. ✅ Go to Settings → Categories (verify categories)
4. ✅ Add your first income entry
5. ✅ Add your first expense entry
6. ✅ Check dashboard to verify data shows
7. ✅ Export backup immediately

**Daily Use:**
1. Open app
2. Add Income/Expense as they happen
3. Check dashboard for totals
4. Done!

**Weekly Review:**
1. Go to Dashboard
2. Check income vs expenses
3. Review top customers/products
4. Export backup

**Monthly:**
1. Go to Monthly Summary
2. Review full month
3. Go to Reports for detailed analysis
4. Export data to CSV
5. Export backup

---

**Your Finance Tracker is ready to use! Start with a clean slate.** 🎉
