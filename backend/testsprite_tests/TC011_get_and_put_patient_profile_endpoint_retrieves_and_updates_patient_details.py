import requests
import sys
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def _find_key_recursive(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            res = _find_key_recursive(v, key)
            if res is not None:
                return res
    elif isinstance(obj, list):
        for item in obj:
            res = _find_key_recursive(item, key)
            if res is not None:
                return res
    return None

def test_tc011_get_put_patient_profile():
    login_url = f"{BASE_URL.rstrip('/')}/api/auth/login"
    creds = {"email": "test@pavdental.com", "password": "Password123!"}

    try:
        r = requests.post(login_url, json=creds, timeout=TIMEOUT)
    except RequestException as e:
        raise AssertionError(f"Login request failed: {e}") from e

    assert r.status_code == 200, f"Expected 200 from login, got {r.status_code}: {r.text}"
    try:
        auth_json = r.json()
    except ValueError as e:
        raise AssertionError("Login response is not valid JSON") from e

    # Extract access token and user id
    access_token = auth_json.get("accessToken") or _find_key_recursive(auth_json, "accessToken")
    user_obj = auth_json.get("user") or _find_key_recursive(auth_json, "user")
    assert access_token, f"accessToken not found in login response: {auth_json}"
    assert user_obj and (isinstance(user_obj, dict) and ("id" in user_obj or "userId" in user_obj)), \
        f"user.id not found in login response: {auth_json}"
    user_id = user_obj.get("id") or user_obj.get("userId")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    profile_url = f"{BASE_URL.rstrip('/')}/api/patients/{user_id}/profile"

    # GET profile
    try:
        r_get = requests.get(profile_url, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise AssertionError(f"GET profile request failed: {e}") from e

    assert r_get.status_code == 200, f"Expected 200 from GET profile, got {r_get.status_code}: {r_get.text}"
    try:
        profile_json = r_get.json()
    except ValueError as e:
        raise AssertionError("GET profile response is not valid JSON") from e
    assert isinstance(profile_json, (dict, list)), "GET profile did not return a JSON object or array"

    # Prepare update payload (firstName, lastName, city, postcode)
    update_payload = {
        "firstName": "Automated",
        "lastName": "Tester",
        "city": "London",
        "postcode": "SW1A 1AA"
    }

    # PUT profile
    try:
        r_put = requests.put(profile_url, headers=headers, json=update_payload, timeout=TIMEOUT)
    except RequestException as e:
        raise AssertionError(f"PUT profile request failed: {e}") from e

    assert r_put.status_code == 200, f"Expected 200 from PUT profile, got {r_put.status_code}: {r_put.text}"
    try:
        put_json = r_put.json()
    except ValueError:
        # If no JSON returned, fail
        raise AssertionError("PUT profile response is not valid JSON")

    # Verify that updated values appear in the response (search recursively)
    for key, expected in update_payload.items():
        found = _find_key_recursive(put_json, key)
        assert found == expected, f"Updated field '{key}' expected '{expected}', found '{found}' in response: {put_json}"

    print("TC011 passed: GET and PUT /api/patients/{id}/profile succeeded and fields updated as expected.")

if __name__ == "__main__":
    try:
        test_tc011_get_put_patient_profile()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)