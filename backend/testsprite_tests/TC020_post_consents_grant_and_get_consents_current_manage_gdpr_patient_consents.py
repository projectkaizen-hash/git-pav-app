import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def _extract_json(resp):
    try:
        return resp.json()
    except ValueError:
        raise AssertionError(f"Response is not valid JSON (status {resp.status_code}): {resp.text}")


def _get_from_auth_response(auth_json, key_options):
    # auth_json may be { accessToken, refreshToken, user } or { data: { accessToken, user } }
    candidates = []
    if isinstance(auth_json, dict):
        candidates.append(auth_json)
        if "data" in auth_json and isinstance(auth_json["data"], dict):
            candidates.append(auth_json["data"])
    for candidate in candidates:
        for key in key_options:
            if key in candidate:
                return candidate[key]
    return None


def test_post_consents_grant_and_get_consents_current():
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"email": "test@pavdental.com", "password": "Password123!"}
    headers = {"Content-Type": "application/json"}

    # Authenticate
    try:
        r = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert r.status_code == 200, f"Expected 200 from login, got {r.status_code}: {r.text}"
    auth_json = _extract_json(r)

    # Extract access token
    access_token = _get_from_auth_response(auth_json, ["accessToken", "access_token", "token"])
    if access_token is None:
        # Try nested under auth_json['tokens'] or auth_json.get('auth')
        if isinstance(auth_json, dict):
            if "tokens" in auth_json and isinstance(auth_json["tokens"], dict):
                access_token = auth_json["tokens"].get("accessToken") or auth_json["tokens"].get("access_token")
    assert access_token, f"accessToken not found in login response: {auth_json}"

    # Extract user id
    user_obj = _get_from_auth_response(auth_json, ["user"])
    user_id = None
    if isinstance(user_obj, dict):
        user_id = user_obj.get("id") or user_obj.get("userId") or user_obj.get("uid")
    else:
        # maybe top-level user
        if isinstance(auth_json, dict):
            user = auth_json.get("user")
            if isinstance(user, dict):
                user_id = user.get("id") or user.get("userId") or user.get("uid")
    assert user_id, f"user.id not found in login response: {auth_json}"

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Prepare consent grant
    grant_url = f"{BASE_URL}/api/consents/grant"
    grant_payload = {"consentType": "marketing_communications", "lawfulBasis": "consent"}

    consent_id = None
    granted_response_json = None

    try:
        # POST consent grant
        try:
            r_grant = requests.post(grant_url, json=grant_payload, headers=auth_headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Consent grant request failed: {e}")

        assert r_grant.status_code == 201, f"Expected 201 from consent grant, got {r_grant.status_code}: {r_grant.text}"
        granted_response_json = _extract_json(r_grant)

        # Validate isGranted true (accept various truthy representations)
        isGranted_val = granted_response_json.get("isGranted")
        if isGranted_val not in (True, "true", "True", 1, "1"):
            raise AssertionError(f"Consent grant response did not indicate granted. isGranted={isGranted_val} payload={granted_response_json}")

        # Try to capture consent id for cleanup if present
        possible_id_keys = ["id", "consentId", "consent_id", "_id"]
        for k in possible_id_keys:
            if k in granted_response_json:
                consent_id = granted_response_json[k]
                break

        # GET current consents
        current_url = f"{BASE_URL}/api/consents/current"
        try:
            r_current = requests.get(current_url, headers=auth_headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Get current consents request failed: {e}")

        assert r_current.status_code == 200, f"Expected 200 from consents current, got {r_current.status_code}: {r_current.text}"
        current_json = _extract_json(r_current)

        # Normalize to list of records
        if isinstance(current_json, list):
            records = current_json
        elif isinstance(current_json, dict):
            if "data" in current_json and isinstance(current_json["data"], list):
                records = current_json["data"]
            elif "consents" in current_json and isinstance(current_json["consents"], list):
                records = current_json["consents"]
            else:
                # maybe the object itself is a single consent record
                records = [current_json]
        else:
            records = []

        assert isinstance(records, list), f"Consents response is not a list: {current_json}"
        assert len(records) > 0, f"No active consents returned: {current_json}"

        # Ensure at least one active consent matches our grant
        found = False
        for rec in records:
            try:
                rec_type = rec.get("consentType")
                rec_granted = rec.get("isGranted")
            except Exception:
                continue
            if rec_type == "marketing_communications" and rec_granted in (True, "true", "True", 1, "1"):
                found = True
                break

        assert found, f"Active consent for marketing_communications with isGranted true not found in current consents: {records}"

        print("TC020 passed: consent granted and present in current consents.")

    finally:
        # Attempt cleanup if consent id is available. Endpoint not guaranteed; ignore failures.
        if consent_id:
            delete_url = f"{BASE_URL}/api/consents/{consent_id}"
            try:
                requests.delete(delete_url, headers=auth_headers, timeout=TIMEOUT)
            except requests.RequestException:
                pass


if __name__ == "__main__":
    try:
        test_post_consents_grant_and_get_consents_current()
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        sys.exit(2)
    else:
        sys.exit(0)