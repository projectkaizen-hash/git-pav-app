import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_post_auth_refresh_rotates_refresh_token_and_issues_new_tokens():
    try:
        # Login with pre-seeded account to obtain initial tokens
        login_payload = {"email": "test@pavdental.com", "password": "Password123!"}
        headers = {"Content-Type": "application/json"}
        r_login = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert r_login is not None, "No response from login request"
    assert r_login.status_code == 200, f"Expected 200 from /api/auth/login, got {r_login.status_code}, body: {r_login.text}"

    try:
        login_json = r_login.json()
    except ValueError:
        raise AssertionError("Login response is not valid JSON")

    assert "refreshToken" in login_json and "accessToken" in login_json and "user" in login_json, (
        f"Login response missing required fields: {login_json}"
    )

    original_refresh = login_json["refreshToken"]
    original_access = login_json["accessToken"]

    # Use the valid refresh token to rotate and receive new tokens
    try:
        refresh_payload = {"refreshToken": original_refresh}
        r_refresh = requests.post(f"{BASE_URL}/api/auth/refresh", json=refresh_payload, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Refresh request failed: {e}")

    assert r_refresh is not None, "No response from refresh request"
    assert r_refresh.status_code == 200, f"Expected 200 from /api/auth/refresh with valid token, got {r_refresh.status_code}, body: {r_refresh.text}"

    try:
        refresh_json = r_refresh.json()
    except ValueError:
        raise AssertionError("Refresh response is not valid JSON")

    assert "refreshToken" in refresh_json and "accessToken" in refresh_json, f"Refresh response missing tokens: {refresh_json}"

    new_refresh = refresh_json["refreshToken"]
    new_access = refresh_json["accessToken"]

    assert isinstance(new_refresh, str) and new_refresh.strip() != "", "New refreshToken is empty or not a string"
    assert isinstance(new_access, str) and new_access.strip() != "", "New accessToken is empty or not a string"
    assert new_refresh != original_refresh, "Refresh token did not rotate (new refreshToken is same as original)"
    # It's possible access tokens change; ensure the new accessToken is present
    assert new_access != "", "New accessToken is empty"

    # The old/original refresh token should now be invalid (rotation). Expect 401.
    try:
        r_using_old = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refreshToken": original_refresh}, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Second refresh attempt with old token failed to execute: {e}")

    # Accept either 401 Unauthorized or 400/403 depending on implementation, but per PRD expect 401.
    assert r_using_old is not None, "No response when reusing old refresh token"
    if r_using_old.status_code != 401:
        raise AssertionError(
            f"Expected 401 when reusing rotated refreshToken, got {r_using_old.status_code}. Body: {r_using_old.text}"
        )

    # An explicitly invalid token should also return 401
    try:
        r_invalid = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refreshToken": "invalid.token.value"}, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Refresh request with invalid token failed to execute: {e}")

    assert r_invalid is not None, "No response for invalid refresh token test"
    assert r_invalid.status_code == 401, f"Expected 401 for invalid refreshToken, got {r_invalid.status_code}, body: {r_invalid.text}"

    print("TC010 passed: valid refresh token rotated and invalid/expired tokens returned 401.")


if __name__ == "__main__":
    try:
        test_post_auth_refresh_rotates_refresh_token_and_issues_new_tokens()
    except AssertionError as e:
        print(f"TC010 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC010 encountered an unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)