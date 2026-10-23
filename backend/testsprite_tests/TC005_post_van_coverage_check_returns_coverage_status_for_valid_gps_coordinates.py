import requests
import sys
import math

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_tc005_post_van_coverage_check_valid_gps():
    url = f"{BASE_URL}/api/public/van/coverage-check"
    payload = {"lat": 51.5154, "lng": -0.1411}
    headers = {"Content-Type": "application/json"}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")

    assert resp is not None, "No response received"
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}. Body: {resp.text}"

    try:
        data = resp.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")

    # Required top-level fields: isCovered, coordinates, assignedVan, message, inputType
    assert "isCovered" in data, "Response missing 'isCovered'"
    assert "coordinates" in data, "Response missing 'coordinates'"
    assert "assignedVan" in data, "Response missing 'assignedVan'"
    assert "message" in data, "Response missing 'message'"
    assert "inputType" in data, "Response missing 'inputType'"

    # Validate types
    is_covered = data["isCovered"]
    assert isinstance(is_covered, bool), f"'isCovered' should be boolean, got {type(is_covered)}"

    message = data["message"]
    assert isinstance(message, str), f"'message' should be string, got {type(message)}"
    assert data["inputType"] == "gps", f"Expected inputType 'gps', got '{data['inputType']}'"

    # Validate coordinates shape and values (allow a small tolerance)
    coords = data["coordinates"]
    lat_resp = None
    lng_resp = None

    if isinstance(coords, dict):
        # try common keys
        if "lat" in coords and "lng" in coords:
            lat_resp = coords["lat"]
            lng_resp = coords["lng"]
        elif "latitude" in coords and "longitude" in coords:
            lat_resp = coords["latitude"]
            lng_resp = coords["longitude"]
    elif isinstance(coords, (list, tuple)) and len(coords) >= 2:
        # assume [lat, lng] or [lng, lat] - try to match roughly to input
        a, b = coords[0], coords[1]
        # decide ordering by closeness to expected lat
        if abs(a - payload["lat"]) < abs(b - payload["lat"]):
            lat_resp, lng_resp = a, b
        else:
            lat_resp, lng_resp = b, a

    assert lat_resp is not None and lng_resp is not None, f"Could not parse coordinates from response: {coords}"
    assert isinstance(lat_resp, (int, float)), f"Latitude is not numeric: {lat_resp}"
    assert isinstance(lng_resp, (int, float)), f"Longitude is not numeric: {lng_resp}"

    # Assert coordinates are approximately the same as input
    assert math.isclose(lat_resp, payload["lat"], rel_tol=0, abs_tol=1e-3), f"Latitude mismatch: expected {payload['lat']}, got {lat_resp}"
    assert math.isclose(lng_resp, payload["lng"], rel_tol=0, abs_tol=1e-3), f"Longitude mismatch: expected {payload['lng']}, got {lng_resp}"

    # assignedVan may be null, object, or a string identifier; verify allowed types
    assigned_van = data["assignedVan"]
    assert (assigned_van is None) or isinstance(assigned_van, (dict, str)), f"'assignedVan' should be null, object, or string, got {type(assigned_van)}"

    print("TC005 passed: POST /api/public/van/coverage-check returned expected coverage response.")


if __name__ == "__main__":
    try:
        test_tc005_post_van_coverage_check_valid_gps()
    except AssertionError as e:
        print(f"TC005 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC005 encountered an unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)