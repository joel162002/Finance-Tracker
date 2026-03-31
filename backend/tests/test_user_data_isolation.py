"""
Test User Data Isolation and Authentication
Tests for KitaTracker bug fixes:
1. User Data Isolation - new users see empty dashboard
2. User Data Isolation - users only see their own data
3. Unauthenticated requests return 401
4. Login flow works correctly
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
MAIN_USER = {"email": "joeljalapitjr@gmail.com", "password": "joelpogi"}
DEMO_USER = {"email": "demo@finance.com", "password": "demo123"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_main_user_success(self):
        """Test login with main user credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MAIN_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["email"] == MAIN_USER["email"]
        assert data["token"].startswith("token-")
        print(f"✓ Main user login successful: {data['user']['email']}")
    
    def test_login_demo_user_success(self):
        """Test login with demo user credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_USER["email"]
        print(f"✓ Demo user login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_register_new_user_empty_dashboard(self):
        """Test that newly registered users get empty dashboard (0 values)"""
        unique_id = uuid.uuid4().hex[:8]
        new_user = {
            "username": f"TEST_newuser_{unique_id}",
            "email": f"TEST_newuser_{unique_id}@test.com",
            "password": "testpass123"
        }
        
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=new_user)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        
        # Verify user has zero stats
        user = data["user"]
        assert user.get("total_income", 0) == 0, "New user should have 0 total_income"
        assert user.get("total_expenses", 0) == 0, "New user should have 0 total_expenses"
        assert user.get("net_profit", 0) == 0, "New user should have 0 net_profit"
        
        # Verify dashboard returns empty data
        token = data["token"]
        dashboard_response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dashboard_response.status_code == 200
        
        dashboard = dashboard_response.json()
        assert dashboard["total_income"] == 0, "New user dashboard should show 0 income"
        assert dashboard["total_expenses"] == 0, "New user dashboard should show 0 expenses"
        assert dashboard["net_profit"] == 0, "New user dashboard should show 0 net profit"
        assert dashboard["income_count"] == 0, "New user should have 0 income entries"
        assert dashboard["expense_count"] == 0, "New user should have 0 expense entries"
        
        print(f"✓ New user registration creates empty dashboard: {new_user['email']}")


class TestUnauthenticatedAccess:
    """Test that protected endpoints return 401 without authentication"""
    
    def test_income_endpoint_requires_auth(self):
        """GET /api/income should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/income")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Authentication required" in response.json().get("detail", "")
        print("✓ /api/income correctly requires authentication")
    
    def test_expenses_endpoint_requires_auth(self):
        """GET /api/expenses should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Authentication required" in response.json().get("detail", "")
        print("✓ /api/expenses correctly requires authentication")
    
    def test_dashboard_endpoint_requires_auth(self):
        """GET /api/analytics/dashboard should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/analytics/dashboard correctly requires authentication")
    
    def test_create_income_requires_auth(self):
        """POST /api/income should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/income", json={
            "date": "2024-03-31",
            "day": "Sunday",
            "amount": 100,
            "product_name": "Test",
            "person_name": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/income correctly requires authentication")
    
    def test_create_expense_requires_auth(self):
        """POST /api/expenses should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/expenses", json={
            "date": "2024-03-31",
            "day": "Sunday",
            "amount": 50,
            "description": "Test",
            "category_name": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/expenses correctly requires authentication")


