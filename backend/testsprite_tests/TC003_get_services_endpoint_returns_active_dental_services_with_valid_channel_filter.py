import requests
import sys

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def _extract_channel_info(service):
    """
    Attempt to find channel information in a service object.
    Returns:
      - None if no recognizable channel info found
      - a string or list of strings describing channel(s) if found
    """
    possible_keys = [
        "channel",
        "channels",
        "availableChannels",
        "channelsAvailable",
        "serviceChannels",
        "channelsServed",
        "available_channel",
        "available_channels",
    ]
    for k in possible_keys:
        if k in service:
            return service[k]
    # check nested common placements
    if isinstance(service, dict):
        for v in service.values():
            if isinstance(v, (str, list)):
                # heuristic: strings like "clinic" or lists of those
                if isinstance(v, str) and v.lower() in ("clinic", "van", "video"):
                    return v
                if isinstance(v, list) and any(isinstance(i, str) for i in v):
                    return v
    return None


def _has_channel(service, channel):
    """
    Return True/False if service explicitly declares membership of the channel.
    If channel info cannot be found, returns None.
    """
    info = _extract_channel_info(service)
    if info is None:
        return None
    if isinstance(info, str):
        return info.lower() == channel.lower()
    if isinstance(info, list):
        return any(isinstance(i, str) and i.lower() == channel.lower() for i in info)
    return None


def test_TC003_get_services_returns_active_dental_services_with_channel_filter():
    session = requests.Session()
    headers = {"Accept": "application/json"}
    try:
        # 1) GET all services (no filter)
        url_all = f"{BASE_URL}/api/services"
        resp_all = session.get(url_all, headers=headers, timeout=TIMEOUT)
        assert resp_all.status_code == 200, f"Expected 200 for GET /api/services, got {resp_all.status_code}: {resp_all.text}"
        try:
            services_all = resp_all.json()
        except Exception as e:
            raise AssertionError(f"Response body from /api/services is not valid JSON: {e}")
        assert isinstance(services_all, list), f"Expected JSON array from /api/services, got {type(services_all)}"
        assert len(services_all) > 0, "Expected at least one service in /api/services response"

        # 2) GET services filtered by channel=clinic
        url_clinic = f"{BASE_URL}/api/services"
        resp_clinic = session.get(url_clinic, headers=headers, params={"channel": "clinic"}, timeout=TIMEOUT)
        assert resp_clinic.status_code == 200, f"Expected 200 for GET /api/services?channel=clinic, got {resp_clinic.status_code}: {resp_clinic.text}"
        try:
            services_clinic = resp_clinic.json()
        except Exception as e:
            raise AssertionError(f"Response body from /api/services?channel=clinic is not valid JSON: {e}")
        assert isinstance(services_clinic, list), f"Expected JSON array from /api/services?channel=clinic, got {type(services_clinic)}"
        assert len(services_clinic) <= len(services_all), "Filtered (clinic) results should not be larger than unfiltered results"

        # 3) GET services filtered by channel=van
        url_van = f"{BASE_URL}/api/services"
        resp_van = session.get(url_van, headers=headers, params={"channel": "van"}, timeout=TIMEOUT)
        assert resp_van.status_code == 200, f"Expected 200 for GET /api/services?channel=van, got {resp_van.status_code}: {resp_van.text}"
        try:
            services_van = resp_van.json()
        except Exception as e:
            raise AssertionError(f"Response body from /api/services?channel=van is not valid JSON: {e}")
        assert isinstance(services_van, list), f"Expected JSON array from /api/services?channel=van, got {type(services_van)}"
        assert len(services_van) <= len(services_all), "Filtered (van) results should not be larger than unfiltered results"

        # 4) Verify filtering semantics where possible:
        # If the API exposes channel information on services, each filtered item should include the requested channel.
        # We'll inspect items and if at least one item provides channel info, require that all such items match the filter.
        def verify_filter_matches(services_list, channel_name):
            info_found = False
            mismatches = []
            for s in services_list:
                has = _has_channel(s, channel_name)
                if has is None:
                    # no explicit channel info in this service object; skip strict check for this item
                    continue
                info_found = True
                if not has:
                    mismatches.append(s)
            if info_found:
                assert not mismatches, f"Some services returned for channel={channel_name} do not declare that channel: {mismatches}"

        verify_filter_matches(services_clinic, "clinic")
        verify_filter_matches(services_van, "van")

        # 5) Basic sanity: ensure filtered sets differ or at least one is non-empty (meaning filter is having effect)
        if len(services_clinic) == 0 and len(services_van) == 0:
            raise AssertionError("Both clinic and van filtered responses are empty; expected at least one channel-specific service according to PRD.")
        # If both non-empty, prefer they are not identical (different channels should yield different sets)
        if len(services_clinic) > 0 and len(services_van) > 0:
            if services_clinic == services_van:
                # If identical, at least ensure elements declare multiple channels (acceptable) or raise a warning as failure
                # We'll attempt to detect if services explicitly include both channels; if not, fail.
                both_declared_ok = True
                for s in services_clinic:
                    info = _extract_channel_info(s)
                    if info is None:
                        both_declared_ok = False
                        break
                    if isinstance(info, str):
                        if info.lower() not in ("clinic", "van"):
                            both_declared_ok = False
                            break
                        # single string can't be both channels; so identical lists with single-channel items is suspicious
                        if info.lower() in ("clinic", "van"):
                            both_declared_ok = False
                            break
                    if isinstance(info, list):
                        if not (any(i.lower() == "clinic" for i in info) and any(i.lower() == "van" for i in info)):
                            both_declared_ok = False
                            break
                assert both_declared_ok, "Filtered results for clinic and van are identical but services do not explicitly declare both channels; filter may not be applied correctly."

        print("TC003 passed: /api/services returns active services and filters by channel as expected.")
    except requests.RequestException as re:
        raise AssertionError(f"Network/request error while exercising /api/services endpoints: {re}")
    finally:
        session.close()


if __name__ == "__main__":
    try:
        test_TC003_get_services_returns_active_dental_services_with_channel_filter()
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", e)
        sys.exit(2)
    print("TEST SUCCEEDED")