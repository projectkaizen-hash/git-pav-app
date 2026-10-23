import requests
import uuid
import time
import traceback

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_auth_register_creates_new_patient_account_with_valid_data():
    unique_email = f"e2e_{uuid.uuid4().hex}@pavdental.com"
    password = "Password123!"
    payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": unique_email,
        "password": password
    }
    headers = {"Content-Type": "application/json"}

    created_user_id = None
    try:
        # Register new patient
        try:
            resp = requests.post(f"{BASE_URL}/api/auth/register", json=payload, headers=headers, timeout=TIMEOUT)
        except Exception as e:
            raise AssertionError(f"Request to register failed: {e}")

        # Assert HTTP 201 Created
        if resp.status_code != 201:
            # Attempt to surface response body for debugging
            body = None
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            raise AssertionError(f"Expected status 201, got {resp.status_code}. Body: {body}")

        # Parse JSON
        try:
            data = resp.json()
        except Exception as e:
            raise AssertionError(f"Response is not valid JSON: {e}. Raw body: {resp.text}")

        # Validate presence of tokens and user
        assert isinstance(data, dict), "Response JSON must be an object"
        assert "accessToken" in data and isinstance(data["accessToken"], str) and data["accessToken"], "accessToken missing or invalid"
        assert "refreshToken" in data and isinstance(data["refreshToken"], str) and data["refreshToken"], "refreshToken missing or invalid"
        assert "user" in data and isinstance(data["user"], dict), "user object missing or invalid"

        user = data["user"]
        # Basic user validations
        assert "id" in user and user["id"], "user.id missing"
        created_user_id = user["id"]
        # Email should match the one we registered (case-insensitive)
        returned_email = user.get("email")
        assert isinstance(returned_email, str) and returned_email.lower() == unique_email.lower(), f"Returned user.email does not match. Expected {unique_email}, got {returned_email}"

        print("Registration succeeded. accessToken and refreshToken received, user object validated.")

    finally:
        # Attempt cleanup: try to delete the created user if possible.
        # This will try to log in with the created account to obtain auth and then call DELETE on the patient's resource.
        # If the API does not expose deletion, errors are caught and not re-raised to avoid failing the test cleanup.
        if created_user_id:
            try:
                login_payload = {"email": unique_email, "password": password}
                login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
                if login_resp.status_code == 200:
                    try:
                        login_data = login_resp.json()
                        access_token = login_data.get("accessToken")
                    except Exception:
                        access_token = None

                    if access_token:
                        del_headers = {
                            "Authorization": f"Bearer {access_token}"
                        }
                        # Attempt to delete patient resource (if endpoint exists)
                        try:
                            del_resp = requests.delete(f"{BASE_URL}/api/patients/{created_user_id}", headers=del_headers, timeout=TIMEOUT)
                            # Accept common successful/allowed outcomes; otherwise log
                            if del_resp.status_code in (200, 204):
                                print(f"Cleanup: deleted user {created_user_id} (status {del_resp.status_code}).")
                            else:
                                print(f"Cleanup: delete returned status {del_resp.status_code}. Response: {del_resp.text}")
                        except Exception as e:
                            print(f"Cleanup: exception when attempting DELETE /api/patients/{{id}}: {e}")
                    else:
                        print("Cleanup: could not obtain accessToken from login response to authenticate delete request.")
                else:
                    # Login failed - cannot authenticate to delete user
                    print(f"Cleanup: login as created user failed with status {login_resp.status_code}. Body: {login_resp.text}")
            except Exception:
                print("Cleanup: exception during cleanup login/delete:")
                traceback.print_exc()

if __name__ == "__main__":
    test_post_auth_register_creates_new_patient_account_with_valid_data()
    print("Test completed.")