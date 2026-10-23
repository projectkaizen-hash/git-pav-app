import requests
import sys
from typing import Any, Dict

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
REWARDS_PATH = "/api/rewards"
TIMEOUT = 30.0


def _extract_token_and_user(auth_resp: Dict[str, Any]):
    # Try common shapes for auth response
    access_token = (
        auth_resp.get("accessToken")
        or auth_resp.get("access_token")
        or (auth_resp.get("tokens") and auth_resp["tokens"].get("accessToken"))
        or (auth_resp.get("data") and auth_resp["data"].get("accessToken"))
    )
    user = auth_resp.get("user") or (auth_resp.get("data") and auth_resp["data"].get("user"))
    return access_token, user


def _find_rewards_payload(resp_json: Dict[str, Any]) -> Dict[str, Any]:
    # If expected keys are at top-level return as is, otherwise check common wrapper fields
    expected_keys = {"pointsBalance", "streakDays", "nextTierPoints", "catalog", "redemptions"}
    if expected_keys.issubset(set(resp_json.keys())):
        return resp_json
    for key in ("data", "rewards", "payload"):
        candidate = resp_json.get(key)
        if isinstance(candidate, dict) and expected_keys.issubset(set(candidate.keys())):
            return candidate
    # fallback: return top-level even if incomplete for assertions to fail clearly
    return resp_json


def test_tc018_get_rewards_returns_smile_points_and_catalog():
    login_url = BASE_URL.rstrip("/") + LOGIN_PATH
    rewards_url = BASE_URL.rstrip("/") + REWARDS_PATH

    # Login
    login_payload = {"email": "test@pavdental.com", "password": "Password123!"}
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    try:
        r = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise SystemExit(f"Login request failed: {e}") from e

    assert r is not None, "No response from login request"
    try:
        assert r.status_code == 200, f"Login failed with status {r.status_code}: {r.text}"
    except AssertionError:
        # Provide more context if JSON error is returned
        try:
            err = r.json()
        except Exception:
            err = r.text
        raise AssertionError(f"Login failed: {err}")

    try:
        auth_json = r.json()
    except ValueError as e:
        raise AssertionError(f"Login response is not valid JSON: {e}") from e

    access_token, user = _extract_token_and_user(auth_json)
    assert access_token, f"accessToken not found in login response: {auth_json}"
    assert user and user.get("id"), f"user.id not found in login response: {auth_json}"

    # GET /api/rewards
    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    try:
        r2 = requests.get(rewards_url, headers=auth_headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise SystemExit(f"GET /api/rewards request failed: {e}") from e

    assert r2 is not None, "No response from GET /api/rewards"
    assert r2.status_code == 200, f"GET /api/rewards returned unexpected status {r2.status_code}: {r2.text}"

    try:
        rewards_json = r2.json()
    except ValueError as e:
        raise AssertionError(f"/api/rewards response is not valid JSON: {e}") from e

    payload = _find_rewards_payload(rewards_json)

    # Validate required fields
    assert "pointsBalance" in payload, f"Missing pointsBalance in response: {payload}"
    assert "streakDays" in payload, f"Missing streakDays in response: {payload}"
    assert "nextTierPoints" in payload, f"Missing nextTierPoints in response: {payload}"
    assert "catalog" in payload, f"Missing catalog in response: {payload}"
    assert "redemptions" in payload, f"Missing redemptions in response: {payload}"

    # Type checks
    assert isinstance(payload["catalog"], list), f"catalog is not an array: {type(payload['catalog'])}"
    assert isinstance(payload["redemptions"], list), f"redemptions is not an array: {type(payload['redemptions'])}"

    # Optional: basic numeric sanity checks
    try:
        # pointsBalance and nextTierPoints may be int/float/str; attempt numeric comparison if possible
        pb = payload["pointsBalance"]
        ntp = payload["nextTierPoints"]
        # If they are strings that represent numbers, convert; else just ensure presence
        for val in (pb, ntp):
            if isinstance(val, str):
                float(val)  # will raise if not numeric
    except Exception:
        # not fatal, but ensure keys exist (already asserted)
        pass

    print("TC018 passed: /api/rewards returned pointsBalance, streakDays, nextTierPoints, catalog (array), and redemptions (array).")


if __name__ == "__main__":
    try:
        test_tc018_get_rewards_returns_smile_points_and_catalog()
    except AssertionError as ae:
        print(f"AssertionError: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(2)
    else:
        sys.exit(0)