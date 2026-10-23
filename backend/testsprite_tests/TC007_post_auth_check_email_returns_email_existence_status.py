import requests
import uuid
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30.0
CHECK_EMAIL_PATH = "/api/auth/check-email"
HEADERS = {"Content-Type": "application/json"}


def test_post_auth_check_email_returns_email_existence_status():
    try:
        # 1) Check existing seeded account email
        existing_email = "test@pavdental.com"
        resp = requests.post(
            BASE_URL + CHECK_EMAIL_PATH,
            headers=HEADERS,
            json={"email": existing_email},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Expected 200 for existing email, got {resp.status_code}, body: {resp.text}"
        try:
            j = resp.json()
        except ValueError:
            raise AssertionError(f"Response not valid JSON for existing email: {resp.text}")

        assert "exists" in j, f"'exists' key missing in response for existing email: {j}"
        assert isinstance(j["exists"], bool), f"'exists' is not a bool for existing email: {j}"
        assert j["exists"] is True, f"Expected exists True for existing email, got {j}"

        # Role is expected to be 'patient' for existing account
        assert "role" in j, f"'role' key missing in response for existing email: {j}"
        assert j["role"] == "patient", f"Expected role 'patient' for existing email, got {j.get('role')}"

        print("Existing email check passed: exists=True and role='patient'")

        # 2) Check a new unique email that should not exist
        new_email = f"test+{uuid.uuid4().hex}@example.com"
        resp2 = requests.post(
            BASE_URL + CHECK_EMAIL_PATH,
            headers=HEADERS,
            json={"email": new_email},
            timeout=TIMEOUT,
        )
        assert resp2.status_code == 200, f"Expected 200 for new email, got {resp2.status_code}, body: {resp2.text}"
        try:
            j2 = resp2.json()
        except ValueError:
            raise AssertionError(f"Response not valid JSON for new email: {resp2.text}")

        assert "exists" in j2, f"'exists' key missing in response for new email: {j2}"
        assert isinstance(j2["exists"], bool), f"'exists' is not a bool for new email: {j2}"
        assert j2["exists"] is False, f"Expected exists False for new email, got {j2}"

        print("New email check passed: exists=False")

    except requests.RequestException as e:
        print(f"HTTP request failed: {e}")
        raise
    except AssertionError as e:
        print(f"Assertion failed: {e}")
        raise


if __name__ == "__main__":
    test_post_auth_check_email_returns_email_existence_status()