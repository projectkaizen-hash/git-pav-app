import requests
import sys
import traceback

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
APPOINTMENTS_PATH = "/api/booking/appointments"
TIMEOUT = 30.0

def extract_access_token(json_obj):
    # common key variants
    if not isinstance(json_obj, dict):
        return None
    for key in ("accessToken", "access_token", "token"):
        if key in json_obj and isinstance(json_obj[key], str):
            return json_obj[key]
    # nested under data
    data = json_obj.get("data")
    if isinstance(data, dict):
        for key in ("accessToken", "access_token", "token"):
            if key in data and isinstance(data[key], str):
                return data[key]
    return None

def test_get_booking_appointments():
    try:
        # 1) Authenticate
        login_url = BASE_URL.rstrip("/") + LOGIN_PATH
        credentials = {"email": "test@pavdental.com", "password": "Password123!"}
        headers = {"Content-Type": "application/json"}
        resp = requests.post(login_url, json=credentials, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        traceback.print_exc()
        raise AssertionError(f"HTTP request to login endpoint failed: {e}")

    assert resp is not None, "No response from login endpoint"
    assert resp.status_code == 200, f"Expected 200 from {LOGIN_PATH}, got {resp.status_code}, body: {resp.text}"

    try:
        login_json = resp.json()
    except ValueError:
        raise AssertionError("Login response is not valid JSON")

    access_token = extract_access_token(login_json)
    assert access_token, f"accessToken not found in login response JSON: {login_json}"

    # 2) Get appointments
    try:
        appointments_url = BASE_URL.rstrip("/") + APPOINTMENTS_PATH
        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        resp2 = requests.get(appointments_url, headers=auth_headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        traceback.print_exc()
        raise AssertionError(f"HTTP request to appointments endpoint failed: {e}")

    assert resp2 is not None, "No response from appointments endpoint"
    assert resp2.status_code == 200, f"Expected 200 from {APPOINTMENTS_PATH}, got {resp2.status_code}, body: {resp2.text}"

    try:
        appointments_json = resp2.json()
    except ValueError:
        raise AssertionError("Appointments response is not valid JSON")

    assert isinstance(appointments_json, list), f"Expected JSON array for appointments, got {type(appointments_json)}"

    # Ensure each appointment item is an object/dict
    for idx, item in enumerate(appointments_json):
        assert isinstance(item, dict), f"Appointment at index {idx} is not an object: {item}"

    print("TC014 passed: GET /api/booking/appointments returned HTTP 200 and a JSON array of appointments.")

if __name__ == "__main__":
    try:
        test_get_booking_appointments()
    except AssertionError as e:
        print(f"TC014 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print("TC014 encountered an unexpected error:")
        traceback.print_exc()
        sys.exit(1)
    sys.exit(0)