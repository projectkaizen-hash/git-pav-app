import requests
import sys

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
SLOTS_PATH = "/api/booking/slots"
TIMEOUT = 30


def test_get_booking_slots_TC013():
    try:
        # Authenticate
        login_url = f"{BASE_URL}{LOGIN_PATH}"
        login_payload = {"email": "test@pavdental.com", "password": "Password123!"}
        login_headers = {"Content-Type": "application/json", "Accept": "application/json"}

        resp = requests.post(login_url, json=login_payload, headers=login_headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed with exception: {e}")

    assert resp.status_code == 200, f"Expected 200 from login, got {resp.status_code}: {resp.text}"
    try:
        auth_json = resp.json()
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {resp.text}")

    access_token = auth_json.get("accessToken") or auth_json.get("token") or auth_json.get("tokens", {}).get("accessToken")
    assert access_token, f"accessToken not found in login response: {auth_json}"

    # Request booking slots
    try:
        slots_url = f"{BASE_URL}{SLOTS_PATH}"
        params = {"date": "2026-10-25", "channel": "clinic"}
        slots_headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

        slots_resp = requests.get(slots_url, headers=slots_headers, params=params, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Booking slots request failed with exception: {e}")

    assert slots_resp.status_code == 200, f"Expected 200 from booking slots, got {slots_resp.status_code}: {slots_resp.text}"
    try:
        slots_json = slots_resp.json()
    except ValueError:
        raise AssertionError(f"Booking slots response is not valid JSON: {slots_resp.text}")

    # Normalize to list of slots
    slots = None
    if isinstance(slots_json, list):
        slots = slots_json
    elif isinstance(slots_json, dict):
        # common wrappers
        if isinstance(slots_json.get("data"), list):
            slots = slots_json["data"]
        elif isinstance(slots_json.get("slots"), list):
            slots = slots_json["slots"]
        else:
            # try to find any list value in the dict
            for v in slots_json.values():
                if isinstance(v, list):
                    slots = v
                    break

    assert isinstance(slots, list), f"Expected slots response to be a JSON array, got: {slots_json}"
    assert len(slots) > 0, "Expected non-empty list of slots but received empty list"

    # Validate required fields in each slot
    required_fields = {"id", "startTimeUtc", "endTimeUtc", "available", "durationMinutes"}
    for i, slot in enumerate(slots):
        assert isinstance(slot, dict), f"Slot at index {i} is not an object: {slot}"
        missing = required_fields - set(slot.keys())
        assert not missing, f"Slot at index {i} is missing fields: {missing}"
        # basic type checks
        assert slot["id"] is not None, f"Slot id is null at index {i}"
        assert isinstance(slot["startTimeUtc"], str), f"startTimeUtc should be string at index {i}, got {type(slot['startTimeUtc'])}"
        assert isinstance(slot["endTimeUtc"], str), f"endTimeUtc should be string at index {i}, got {type(slot['endTimeUtc'])}"
        assert isinstance(slot["available"], bool), f"available should be boolean at index {i}, got {type(slot['available'])}"
        assert isinstance(slot["durationMinutes"], int), f"durationMinutes should be int at index {i}, got {type(slot['durationMinutes'])}"

    print("TC013 passed: booking slots returned HTTP 200 and contain required slot fields.")


if __name__ == "__main__":
    try:
        test_get_booking_slots_TC013()
    except AssertionError as e:
        print(f"TC013 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC013 encountered an unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)