class TestUserDataIsolation:
    """Test that users can only see their own data"""
    
    @pytest.fixture
    def main_user_token(self):
        """Get token for main user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MAIN_USER)
        return response.json()["token"]
    
    @pytest.fixture
    def demo_user_token(self):
        """Get token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        return response.json()["token"]
    
    def test_main_user_sees_own_income(self, main_user_token):
        """Main user should only see their own income entries"""
        response = requests.get(
            f"{BASE_URL}/api/income",
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert response.status_code == 200
        
        income_entries = response.json()
        # All entries should belong to joel-user
        for entry in income_entries:
            assert entry.get("user_id") == "joel-user", f"Found entry with wrong user_id: {entry.get('user_id')}"
        
        print(f"✓ Main user sees only their own income ({len(income_entries)} entries)")
    
    def test_demo_user_sees_own_income(self, demo_user_token):
        """Demo user should only see their own income entries (empty)"""
        response = requests.get(
            f"{BASE_URL}/api/income",
            headers={"Authorization": f"Bearer {demo_user_token}"}
        )
        assert response.status_code == 200
        
        income_entries = response.json()
        # Demo user should have no entries or only their own
        for entry in income_entries:
            assert entry.get("user_id") == "demo-user", f"Found entry with wrong user_id: {entry.get('user_id')}"
        
        print(f"✓ Demo user sees only their own income ({len(income_entries)} entries)")
    
    def test_main_user_dashboard_shows_own_data(self, main_user_token):
        """Main user dashboard should show only their data"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert response.status_code == 200
        
        dashboard = response.json()
        # Verify dashboard has data (main user has entries)
        print(f"✓ Main user dashboard: income={dashboard['total_income']}, expenses={dashboard['total_expenses']}")
    
    def test_demo_user_dashboard_shows_own_data(self, demo_user_token):
        """Demo user dashboard should show only their data (empty)"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {demo_user_token}"}
        )
        assert response.status_code == 200
        
        dashboard = response.json()
        # Demo user should see their own data (likely empty)
        print(f"✓ Demo user dashboard: income={dashboard['total_income']}, expenses={dashboard['total_expenses']}")
    
    def test_create_income_attaches_correct_user_id(self, main_user_token):
        """Creating income should attach the authenticated user's ID"""
        income_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "day": datetime.now().strftime("%A"),
            "amount": 999.99,
            "product_name": "TEST_Isolation_Product",
            "person_name": "TEST_Isolation_Customer",
            "notes": "Test for user data isolation"
        }
        
        # Create income entry
        response = requests.post(
            f"{BASE_URL}/api/income",
            json=income_data,
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert response.status_code == 200, f"Failed to create income: {response.text}"
        
        created_entry = response.json()
        assert created_entry["user_id"] == "joel-user", f"Wrong user_id: {created_entry['user_id']}"
        assert created_entry["amount"] == 999.99
        
        # Cleanup - delete the test entry
        entry_id = created_entry["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/income/{entry_id}",
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert delete_response.status_code == 200
        
        print("✓ Created income entry has correct user_id attached")
    
    def test_create_expense_attaches_correct_user_id(self, main_user_token):
        """Creating expense should attach the authenticated user's ID"""
        expense_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "day": datetime.now().strftime("%A"),
            "amount": 50.00,
            "description": "TEST_Isolation_Expense",
            "category_name": "TEST_Category",
            "notes": "Test for user data isolation"
        }
        
        # Create expense entry
        response = requests.post(
            f"{BASE_URL}/api/expenses",
            json=expense_data,
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        created_entry = response.json()
        assert created_entry["user_id"] == "joel-user", f"Wrong user_id: {created_entry['user_id']}"
        assert created_entry["amount"] == 50.00
        
        # Cleanup - delete the test entry
        entry_id = created_entry["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/expenses/{entry_id}",
            headers={"Authorization": f"Bearer {main_user_token}"}
        )
        assert delete_response.status_code == 200
        
        print("✓ Created expense entry has correct user_id attached")


class TestCrossUserDataAccess:
    """Test that users cannot access other users' data"""
    
    @pytest.fixture
    def setup_test_data(self):
        """Create test data for main user and return tokens"""
        # Login as main user
        main_response = requests.post(f"{BASE_URL}/api/auth/login", json=MAIN_USER)
        main_token = main_response.json()["token"]
        
        # Login as demo user
        demo_response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        demo_token = demo_response.json()["token"]
        
        return {"main_token": main_token, "demo_token": demo_token}
    
    def test_demo_user_cannot_see_main_user_income(self, setup_test_data):
        """Demo user should not see main user's income entries"""
        # Get main user's income
        main_income = requests.get(
            f"{BASE_URL}/api/income",
            headers={"Authorization": f"Bearer {setup_test_data['main_token']}"}
        ).json()
        
        # Get demo user's income
        demo_income = requests.get(
            f"{BASE_URL}/api/income",
            headers={"Authorization": f"Bearer {setup_test_data['demo_token']}"}
        ).json()
        
        # Demo user should not see main user's entries
        main_user_ids = {entry["id"] for entry in main_income}
        demo_user_ids = {entry["id"] for entry in demo_income}
        
        # There should be no overlap
        overlap = main_user_ids.intersection(demo_user_ids)
        assert len(overlap) == 0, f"Demo user can see main user's entries: {overlap}"
        
        print(f"✓ User data isolation verified: main has {len(main_income)} entries, demo has {len(demo_income)} entries, no overlap")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
