import requests
import sys

BASE_URL = "http://localhost:3000"
LOGIN_EMAIL = "test@pavdental.com"
LOGIN_PASSWORD = "Password123!"
TIMEOUT = 30


def test_post_financing_apply_creates_0_percent_apr_bnpl_financing_application():
    # Authenticate
    login_url = f"{BASE_URL.rstrip('/')}/api/auth/login"
    login_payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}") from e

    assert login_resp.status_code == 200, f"Expected 200 from login, got {login_resp.status_code}, body: {login_resp.text}"
    try:
        login_json = login_resp.json()
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {login_resp.text}")

    access_token = login_json.get("accessToken") or login_json.get("access_token")
    user = login_json.get("user") or {}
    user_id = user.get("id") or user.get("userId")

    assert access_token, f"Login response missing accessToken: {login_json}"
    assert user_id, f"Login response missing user.id: {login_json}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Prepare financing application payload
    apply_url = f"{BASE_URL.rstrip('/')}/api/financing/apply"
    apply_payload = {"treatmentCostPence": 120000, "durationMonths": 12}

    created_app_id = None
    agreement_ref = None

    try:
        try:
            apply_resp = requests.post(apply_url, json=apply_payload, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Financing apply request failed: {e}") from e

        assert apply_resp.status_code == 201, f"Expected 201 from financing apply, got {apply_resp.status_code}, body: {apply_resp.text}"
        try:
            apply_json = apply_resp.json()
        except ValueError:
            raise AssertionError(f"Financing apply response is not valid JSON: {apply_resp.text}")

        # Validate required fields
        status = apply_json.get("status")
        monthly_pence = apply_json.get("monthlyPence")
        agreement_ref = apply_json.get("agreementRef") or apply_json.get("agreement_ref") or apply_json.get("agreementReference")

        assert status == "pre_approved", f"Expected status 'pre_approved', got {status}"
        assert monthly_pence == 10000, f"Expected monthlyPence 10000, got {monthly_pence}"
        assert agreement_ref and isinstance(agreement_ref, str), f"Expected non-empty agreementRef string, got {agreement_ref}"

        # Attempt to capture an ID for cleanup if provided
        created_app_id = apply_json.get("id") or apply_json.get("applicationId") or apply_json.get("application_id")

    finally:
        # Cleanup: try to find and delete the application if possible
        try:
            # If no explicit id returned, try to locate by agreementRef via GET /api/financing
            if not created_app_id and agreement_ref:
                financing_overview_url = f"{BASE_URL.rstrip('/')}/api/financing"
                try:
                    overview_resp = requests.get(financing_overview_url, headers=headers, timeout=TIMEOUT)
                except requests.RequestException:
                    overview_resp = None

                if overview_resp and overview_resp.status_code == 200:
                    try:
                        overview_json = overview_resp.json()
                    except ValueError:
                        overview_json = {}
                    applications = overview_json.get("applications") or overview_json.get("applicationsList") or overview_json.get("data") or []
                    for app in applications:
                        if app and (app.get("agreementRef") == agreement_ref or app.get("agreement_ref") == agreement_ref):
                            created_app_id = app.get("id") or app.get("applicationId") or app.get("application_id")
                            break

            # If we have an id, attempt DELETE /api/financing/{id}
            if created_app_id:
                delete_url = f"{BASE_URL.rstrip('/')}/api/financing/{created_app_id}"
                try:
                    delete_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                    # Accept 200/204 as successful deletion; if 404/405, just ignore as cleanup may not be supported
                    if delete_resp.status_code not in (200, 204, 404, 405):
                        print(f"Unexpected status deleting financing application {created_app_id}: {delete_resp.status_code}, body: {delete_resp.text}", file=sys.stderr)
                except requests.RequestException as e:
                    print(f"Failed to delete financing application {created_app_id}: {e}", file=sys.stderr)
        except Exception as e:
            # Ensure cleanup exceptions don't mask test assertions
            print(f"Error during cleanup: {e}", file=sys.stderr)


if __name__ == "__main__":
    test_post_financing_apply_creates_0_percent_apr_bnpl_financing_application()
    print("TC017 passed")