import requests
import sys

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
FINANCING_PATH = "/api/financing"
TIMEOUT = 30.0

def test_tc016_get_financing_returns_preapproved_limit_and_applications():
    login_url = BASE_URL + LOGIN_PATH
    financing_url = BASE_URL + FINANCING_PATH

    credentials = {"email": "test@pavdental.com", "password": "Password123!"}

    # Authenticate
    try:
        resp = requests.post(login_url, json=credentials, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp.status_code == 200, f"Expected 200 from login, got {resp.status_code}: {resp.text}"

    try:
        login_json = resp.json()
    except ValueError:
        raise AssertionError("Login response is not valid JSON")

    # Extract access token from common possible shapes
    access_token = (
        login_json.get("accessToken")
        or login_json.get("access_token")
        or (login_json.get("data") or {}).get("accessToken")
        or (login_json.get("data") or {}).get("access_token")
    )
    assert access_token and isinstance(access_token, str), f"accessToken not found in login response: {login_json}"

    headers = {"Authorization": f"Bearer {access_token}"}

    # Call financing endpoint
    try:
        fin_resp = requests.get(financing_url, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"GET /api/financing request failed: {e}")

    assert fin_resp.status_code == 200, f"Expected 200 from GET /api/financing, got {fin_resp.status_code}: {fin_resp.text}"

    try:
        fin_json = fin_resp.json()
    except ValueError:
        raise AssertionError("Financing response is not valid JSON")

    # Validate required fields
    if "preApprovedLimitPence" not in fin_json:
        raise AssertionError(f"Missing 'preApprovedLimitPence' in financing response: {fin_json}")
    if not isinstance(fin_json["preApprovedLimitPence"], int):
        raise AssertionError(f"'preApprovedLimitPence' is not an integer: {fin_json.get('preApprovedLimitPence')}")

    if "aprPercent" not in fin_json:
        raise AssertionError(f"Missing 'aprPercent' in financing response: {fin_json}")
    if not isinstance(fin_json["aprPercent"], (int, float)):
        raise AssertionError(f"'aprPercent' is not numeric: {fin_json.get('aprPercent')}")

    if "applications" not in fin_json:
        raise AssertionError(f"Missing 'applications' in financing response: {fin_json}")
    if not isinstance(fin_json["applications"], list):
        raise AssertionError(f"'applications' is not an array: {fin_json.get('applications')}")

    print("TC016 passed: /api/financing returned preApprovedLimitPence, aprPercent, and applications array.")

if __name__ == "__main__":
    try:
        test_tc016_get_financing_returns_preapproved_limit_and_applications()
    except AssertionError as e:
        print(f"TC016 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC016 unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)