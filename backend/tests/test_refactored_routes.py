"""
Comprehensive tests for KitaTracker refactored routes
Tests all CRUD operations for: auth, income, expenses, budgets, recurring, notifications, analytics, users
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_EMAIL = "demo@finance.com"
DEMO_PASSWORD = "demo123"

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with demo account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_logout(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        print("✓ Logout endpoint works")


class TestIncomeCRUD:
    """Income CRUD operations tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_income_list(self):
        """Test getting income list"""
        response = requests.get(f"{BASE_URL}/api/income", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} income entries")
    
    def test_create_income(self):
        """Test creating income entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        income_data = {
            "date": today,
            "day": day_name,
            "amount": 1500.00,
            "currency": "PHP",
            "product_name": "TEST_Product",
            "person_name": "TEST_Customer",
            "notes": "Test income entry",
            "payment_status": "Paid"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=income_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 1500.00
        assert data["product_name"] == "TEST_Product"
        assert "id" in data
        print(f"✓ Created income entry: {data['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/income", headers=self.headers)
        assert get_response.status_code == 200
        entries = get_response.json()
        created_entry = next((e for e in entries if e["id"] == data["id"]), None)
        assert created_entry is not None
        assert created_entry["amount"] == 1500.00
        print("✓ Income entry persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/income/{data['id']}", headers=self.headers)
    
    def test_update_income(self):
        """Test updating income entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/income", json={
            "date": today,
            "day": day_name,
            "amount": 1000.00,
            "product_name": "TEST_UpdateProduct",
            "person_name": "TEST_UpdateCustomer"
        }, headers=self.headers)
        income_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/income/{income_id}", json={
            "amount": 2000.00,
            "notes": "Updated amount"
        }, headers=self.headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["amount"] == 2000.00
        print(f"✓ Updated income entry: {income_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/income/{income_id}", headers=self.headers)
    
    def test_delete_income(self):
        """Test deleting income entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/income", json={
            "date": today,
            "day": day_name,
            "amount": 500.00,
            "product_name": "TEST_DeleteProduct",
            "person_name": "TEST_DeleteCustomer"
        }, headers=self.headers)
        income_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/income/{income_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted income entry: {income_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/income", headers=self.headers)
        entries = get_response.json()
        deleted_entry = next((e for e in entries if e["id"] == income_id), None)
        assert deleted_entry is None
        print("✓ Income entry deleted correctly")
    
    def test_income_requires_auth(self):
        """Test that income endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/income")
        assert response.status_code == 401
        print("✓ Income endpoints require authentication")


