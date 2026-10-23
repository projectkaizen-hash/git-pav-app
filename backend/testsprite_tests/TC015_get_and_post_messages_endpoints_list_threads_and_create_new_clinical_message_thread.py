import requests
import sys

BASE = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
MESSAGES_PATH = "/api/messages"
TIMEOUT = 30

def test_tc015_get_and_post_messages_list_and_create_thread():
    # Login
    login_url = BASE.rstrip('/') + LOGIN_PATH
    login_payload = {
        "email": "test@pavdental.com",
        "password": "Password123!"
    }
    try:
        resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")
    assert resp.status_code == 200, f"Expected 200 from login, got {resp.status_code}, body: {resp.text}"
    try:
        auth_data = resp.json()
    except ValueError:
        raise AssertionError("Login response is not valid JSON")
    access_token = auth_data.get("accessToken") or auth_data.get("access_token")
    user = auth_data.get("user") or {}
    user_id = None
    if isinstance(user, dict):
        user_id = user.get("id") or user.get("userId") or user.get("uid")
    assert access_token, f"No accessToken in login response: {auth_data}"
    assert user_id, f"No user.id in login response: {auth_data}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    # GET /api/messages
    get_messages_url = BASE.rstrip('/') + MESSAGES_PATH
    try:
        resp = requests.get(get_messages_url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET /api/messages request failed: {e}")
    assert resp.status_code == 200, f"Expected 200 from GET /api/messages, got {resp.status_code}, body: {resp.text}"
    try:
        messages_list = resp.json()
    except ValueError:
        raise AssertionError("GET /api/messages response is not valid JSON")
    assert isinstance(messages_list, list), f"Expected messages response to be a list, got {type(messages_list)}"

    # POST /api/messages - create a new clinical message thread
    post_payload = {
        "subject": "Post-visit question",
        "body": "Is mild sensitivity normal?",
        "recipientName": "Pav Dental Clinical Team"
    }
    created_thread_id = None
    try:
        resp = requests.post(get_messages_url, headers=headers, json=post_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"POST /api/messages request failed: {e}")

    # Expect HTTP 201
    assert resp.status_code == 201, f"Expected 201 from POST /api/messages, got {resp.status_code}, body: {resp.text}"
    try:
        created = resp.json()
    except ValueError:
        raise AssertionError("POST /api/messages response is not valid JSON")
    # Basic validation of returned thread
    # Accept either id or threadId naming
    created_thread_id = created.get("id") or created.get("threadId") or created.get("messageThreadId")
    returned_subject = created.get("subject") or (created.get("thread") or {}).get("subject")

    # Flexible extraction for the message body: check multiple possible keys and nested structures
    returned_body = None
    # Top-level candidates
    for key in ("body", "message", "content", "initialMessage", "initial_post", "initialPost"):
        if isinstance(created.get(key), str):
            returned_body = created.get(key)
            break
    # If not found, look into 'messages' or 'posts' lists
    if returned_body is None:
        for list_key in ("messages", "posts", "entries"):
            msgs = created.get(list_key)
            if isinstance(msgs, list) and len(msgs) > 0 and isinstance(msgs[0], dict):
                for k in ("body", "message", "content"):
                    if isinstance(msgs[0].get(k), str):
                        returned_body = msgs[0].get(k)
                        break
                if returned_body is not None:
                    break
    # If still not found, check nested 'thread' or similar
    if returned_body is None:
        thread_obj = created.get("thread") or created.get("threadData") or created.get("data")
        if isinstance(thread_obj, dict):
            for k in ("body", "message", "content", "initialMessage"):
                if isinstance(thread_obj.get(k), str):
                    returned_body = thread_obj.get(k)
                    break
    returned_recipient = (
        created.get("recipientName")
        or created.get("recipient")
        or created.get("recipient_name")
        or created.get("from")
        or created.get("fromName")
        or (created.get("thread") or {}).get("recipientName")
    )

    # If still none, try to extract from first message sender
    if returned_recipient is None:
        for list_key in ("messages", "posts", "entries"):
            msgs = created.get(list_key)
            if isinstance(msgs, list) and len(msgs) > 0 and isinstance(msgs[0], dict):
                returned_recipient = msgs[0].get("senderName") or msgs[0].get("sender") or msgs[0].get("from")
                if returned_recipient is not None:
                    break

    # Assertions
    assert returned_subject == post_payload["subject"], f"Subject mismatch: expected '{post_payload['subject']}', got '{returned_subject}'"
    assert returned_body == post_payload["body"], f"Body mismatch: expected '{post_payload['body']}', got '{returned_body}'"
    # recipientName may be optional in response naming; at minimum ensure some recipient is present
    assert returned_recipient is not None, f"Expected recipientName (or equivalent) in created thread, got: {created}"

    # Cleanup: attempt to delete the created thread if an ID is present
    if created_thread_id:
        delete_url = BASE.rstrip('/') + f"{MESSAGES_PATH.rstrip('/')}/{created_thread_id}"
        try:
            del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
            # Accept 200, 202, 204 as valid deletion responses; 404 means already gone
            if del_resp.status_code not in (200, 202, 204, 404):
                raise AssertionError(f"Unexpected status from DELETE {delete_url}: {del_resp.status_code}, body: {del_resp.text}")
        except requests.RequestException as e:
            # Do not fail the test for cleanup errors, but surface a warning via exception
            raise AssertionError(f"Cleanup DELETE request failed: {e}")

    print("TC015 passed: GET /api/messages returned 200 and POST /api/messages created a new thread with 201")

if __name__ == "__main__":
    try:
        test_tc015_get_and_post_messages_list_and_create_thread()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)
