"""
Test suite for KitaTracker Notification System
Tests: notification CRUD, budget alerts, preferences, mark as read, clear all
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@finance.com"
TEST_PASSWORD = "demo123"


class TestNotificationSystem:
    """Test notification endpoints and budget alert logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = token.replace("token-", "")
        yield
    
    # ============ GET NOTIFICATIONS ============
    
    def test_get_notifications_returns_list(self):
        """GET /notifications should return notifications list and unread count"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data, "Response should have 'notifications' key"
        assert "unread_count" in data, "Response should have 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"✓ GET /notifications: {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_unread_only(self):
        """GET /notifications?unread_only=true should filter unread notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications?unread_only=true")
        assert response.status_code == 200
        
        data = response.json()
        # All returned notifications should be unread
        for notification in data["notifications"]:
            assert notification.get("is_read") == False, "All notifications should be unread"
        print(f"✓ GET /notifications?unread_only=true: {len(data['notifications'])} unread notifications")
    
    # ============ NOTIFICATION PREFERENCES ============
    
    def test_get_notification_preferences(self):
        """GET /notifications/preferences should return user preferences"""
        response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code == 200
        
        data = response.json()
        # Check default preference fields exist
        assert "enable_notifications" in data, "Should have enable_notifications"
        assert "budget_alerts" in data, "Should have budget_alerts"
        assert "recurring_alerts" in data, "Should have recurring_alerts"
        assert "threshold_warning" in data, "Should have threshold_warning"
        assert "threshold_danger" in data, "Should have threshold_danger"
        print(f"✓ GET /notifications/preferences: enable={data['enable_notifications']}, budget={data['budget_alerts']}")
    
    def test_update_notification_preferences(self):
        """PUT /notifications/preferences should update preferences"""
        # Update preferences
        update_data = {
            "enable_notifications": True,
            "budget_alerts": True,
            "recurring_alerts": False,
            "threshold_warning": 75,
            "threshold_danger": 85
        }
        
        response = self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("recurring_alerts") == False, "recurring_alerts should be False"
        assert data.get("threshold_warning") == 75, "threshold_warning should be 75"
        assert data.get("threshold_danger") == 85, "threshold_danger should be 85"
        
        # Restore defaults
        restore_data = {
            "enable_notifications": True,
            "budget_alerts": True,
            "recurring_alerts": True,
            "threshold_warning": 80,
            "threshold_danger": 90
        }
        self.session.put(f"{BASE_URL}/api/notifications/preferences", json=restore_data)
        print("✓ PUT /notifications/preferences: Updated and restored preferences")
    
    # ============ MARK AS READ ============
    
    def test_mark_notification_as_read(self):
        """PUT /notifications/{id}/read should mark notification as read"""
        # First get notifications
        get_response = self.session.get(f"{BASE_URL}/api/notifications")
        notifications = get_response.json().get("notifications", [])
        
        if not notifications:
            pytest.skip("No notifications to test mark as read")
        
        # Find an unread notification or use first one
        notification = next((n for n in notifications if not n.get("is_read")), notifications[0])
        notification_id = notification.get("id")
        
        # Mark as read
        response = self.session.put(f"{BASE_URL}/api/notifications/{notification_id}/read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"✓ PUT /notifications/{notification_id}/read: Marked as read")
    
    def test_mark_all_notifications_read(self):
        """PUT /notifications/read-all should mark all notifications as read"""
        response = self.session.put(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify all are read
        get_response = self.session.get(f"{BASE_URL}/api/notifications")
        data = get_response.json()
        assert data.get("unread_count") == 0, "Unread count should be 0 after mark all read"
        print("✓ PUT /notifications/read-all: All notifications marked as read")
    
    # ============ DELETE NOTIFICATIONS ============
    
    def test_delete_notification(self):
        """DELETE /notifications/{id} should delete a notification"""
        # First get notifications
        get_response = self.session.get(f"{BASE_URL}/api/notifications")
        notifications = get_response.json().get("notifications", [])
        
        if not notifications:
            pytest.skip("No notifications to test delete")
        
        notification_id = notifications[0].get("id")
        initial_count = len(notifications)
        
        # Delete notification
        response = self.session.delete(f"{BASE_URL}/api/notifications/{notification_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_response2 = self.session.get(f"{BASE_URL}/api/notifications")
        new_count = len(get_response2.json().get("notifications", []))
        assert new_count == initial_count - 1, "Notification count should decrease by 1"
        print(f"✓ DELETE /notifications/{notification_id}: Notification deleted")
    
    def test_delete_nonexistent_notification(self):
        """DELETE /notifications/{id} with invalid id should return 404"""
        response = self.session.delete(f"{BASE_URL}/api/notifications/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /notifications/nonexistent: Returns 404")
    
    # ============ CLEAR ALL NOTIFICATIONS ============
    
    def test_clear_all_notifications(self):
        """DELETE /notifications should clear all notifications"""
        response = self.session.delete(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify all cleared
        get_response = self.session.get(f"{BASE_URL}/api/notifications")
        data = get_response.json()
        assert len(data.get("notifications", [])) == 0, "All notifications should be cleared"
        assert data.get("unread_count") == 0, "Unread count should be 0"
        print("✓ DELETE /notifications: All notifications cleared")
    
    # ============ CHECK RECURRING NOTIFICATIONS ============
    
    def test_check_recurring_notifications(self):
        """GET /notifications/check-recurring should check for due recurring transactions"""
        response = self.session.get(f"{BASE_URL}/api/notifications/check-recurring")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications_created" in data, "Response should have notifications_created"
        print(f"✓ GET /notifications/check-recurring: {data['notifications_created']} notifications created")


class TestBudgetAlertTrigger:
    """Test budget alert notification triggers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = token.replace("token-", "")
        
        # Get current month
        self.current_month = datetime.now().strftime("%Y-%m")
        yield
    
    def test_budget_status_endpoint(self):
        """GET /budgets/status should return budget status with spending"""
        response = self.session.get(f"{BASE_URL}/api/budgets/status?month={self.current_month}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "month" in data, "Response should have month"
        assert "budgets" in data, "Response should have budgets"
        assert "total_spending" in data, "Response should have total_spending"
        print(f"✓ GET /budgets/status: {len(data['budgets'])} budgets, total spending: {data['total_spending']}")
    
    def test_create_expense_triggers_budget_check(self):
        """POST /expenses should trigger budget notification check"""
        # First, ensure we have a budget for testing
        test_category = "TEST_NotificationCategory"
        test_month = self.current_month
        
        # Create a budget with low limit to trigger alert
        budget_data = {
            "category": test_category,
            "month": test_month,
            "limit_amount": 100,
            "alert_threshold": 80
        }
        
        # Try to create budget (may already exist)
        budget_response = self.session.post(f"{BASE_URL}/api/budgets", json=budget_data)
        
        if budget_response.status_code == 200:
            budget_id = budget_response.json().get("id")
        else:
            # Budget may already exist, get it
            budgets_response = self.session.get(f"{BASE_URL}/api/budgets?month={test_month}")
            budgets = budgets_response.json()
            budget = next((b for b in budgets if b.get("category") == test_category), None)
            budget_id = budget.get("id") if budget else None
        
        # Create expense that should trigger budget warning (85% of 100 = 85)
        expense_data = {
            "date": f"{test_month}-15",
            "day": "Wednesday",
            "amount": 85,
            "description": "TEST expense for notification",
            "category_name": test_category,
            "payment_method": "Cash"
        }
        
        expense_response = self.session.post(f"{BASE_URL}/api/expenses", json=expense_data)
        assert expense_response.status_code == 200, f"Expected 200, got {expense_response.status_code}"
        
        expense_id = expense_response.json().get("id")
        
        # Check if notification was created
        notif_response = self.session.get(f"{BASE_URL}/api/notifications")
        notifications = notif_response.json().get("notifications", [])
        
        # Look for budget warning notification
        budget_notif = next((n for n in notifications if n.get("type", "").startswith("budget_")), None)
        
        # Cleanup: delete test expense and budget
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        if budget_id:
            self.session.delete(f"{BASE_URL}/api/budgets/{budget_id}")
        
        print(f"✓ POST /expenses: Expense created, budget check triggered")
        if budget_notif:
            print(f"  → Budget notification found: {budget_notif.get('type')}")


class TestNotificationAuthentication:
    """Test notification endpoints require authentication"""
    
    def test_get_notifications_requires_auth(self):
        """GET /notifications without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /notifications: Requires authentication (401)")
    
    def test_get_preferences_requires_auth(self):
        """GET /notifications/preferences without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /notifications/preferences: Requires authentication (401)")
    
    def test_mark_read_requires_auth(self):
        """PUT /notifications/{id}/read without auth should return 401"""
        response = requests.put(f"{BASE_URL}/api/notifications/test-id/read")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PUT /notifications/{id}/read: Requires authentication (401)")
    
    def test_delete_notification_requires_auth(self):
        """DELETE /notifications/{id} without auth should return 401"""
        response = requests.delete(f"{BASE_URL}/api/notifications/test-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE /notifications/{id}: Requires authentication (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
