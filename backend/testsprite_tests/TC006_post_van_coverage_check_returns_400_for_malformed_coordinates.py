import requests
import sys

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/public/van/coverage-check"
TIMEOUT = 30

def test_post_van_coverage_check_malformed_coordinates():
    url = BASE_URL.rstrip("/") + ENDPOINT
    headers = {
        "Content-Type": "application/json"
    }

    # Malformed coordinates (strings instead of numbers) to trigger validation error
    payload = {
        "lat": "not-a-number",
        "lng": "invalid_lng"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request to {url} failed with exception: {e}")

    # Expect HTTP 400 for malformed / invalid coordinates
    assert resp.status_code == 400, f"Expected status 400, got {resp.status_code}. Response body: {resp.text}"

    # Ensure response is JSON and contains validation/error information
    try:
        data = resp.json()
    except ValueError:
        raise AssertionError(f"Response is not valid JSON. Response body: {resp.text}")

    # Check for common error keys or validation text
    has_error_key = any(k in data for k in ("error", "errors", "message", "details"))
    contains_validation_text = any(tok in str(data).lower() for tok in ("validation", "invalid", "lat", "lng", "must be", "required"))

    assert has_error_key or contains_validation_text, f"Response JSON did not contain expected validation error details: {data}"

    print("TC006 passed: POST /api/public/van/coverage-check returned 400 with validation error for malformed coordinates.")

if __name__ == "__main__":
    try:
        test_post_van_coverage_check_malformed_coordinates()
    except AssertionError as e:
        print(f"TC006 failed: {e}")
        sys.exit(1)
    except Exception as ex:
        print(f"TC006 encountered unexpected error: {ex}")
        sys.exit(2)
    sys.exit(0)