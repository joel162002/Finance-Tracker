"""
Test suite for KitaTracker new features:
1. Recurring transactions generate endpoint
2. Import with month selector (backend parse endpoint)
3. Analytics endpoints for charts
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestRecurringFeatures:
    """Test recurring transaction generation feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@finance.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_recurring_generate_endpoint_exists(self):
        """Test POST /api/recurring/generate endpoint exists and responds"""
        response = requests.post(f"{BASE_URL}/api/recurring/generate", headers=self.headers)
        assert response.status_code == 200, f"Generate endpoint failed: {response.text}"
        data = response.json()
        assert "income_count" in data
        assert "expense_count" in data
        assert "entries" in data
        print(f"PASS: Generate endpoint returns {data['income_count']} income, {data['expense_count']} expense entries")
    
    def test_recurring_generate_returns_correct_structure(self):
        """Test generate endpoint returns correct response structure"""
        response = requests.post(f"{BASE_URL}/api/recurring/generate", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert isinstance(data.get("income_count"), int)
        assert isinstance(data.get("expense_count"), int)
        assert isinstance(data.get("entries"), list)
        assert "message" in data
        print(f"PASS: Response structure is correct: {data['message']}")
    
    def test_recurring_list_endpoint(self):
        """Test GET /api/recurring endpoint"""
        response = requests.get(f"{BASE_URL}/api/recurring", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Recurring list returns {len(data)} transactions")
    
    def test_recurring_generate_requires_auth(self):
        """Test generate endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/recurring/generate")
        assert response.status_code == 401, "Should require authentication"
        print("PASS: Generate endpoint requires authentication")


class TestImportFeatures:
    """Test import parsing feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@finance.com",
            "password": "demo123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_import_parse_income(self):
        """Test parsing income entries"""
        response = requests.post(f"{BASE_URL}/api/import/parse", json={
            "raw_text": "2- 489 Motionarray (Gian Mendoza)\n849 Adobe All Apps (Rosalyn Caldito)",
            "entry_type": "income"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["amount"] == 489
        assert data[0]["product_or_description"] == "Motionarray"
        assert data[0]["person_name"] == "Gian Mendoza"
        print(f"PASS: Parsed {len(data)} income entries correctly")
    
    def test_import_parse_expense(self):
        """Test parsing expense entries"""
        response = requests.post(f"{BASE_URL}/api/import/parse", json={
            "raw_text": "100 Offering\n50 Food",
            "entry_type": "expense"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["amount"] == 100
        assert data[0]["product_or_description"] == "Offering"
        print(f"PASS: Parsed {len(data)} expense entries correctly")
    
    def test_import_parse_k_notation(self):
        """Test parsing amounts with k notation (e.g., 1.6k = 1600)"""
        response = requests.post(f"{BASE_URL}/api/import/parse", json={
            "raw_text": "1.6k Product Name",
            "entry_type": "income"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == 1600
        print(f"PASS: K notation parsed correctly: 1.6k = {data[0]['amount']}")


class TestAnalyticsEndpoints:
    """Test analytics endpoints for charts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@finance.com",
            "password": "demo123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_analytics(self):
        """Test dashboard analytics endpoint"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", 
                               params={"month": current_month}, 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields for charts
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_profit" in data
        assert "daily_data" in data
        assert "product_data" in data
        assert "category_data" in data
        print(f"PASS: Dashboard analytics returns all required chart data")
    
    def test_quick_summary(self):
        """Test quick summary endpoint"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/analytics/quick-summary",
                               params={"month": current_month},
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_profit" in data
        print(f"PASS: Quick summary returns totals correctly")
    
    def test_reports_analytics(self):
        """Test reports analytics endpoint"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/analytics/reports",
                               params={"month": current_month},
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "income_by_product" in data
        assert "income_by_person" in data
        assert "expenses_by_category" in data
        print(f"PASS: Reports analytics returns all required data")


class TestRecurringCRUD:
    """Test recurring transaction CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@finance.com",
            "password": "demo123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_ids = []
    
    def teardown_method(self):
        """Cleanup created test data"""
        for trans_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/recurring/{trans_id}", headers=self.headers)
            except:
                pass
    
    def test_create_recurring_transaction(self):
        """Test creating a recurring transaction"""
        response = requests.post(f"{BASE_URL}/api/recurring", json={
            "type": "expense",
            "amount": 100.00,
            "currency": "PHP",
            "description": "TEST_Monthly Subscription",
            "category_or_product": "Subscription",
            "frequency": "monthly",
            "start_date": "2026-01-01"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "TEST_Monthly Subscription"
        assert data["amount"] == 100.00
        self.created_ids.append(data["id"])
        print(f"PASS: Created recurring transaction with ID: {data['id']}")
    
    def test_toggle_recurring_transaction(self):
        """Test toggling recurring transaction active status"""
        # First create a transaction
        create_response = requests.post(f"{BASE_URL}/api/recurring", json={
            "type": "income",
            "amount": 500.00,
            "currency": "PHP",
            "description": "TEST_Toggle Test",
            "category_or_product": "Salary",
            "frequency": "monthly",
            "start_date": "2026-01-01"
        }, headers=self.headers)
        assert create_response.status_code == 200
        trans_id = create_response.json()["id"]
        self.created_ids.append(trans_id)
        
        # Toggle it
        toggle_response = requests.post(f"{BASE_URL}/api/recurring/{trans_id}/toggle", headers=self.headers)
        assert toggle_response.status_code == 200
        data = toggle_response.json()
        assert "is_active" in data
        print(f"PASS: Toggled recurring transaction, is_active: {data['is_active']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
