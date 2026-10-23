import requests
import sys

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
TIMEOUT = 30.0

def test_post_auth_login_valid_credentials():
    url = BASE_URL.rstrip("/") + LOGIN_PATH
    payload = {
        "email": "test@pavdental.com",
        "password": "Password123!"
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"HTTP request to {url} failed: {e}")

    # Assert status code 200
    if resp.status_code != 200:
        # include response body for debugging
        body = None
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        raise AssertionError(f"Expected status 200 but got {resp.status_code}. Response body: {body}")

    # Parse JSON
    try:
        data = resp.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")

    # Validate presence of tokens and user
    assert isinstance(data, dict), "Response JSON must be an object"
    assert "accessToken" in data, "Response missing 'accessToken'"
    assert "refreshToken" in data, "Response missing 'refreshToken'"
    assert "user" in data, "Response missing 'user'"

    access_token = data.get("accessToken")
    refresh_token = data.get("refreshToken")
    user = data.get("user")

    assert isinstance(access_token, str) and access_token.strip(), "'accessToken' must be a non-empty string"
    assert isinstance(refresh_token, str) and refresh_token.strip(), "'refreshToken' must be a non-empty string"
    assert isinstance(user, dict), "'user' must be an object"

    # Validate user details include id and email matches request
    user_id = user.get("id")
    user_email = user.get("email")

    assert user_id is not None, "User object must include 'id'"
    assert isinstance(user_email, str) and user_email.lower() == payload["email"].lower(), \
        f"User email mismatch: expected {payload['email']}, got {user_email}"

    # Optionally validate token formats (basic)
    assert len(access_token) >= 10, "accessToken appears too short"
    assert len(refresh_token) >= 10, "refreshToken appears too short"

    print("TC009 passed: POST /api/auth/login authenticated user and returned tokens and user details.")

if __name__ == "__main__":
    try:
        test_post_auth_login_valid_credentials()
    except AssertionError as e:
        print(f"TC009 failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"TC009 encountered an unexpected error: {e}", file=sys.stderr)
        sys.exit(2)
    sys.exit(0)