class TestExpensesCRUD:
    """Expense CRUD operations tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_expenses_list(self):
        """Test getting expenses list"""
        response = requests.get(f"{BASE_URL}/api/expenses", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} expense entries")
    
    def test_create_expense(self):
        """Test creating expense entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        expense_data = {
            "date": today,
            "day": day_name,
            "amount": 500.00,
            "currency": "PHP",
            "description": "TEST_Expense",
            "category_name": "TEST_Category",
            "notes": "Test expense entry",
            "payment_method": "Cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/expenses", json=expense_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 500.00
        assert data["description"] == "TEST_Expense"
        assert "id" in data
        print(f"✓ Created expense entry: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{data['id']}", headers=self.headers)
    
    def test_update_expense(self):
        """Test updating expense entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/expenses", json={
            "date": today,
            "day": day_name,
            "amount": 300.00,
            "description": "TEST_UpdateExpense",
            "category_name": "TEST_UpdateCategory"
        }, headers=self.headers)
        expense_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/expenses/{expense_id}", json={
            "amount": 600.00,
            "notes": "Updated amount"
        }, headers=self.headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["amount"] == 600.00
        print(f"✓ Updated expense entry: {expense_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}", headers=self.headers)
    
    def test_delete_expense(self):
        """Test deleting expense entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        day_name = datetime.now().strftime("%A")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/expenses", json={
            "date": today,
            "day": day_name,
            "amount": 200.00,
            "description": "TEST_DeleteExpense",
            "category_name": "TEST_DeleteCategory"
        }, headers=self.headers)
        expense_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/expenses/{expense_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted expense entry: {expense_id}")


class TestBudgets:
    """Budget endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_budgets(self):
        """Test getting budgets list"""
        response = requests.get(f"{BASE_URL}/api/budgets", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} budgets")
    
    def test_create_budget(self):
        """Test creating budget"""
        current_month = datetime.now().strftime("%Y-%m")
        
        budget_data = {
            "category": "TEST_BudgetCategory",
            "month": current_month,
            "limit_amount": 5000.00,
            "currency": "PHP",
            "alert_threshold": 80.0
        }
        
        response = requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["limit_amount"] == 5000.00
        assert "id" in data
        print(f"✓ Created budget: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budgets/{data['id']}", headers=self.headers)
    
    def test_get_budget_status(self):
        """Test getting budget status"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/budgets/status?month={current_month}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "budgets" in data
        assert "total_spending" in data
        print(f"✓ Got budget status for {current_month}")
    
    def test_update_budget(self):
        """Test updating budget"""
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/budgets", json={
            "category": "TEST_UpdateBudget",
            "month": current_month,
            "limit_amount": 3000.00
        }, headers=self.headers)
        budget_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/budgets/{budget_id}", json={
            "limit_amount": 4000.00
        }, headers=self.headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["limit_amount"] == 4000.00
        print(f"✓ Updated budget: {budget_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/budgets/{budget_id}", headers=self.headers)
    
    def test_delete_budget(self):
        """Test deleting budget"""
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/budgets", json={
            "category": "TEST_DeleteBudget",
            "month": current_month,
            "limit_amount": 2000.00
        }, headers=self.headers)
        budget_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/budgets/{budget_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted budget: {budget_id}")


class TestRecurringTransactions:
    """Recurring transactions tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_recurring_transactions(self):
        """Test getting recurring transactions list"""
        response = requests.get(f"{BASE_URL}/api/recurring", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} recurring transactions")
    
    def test_create_recurring_transaction(self):
        """Test creating recurring transaction"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        recurring_data = {
            "type": "expense",
            "amount": 1000.00,
            "currency": "PHP",
            "description": "TEST_RecurringExpense",
            "category_or_product": "TEST_RecurringCategory",
            "frequency": "monthly",
            "start_date": today
        }
        
        response = requests.post(f"{BASE_URL}/api/recurring", json=recurring_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 1000.00
        assert data["frequency"] == "monthly"
        assert "id" in data
        print(f"✓ Created recurring transaction: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/recurring/{data['id']}", headers=self.headers)
    
    def test_toggle_recurring_transaction(self):
        """Test toggling recurring transaction active status"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/recurring", json={
            "type": "income",
            "amount": 500.00,
            "description": "TEST_ToggleRecurring",
            "category_or_product": "TEST_ToggleProduct",
            "frequency": "weekly",
            "start_date": today
        }, headers=self.headers)
        trans_id = create_response.json()["id"]
        
        # Toggle
        toggle_response = requests.post(f"{BASE_URL}/api/recurring/{trans_id}/toggle", headers=self.headers)
        assert toggle_response.status_code == 200
        toggle_data = toggle_response.json()
        assert "is_active" in toggle_data
        print(f"✓ Toggled recurring transaction: {trans_id}, is_active: {toggle_data['is_active']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/recurring/{trans_id}", headers=self.headers)
    
    def test_generate_recurring_entries(self):
        """Test generating entries from recurring transactions"""
        response = requests.post(f"{BASE_URL}/api/recurring/generate", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "income_count" in data
        assert "expense_count" in data
        print(f"✓ Generated recurring entries: {data['income_count']} income, {data['expense_count']} expense")


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_notifications(self):
        """Test getting notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"✓ Got {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notification_preferences(self):
        """Test getting notification preferences"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "enable_notifications" in data or "user_id" in data
        print(f"✓ Got notification preferences")
    
    def test_update_notification_preferences(self):
        """Test updating notification preferences"""
        response = requests.put(f"{BASE_URL}/api/notifications/preferences", json={
            "enable_notifications": True,
            "budget_alerts": True,
            "threshold_warning": 75
        }, headers=self.headers)
        assert response.status_code == 200
        print("✓ Updated notification preferences")
    
    def test_check_recurring_notifications(self):
        """Test checking for recurring notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications/check-recurring", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications_created" in data
        print(f"✓ Checked recurring notifications: {data['notifications_created']} created")
    
    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        response = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=self.headers)
        assert response.status_code == 200
        print("✓ Marked all notifications as read")


