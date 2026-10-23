import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def _find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            res = _find_key(v, key)
            if res is not None:
                return res
    elif isinstance(obj, list):
        for item in obj:
            res = _find_key(item, key)
            if res is not None:
                return res
    return None

def _is_ok_value(val):
    if isinstance(val, bool):
        return val is True
    if isinstance(val, str):
        return val.strip().lower() in {"ok", "healthy", "up", "pass", "available", "ready"}
    if isinstance(val, dict):
        # Some health checks include { "status": "ok" }
        s = val.get("status") or val.get("state")
        return _is_ok_value(s)
    return False

def test_get_health_endpoint_returns_service_and_dependency_status():
    url = f"{BASE_URL}/health"
    try:
        resp = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}. Body: {resp.text}"

    # Ensure JSON response
    try:
        data = resp.json()
    except ValueError:
        raise AssertionError(f"Response is not valid JSON. Raw body: {resp.text}")

    # Verify service status exists and indicates OK
    service_keys = ["status", "serviceStatus", "health", "state"]
    service_value = None
    for k in service_keys:
        if k in data:
            service_value = data[k]
            break
    # fallback: search nested for common "status" key
    if service_value is None:
        service_value = _find_key(data, "status") or _find_key(data, "serviceStatus") or _find_key(data, "health")

    assert service_value is not None, f"Could not find a top-level service/status value in response JSON: {data}"
    assert _is_ok_value(service_value), f"Service status is not OK. Found value: {service_value}"

    # Verify database and redis checks are present and OK (search nested)
    db_val = _find_key(data, "database") or _find_key(data, "db") or _find_key(data, "postgres")
    redis_val = _find_key(data, "redis") or _find_key(data, "cache") or _find_key(data, "redisCache")

    assert db_val is not None, f"Database health key not found in response JSON: {data}"
    assert _is_ok_value(db_val), f"Database health check not OK. Found: {db_val}"

    assert redis_val is not None, f"Redis health key not found in response JSON: {data}"
    assert _is_ok_value(redis_val), f"Redis health check not OK. Found: {redis_val}"

    print("TC001 passed: /health returned 200 and service, database, and redis checks indicate OK.")

if __name__ == "__main__":
    try:
        test_get_health_endpoint_returns_service_and_dependency_status()
    except AssertionError as e:
        print(f"TC001 failed: {e}")
        sys.exit(1)
    except Exception as ex:
        print(f"TC001 encountered an unexpected error: {ex}")
        sys.exit(2)
    sys.exit(0)
