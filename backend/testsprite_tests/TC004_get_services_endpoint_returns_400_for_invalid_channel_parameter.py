import requests
import sys
import traceback

BASE_URL = "http://localhost:3000"
TIMEOUT = 30  # seconds

def test_get_services_invalid_channel_returns_400():
    url = f"{BASE_URL}/api/services"
    params = {"channel": "invalid"}
    headers = {
        "Accept": "application/json"
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        traceback.print_exc()
        raise AssertionError(f"HTTP request failed: {e}")

    # Assert HTTP status code is 400
    assert resp.status_code == 400, f"Expected status 400 for invalid channel, got {resp.status_code}. Response text: {resp.text}"

    # Response should be JSON with a validation/error message
    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Expected JSON error response but response is not valid JSON. Raw response: {resp.text}")

    assert isinstance(body, (dict, list)), f"Expected JSON object or array, got: {type(body)}"

    # Flexible validation: expect at least one of common error keys or a string message
    if isinstance(body, dict):
        keys = set(body.keys())
        expected_keys = {"message", "error", "errors", "details"}
        if not keys.intersection(expected_keys):
            # sometimes API returns validation details under 'validation' or similar; check for that or presence of any string fields
            # ensure there's some indication of an error in the payload
            has_string_value = any(isinstance(v, str) and v for v in body.values())
            assert has_string_value, f"Error response JSON did not contain expected keys {expected_keys} nor any string message. Body: {body}"
    else:
        # If a list is returned, ensure it's not empty and likely contains error entries
        assert len(body) > 0, f"Expected non-empty list for error details, got empty list: {body}"

    print("TC004 passed: GET /api/services?channel=invalid returned 400 with validation error payload.")

if __name__ == "__main__":
    try:
        test_get_services_invalid_channel_returns_400()
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception:
        traceback.print_exc()
        sys.exit(1)
    else:
        sys.exit(0)