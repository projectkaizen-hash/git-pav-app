import requests

BASE_ENDPOINT = "http://localhost:3000/"

def test_get_livez_returns_ready_status():
    url = BASE_ENDPOINT.rstrip('/') + "/livez"
    headers = {"Accept": "application/json"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"HTTP request to {url} failed: {e}"

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}. Body: {resp.text}"

    content_type = resp.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), f"Expected JSON response, got Content-Type: {content_type}"

    try:
        body = resp.json()
    except ValueError:
        assert False, f"Response is not valid JSON: {resp.text}"

    assert isinstance(body, dict), f"Expected JSON object in response, got {type(body)}: {body}"

    # Determine readiness from common fields that a liveness probe might expose
    ready = False

    if "status" in body:
        try:
            if str(body["status"]).strip().lower() in {"ok", "ready", "healthy", "alive", "up", "running"}:
                ready = True
        except Exception:
            pass

    if "ready" in body:
        val = body["ready"]
        if isinstance(val, bool) and val:
            ready = True
        else:
            try:
                if str(val).strip().lower() in {"true", "1", "ok", "ready", "yes"}:
                    ready = True
            except Exception:
                pass

    if "isReady" in body:
        val = body["isReady"]
        if isinstance(val, bool) and val:
            ready = True
        else:
            try:
                if str(val).strip().lower() in {"true", "1", "ok", "ready", "yes"}:
                    ready = True
            except Exception:
                pass

    if "liveness" in body:
        try:
            if str(body["liveness"]).strip().lower() in {"ok", "ready", "alive", "true"}:
                ready = True
        except Exception:
            pass

    assert ready, f"Liveness probe did not indicate readiness. Response body: {body}"

if __name__ == "__main__":
    test_get_livez_returns_ready_status()
    print("TC002 passed")