import requests
import sys
import json
from datetime import datetime

class FinanceTrackerAPITester:
    def __init__(self, base_url="https://expense-dash-45.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200] if response.text else "No response"
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with demo credentials
        success, response = self.run_test(
            "Login with demo credentials",
            "POST",
            "auth/login",
            200,
            data={"email": "demo@finance.com", "password": "demo123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_products(self):
        """Test product management endpoints"""
        print("\n📦 Testing Products...")
        
        # Get products
        self.run_test("Get products", "GET", "products", 200)
        
        # Create product
        success, product = self.run_test(
            "Create product",
            "POST",
            "products",
            200,
            data={"name": "Test Product", "description": "Test Description"}
        )
        
        if success and 'id' in product:
            product_id = product['id']
            
            # Update product
            self.run_test(
                "Update product",
                "PUT",
                f"products/{product_id}",
                200,
                data={"name": "Updated Product", "description": "Updated Description"}
            )
            
            # Delete product
            self.run_test(
                "Delete product",
                "DELETE",
                f"products/{product_id}",
                200
            )

    def test_categories(self):
        """Test expense category endpoints"""
        print("\n🏷️ Testing Categories...")
        
        # Get categories
        self.run_test("Get categories", "GET", "categories", 200)
        
        # Create category
        success, category = self.run_test(
            "Create category",
            "POST",
            "categories",
            200,
            data={"name": "Test Category", "description": "Test Description"}
        )
        
        if success and 'id' in category:
            category_id = category['id']
            
            # Update category
            self.run_test(
                "Update category",
                "PUT",
                f"categories/{category_id}",
                200,
                data={"name": "Updated Category", "description": "Updated Description"}
            )
            
            # Delete category
            self.run_test(
                "Delete category",
                "DELETE",
                f"categories/{category_id}",
                200
            )

    def test_income(self):
        """Test income management endpoints"""
        print("\n💰 Testing Income...")
        
        # Get income entries
        self.run_test("Get income entries", "GET", "income", 200)
        
        # Get income with filters
        self.run_test("Get income with month filter", "GET", "income", 200, params={"month": "2025-03"})
        self.run_test("Get income with search", "GET", "income", 200, params={"search": "test"})
        
        # Create income entry
        success, income = self.run_test(
            "Create income entry",
            "POST",
            "income",
            200,
            data={
                "date": "2025-03-15",
                "day": "Saturday",
                "amount": 1500.00,
                "product_name": "Test Product",
                "person_name": "Test Customer",
                "notes": "Test income entry",
                "payment_status": "Paid",
                "reference_number": "REF123"
            }
        )
        
        if success and 'id' in income:
            income_id = income['id']
            
            # Update income entry
            self.run_test(
                "Update income entry",
                "PUT",
                f"income/{income_id}",
                200,
                data={"amount": 2000.00, "notes": "Updated income entry"}
            )
            
            # Delete income entry
            self.run_test(
                "Delete income entry",
                "DELETE",
                f"income/{income_id}",
                200
            )

    def test_expenses(self):
        """Test expense management endpoints"""
        print("\n💸 Testing Expenses...")
        
        # Get expense entries
        self.run_test("Get expense entries", "GET", "expenses", 200)
        
        # Get expenses with filters
        self.run_test("Get expenses with month filter", "GET", "expenses", 200, params={"month": "2025-03"})
        self.run_test("Get expenses with search", "GET", "expenses", 200, params={"search": "test"})
        
        # Create expense entry
        success, expense = self.run_test(
            "Create expense entry",
            "POST",
            "expenses",
            200,
            data={
                "date": "2025-03-15",
                "day": "Saturday",
                "amount": 500.00,
                "description": "Test Expense",
                "category_name": "Office Supplies",
                "notes": "Test expense entry",
                "payment_method": "Cash",
                "reference_number": "EXP123"
            }
        )
        
        if success and 'id' in expense:
            expense_id = expense['id']
            
            # Update expense entry
            self.run_test(
                "Update expense entry",
                "PUT",
                f"expenses/{expense_id}",
                200,
                data={"amount": 750.00, "notes": "Updated expense entry"}
            )
            
            # Delete expense entry
            self.run_test(
                "Delete expense entry",
                "DELETE",
                f"expenses/{expense_id}",
                200
            )

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n📊 Testing Analytics...")
        
        # Dashboard analytics
        self.run_test("Get dashboard analytics", "GET", "analytics/dashboard", 200)
        self.run_test("Get dashboard analytics with month", "GET", "analytics/dashboard", 200, params={"month": "2025-03"})
        
        # Monthly analytics
        self.run_test("Get monthly analytics", "GET", "analytics/monthly", 200, params={"month": "2025-03"})
        
        # Reports
        self.run_test("Get reports", "GET", "analytics/reports", 200)
        self.run_test("Get reports with month", "GET", "analytics/reports", 200, params={"month": "2025-03"})

    def test_suggestions(self):
        """Test suggestion endpoints"""
        print("\n💡 Testing Suggestions...")
        
        self.run_test("Get product suggestions", "GET", "suggestions/products", 200)
        self.run_test("Get person suggestions", "GET", "suggestions/persons", 200)
        self.run_test("Get category suggestions", "GET", "suggestions/categories", 200)

    def test_import_export(self):
        """Test import/export functionality"""
        print("\n📥📤 Testing Import/Export...")
        
        # Test import parsing
        self.run_test(
            "Parse income import",
            "POST",
            "import/parse",
            200,
            data={
                "raw_text": "15- 1500 Web Development (John Doe)\n16- 2000 Consulting (Jane Smith)",
                "entry_type": "income"
            }
        )
        
        self.run_test(
            "Parse expense import",
            "POST",
            "import/parse",
            200,
            data={
                "raw_text": "15- 500 Office Supplies\n16- 300 Transportation",
                "entry_type": "expense"
            }
        )
        
        # Test export (these return CSV files)
        self.run_test("Export income", "GET", "export/income", 200)
        self.run_test("Export expenses", "GET", "export/expenses", 200)
        self.run_test("Export income with month", "GET", "export/income", 200, params={"month": "2025-03"})

def main():
    print("🚀 Starting Finance Tracker API Tests...")
    print("=" * 60)
    
    tester = FinanceTrackerAPITester()
    
    # Test authentication first
    if not tester.test_auth():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Run all tests
    tester.test_products()
    tester.test_categories()
    tester.test_income()
    tester.test_expenses()
    tester.test_analytics()
    tester.test_suggestions()
    tester.test_import_export()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"{i}. {failure.get('test', 'Unknown')}")
            if 'expected' in failure:
                print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
            if 'error' in failure:
                print(f"   Error: {failure['error']}")
            if 'response' in failure:
                print(f"   Response: {failure['response']}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n✨ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())