class TestAnalytics:
    """Analytics and dashboard tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard_analytics(self):
        """Test getting dashboard analytics"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_profit" in data
        print(f"✓ Dashboard: Income={data['total_income']}, Expenses={data['total_expenses']}, Profit={data['net_profit']}")
    
    def test_get_monthly_analytics(self):
        """Test getting monthly analytics"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/analytics/monthly?month={current_month}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "total_income" in data
        assert "total_expenses" in data
        print(f"✓ Monthly analytics for {current_month}")
    
    def test_get_reports(self):
        """Test getting reports"""
        response = requests.get(f"{BASE_URL}/api/analytics/reports", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "income_by_product" in data
        assert "income_by_person" in data
        assert "expenses_by_category" in data
        print("✓ Got reports data")
    
    def test_get_quick_summary(self):
        """Test getting quick summary"""
        response = requests.get(f"{BASE_URL}/api/analytics/quick-summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_profit" in data
        print(f"✓ Quick summary: Profit={data['net_profit']}")


class TestUserProfile:
    """User profile and settings tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        response = requests.get(f"{BASE_URL}/api/user/profile", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == DEMO_EMAIL
        print(f"✓ Got user profile: {data['email']}")
    
    def test_get_user_settings(self):
        """Test getting user settings"""
        response = requests.get(f"{BASE_URL}/api/user/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "default_currency" in data or "user_id" in data
        print("✓ Got user settings")
    
    def test_update_user_settings(self):
        """Test updating user settings"""
        response = requests.put(f"{BASE_URL}/api/user/settings", json={
            "default_currency": "PHP"
        }, headers=self.headers)
        assert response.status_code == 200
        print("✓ Updated user settings")


class TestMiscEndpoints:
    """Miscellaneous endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_currencies(self):
        """Test getting supported currencies"""
        response = requests.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        data = response.json()
        assert "currencies" in data
        assert "supported" in data
        assert "PHP" in data["supported"]
        print(f"✓ Got {len(data['supported'])} supported currencies")
    
    def test_get_products(self):
        """Test getting products list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} products")
    
    def test_get_categories(self):
        """Test getting categories list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} categories")
    
    def test_get_product_suggestions(self):
        """Test getting product suggestions"""
        response = requests.get(f"{BASE_URL}/api/suggestions/products", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"✓ Got {len(data['suggestions'])} product suggestions")
    
    def test_get_person_suggestions(self):
        """Test getting person suggestions"""
        response = requests.get(f"{BASE_URL}/api/suggestions/persons", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"✓ Got {len(data['suggestions'])} person suggestions")
    
    def test_get_category_suggestions(self):
        """Test getting category suggestions"""
        response = requests.get(f"{BASE_URL}/api/suggestions/categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"✓ Got {len(data['suggestions'])} category suggestions")
    
    def test_parse_import(self):
        """Test parsing import text"""
        response = requests.post(f"{BASE_URL}/api/import/parse", json={
            "raw_text": "1- 500 Product A (Customer X)\n2- 1k Product B",
            "entry_type": "income"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        print(f"✓ Parsed {len(data)} import entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
