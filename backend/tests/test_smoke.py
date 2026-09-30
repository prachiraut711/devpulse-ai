"""
DevPulse AI - Backend Smoke Tests
Validates core application startup, routing, database readiness, and read-only endpoints.
Compatible with standard unittest and pytest.
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, check_db_connection


class BackendSmokeTestCase(unittest.TestCase):
    """Smoke tests for DevPulse AI FastAPI backend."""

    @classmethod
    def setUpClass(cls):
        # Initialize database tables if database service is reachable
        init_db()
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        """Validates root welcome endpoint."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("name", payload)
        self.assertIn("version", payload)

    def test_health_check_endpoint(self):
        """Validates /api/health endpoint used by Docker healthcheck and monitoring."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("status"), "ok")
        self.assertIn("message", payload)

    def test_dashboard_endpoint(self):
        """Validates /api/dashboard summary metrics response."""
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("summary", payload)
        self.assertIn("engineering_health", payload)
        self.assertIn("recent_activity", payload)

    def test_github_status_endpoint(self):
        """Validates /api/github/status returns read-only connection status without exposing secrets."""
        response = self.client.get("/api/github/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("connected", payload)
        # Ensure private keys or tokens are never leaked
        self.assertNotIn("private_key", payload)
        self.assertNotIn("token", payload)

    def test_ai_status_endpoint(self):
        """Validates /api/ai/status returns configuration flag without exposing Gemini key."""
        response = self.client.get("/api/ai/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("configured", payload)
        self.assertNotIn("gemini_api_key", payload)

    def test_database_status_endpoint(self):
        """Validates /api/database/status returns connectivity state with masked credentials."""
        response = self.client.get("/api/database/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("configured", payload)
        self.assertIn("connected", payload)
        # Ensure password is never exposed in plain text
        sanitized_url = payload.get("sanitized_url", "")
        self.assertNotIn(":password@", sanitized_url)

    def test_db_connection_graceful_handling(self):
        """Validates database check utility handles calls gracefully without unhandled exceptions."""
        status = check_db_connection()
        self.assertIsInstance(status, dict)
        self.assertIn("connected", status)


if __name__ == "__main__":
    unittest.main()
