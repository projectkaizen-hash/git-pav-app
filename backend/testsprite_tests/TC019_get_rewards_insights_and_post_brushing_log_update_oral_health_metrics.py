import requests
import sys

BASE_URL = "http://localhost:3000/"

def test_tc019():
    login_url = BASE_URL + "api/auth/login"
    credentials = {"email": "test@pavdental.com", "password": "Password123!"}
    try:
        resp = requests.post(login_url, json=credentials, timeout=30)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp.status_code == 200, f"Expected 200 from login, got {resp.status_code}: {resp.text}"
    try:
        login_json = resp.json()
    except ValueError:
        raise AssertionError("Login response is not valid JSON")

    # Extract access token robustly
    access_token = login_json.get("accessToken") or login_json.get("access_token")
    if not access_token:
        # try nested patterns
        access_token = login_json.get("tokens", {}).get("accessToken") or login_json.get("data", {}).get("accessToken")
    assert access_token, f"accessToken not found in login response: {login_json}"

    # Extract user id
    user = login_json.get("user") or login_json.get("data", {}).get("user")
    assert user and isinstance(user, dict), f"user object not found in login response: {login_json}"
    user_id = user.get("id") or user.get("userId") or user.get("uuid")
    assert user_id, f"user.id not found in login response user object: {user}"

    headers_auth = {"Authorization": f"Bearer {access_token}"}

    # GET /api/rewards/insights
    insights_url = BASE_URL + "api/rewards/insights"
    try:
        r_insights = requests.get(insights_url, headers=headers_auth, timeout=30)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"GET /api/rewards/insights request failed: {e}")

    assert r_insights.status_code == 200, f"Expected 200 from GET /api/rewards/insights, got {r_insights.status_code}: {r_insights.text}"
    try:
        insights_json = r_insights.json()
    except ValueError:
        raise AssertionError("GET /api/rewards/insights response is not valid JSON")

    assert "plaqueIndexPercent" in insights_json, f"'plaqueIndexPercent' missing in insights response: {insights_json}"
    assert "weeklyBrushing" in insights_json, f"'weeklyBrushing' missing in insights response: {insights_json}"
    # Optional basic type checks
    plaque_val = insights_json["plaqueIndexPercent"]
    weekly_brushing = insights_json["weeklyBrushing"]
    assert isinstance(plaque_val, (int, float)), f"plaqueIndexPercent should be number, got {type(plaque_val)}"
    assert isinstance(weekly_brushing, (list, dict)), f"weeklyBrushing should be list or dict, got {type(weekly_brushing)}"

    # POST /api/rewards/brushing-log
    brushing_url = BASE_URL + "api/rewards/brushing-log"
    brushing_payload = {"day": "Sun", "session": "pm", "durationSec": 120}
    try:
        r_brush = requests.post(brushing_url, json=brushing_payload, headers=headers_auth, timeout=30)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"POST /api/rewards/brushing-log request failed: {e}")

    assert r_brush.status_code == 200, f"Expected 200 from POST /api/rewards/brushing-log, got {r_brush.status_code}: {r_brush.text}"
    try:
        brush_json = r_brush.json()
    except ValueError:
        raise AssertionError("POST /api/rewards/brushing-log response is not valid JSON")

    # Validate updated pointsBalance exists and is numeric
    assert "pointsBalance" in brush_json, f"'pointsBalance' missing in brushing-log response: {brush_json}"
    points_balance = brush_json["pointsBalance"]
    assert isinstance(points_balance, int), f"pointsBalance should be int, got {type(points_balance)}"
    assert points_balance >= 0, f"pointsBalance should be non-negative, got {points_balance}"

    print("TC019 passed: rewards insights retrieved and brushing log updated successfully.")

if __name__ == "__main__":
    try:
        test_tc019()
    except AssertionError as e:
        print(f"TC019 FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC019 ERROR: Unexpected exception: {e}")
        sys.exit(2)
    sys.exit(0)