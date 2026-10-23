import requests
import sys
from requests.exceptions import RequestException, Timeout

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
ODONTOGRAM_PATH_TEMPLATE = "/api/patients/{id}/odontogram"
PLANS_PATH_TEMPLATE = "/api/patients/{id}/plans"
TIMEOUT = 30  # seconds

def test_tc012_get_odontogram_and_plans():
    login_url = BASE_URL.rstrip("/") + LOGIN_PATH
    credentials = {"email": "test@pavdental.com", "password": "Password123!"}
    headers = {"Content-Type": "application/json"}

    try:
        resp = requests.post(login_url, json=credentials, headers=headers, timeout=TIMEOUT)
    except (RequestException, Timeout) as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp is not None, "No response received from login endpoint"
    assert resp.status_code == 200, f"Expected 200 from login, got {resp.status_code}: {resp.text}"

    try:
        auth_json = resp.json()
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {resp.text}")

    # Extract accessToken and user id with flexible key handling
    access_token = auth_json.get("accessToken") or auth_json.get("access_token") or auth_json.get("tokens", {}).get("accessToken")
    user_obj = auth_json.get("user") or auth_json.get("data") or auth_json
    user_id = None
    if isinstance(user_obj, dict):
        user_id = user_obj.get("id") or user_obj.get("_id") or user_obj.get("userId")

    assert access_token, f"accessToken not found in login response: {auth_json}"
    assert user_id, f"user.id not found in login response: {auth_json}"

    auth_header = {"Authorization": f"Bearer {access_token}"}

    # GET odontogram
    odontogram_url = BASE_URL.rstrip("/") + ODONTOGRAM_PATH_TEMPLATE.format(id=user_id)
    try:
        od_resp = requests.get(odontogram_url, headers=auth_header, timeout=TIMEOUT)
    except (RequestException, Timeout) as e:
        raise AssertionError(f"Odontogram request failed: {e}")

    assert od_resp is not None, "No response received from odontogram endpoint"
    assert od_resp.status_code == 200, f"Expected 200 from odontogram, got {od_resp.status_code}: {od_resp.text}"
    # Validate JSON array
    try:
        od_json = od_resp.json()
    except ValueError:
        raise AssertionError(f"Odontogram response is not valid JSON: {od_resp.text}")
    assert isinstance(od_json, list), f"Odontogram response expected to be JSON array, got {type(od_json)}"

    # GET plans
    plans_url = BASE_URL.rstrip("/") + PLANS_PATH_TEMPLATE.format(id=user_id)
    try:
        pl_resp = requests.get(plans_url, headers=auth_header, timeout=TIMEOUT)
    except (RequestException, Timeout) as e:
        raise AssertionError(f"Plans request failed: {e}")

    assert pl_resp is not None, "No response received from plans endpoint"
    assert pl_resp.status_code == 200, f"Expected 200 from plans, got {pl_resp.status_code}: {pl_resp.text}"
    try:
        pl_json = pl_resp.json()
    except ValueError:
        raise AssertionError(f"Plans response is not valid JSON: {pl_resp.text}")
    assert isinstance(pl_json, list), f"Plans response expected to be JSON array, got {type(pl_json)}"

    print("TC012 passed: odontogram and plans endpoints returned HTTP 200 with JSON arrays.")

if __name__ == "__main__":
    try:
        test_tc012_get_odontogram_and_plans()
    except AssertionError as e:
        print(f"TC012 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC012 unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)