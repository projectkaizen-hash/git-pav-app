// Unit tests for the routing-provider ETA model.
// Global fetch is mocked so Mapbox/OSRM responses, circuit-breaker
// transitions, and the haversine fallback are all exercised hermetically.
// The module reads env at import time, so tests import it dynamically
// after setting the desired provider env.

process.env.PORT = process.env.PORT || "3000";

describe("van-eta routing providers", () => {
  const LONDON_A = { lat: 51.5032, lng: -0.1276 };
  const LONDON_B = { lat: 51.501, lng: -0.1416 };

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.MAPBOX_TOKEN;
    delete process.env.OSRM_BASE_URL;
  });

  function mockFetchOnce(body: unknown, ok = true) {
    const fetchMock = jest.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      statusText: ok ? "OK" : "Service Unavailable",
      json: async () => body,
    } as any);
    global.fetch = fetchMock as any;
    return fetchMock;
  }

  async function loadModule() {
    //jest.isolateModules keeps the module-level breaker/cache isolated.
    let mod: typeof import("../lib/van-eta");
    jest.isolateModules(() => {
      mod = require("../lib/van-eta");
    });
    return mod!;
  }

  test("haversine fallback when no provider configured", async () => {
    const eta = await loadModule();
    expect(eta.getRoutingProvider()).toBe("haversine");

    const seconds = await eta.travelSeconds(LONDON_A, LONDON_B);
    // ~1.2 km straight-line × 1.4 road factor ÷ 20 km/h ≈ 5 min
    expect(seconds).toBeGreaterThan(120);
    expect(seconds).toBeLessThan(600);
  });

  test("mapbox provider parses durations and reports mode", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();
    expect(eta.getRoutingProvider()).toBe("mapbox");

    const fetchMock = mockFetchOnce({ code: "Ok", durations: [[0, 900], [900, 0]] });

    const seconds = await eta.travelSeconds(LONDON_A, LONDON_B);
    expect(seconds).toBe(900);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("directions-matrix/v1/mapbox/driving");
    expect(String(fetchMock.mock.calls[0][0])).toContain("access_token=pk_test_unit");
  });

  test("osrm provider parses durations", async () => {
    process.env.OSRM_BASE_URL = "https://routing.example.com";
    const eta = await loadModule();

    const fetchMock = mockFetchOnce({ code: "Ok", durations: [[0, 600], [600, 0]] });

    const seconds = await eta.travelSeconds(LONDON_A, LONDON_B);
    expect(seconds).toBe(600);
    expect(String(fetchMock.mock.calls[0][0])).toContain("https://routing.example.com/table/v1/driving");
  });

  test("caches repeated identical legs (one provider call for two queries)", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();
    const fetchMock = mockFetchOnce({ code: "Ok", durations: [[0, 300], [300, 0]] });

    await eta.travelSeconds(LONDON_A, LONDON_B);
    await eta.travelSeconds(LONDON_A, LONDON_B);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("falls back to haversine when provider errors, and opens the breaker", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    const fallbackSeconds = await eta.travelSeconds(LONDON_A, LONDON_B); // works via fallback
    expect(fallbackSeconds).toBeGreaterThan(0);

    // No fetch mock set → fetch is undefined-ish; force it to reject.
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;

    // First VAN_ROUTING_FAILURE_THRESHOLD (3) calls degrade silently.
    await eta.travelSeconds(LONDON_A, LONDON_B);
    await eta.travelSeconds(LONDON_A, LONDON_B);
    await eta.travelSeconds(LONDON_A, LONDON_B);

    // Breaker now open: travelSeconds still answers via fallback.
    const seconds = await eta.travelSeconds(LONDON_A, LONDON_B);
    expect(seconds).toBeGreaterThan(0);
  });

  test("whole chain uses one matrix request (n+1 legs → 1 call)", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    const queue = [
      { lat: 51.51, lng: -0.13, phase: "queued", treatmentStartedAt: null, treatmentMinutes: 30, bufferMinutes: 10 },
      { lat: 51.52, lng: -0.14, phase: "queued", treatmentStartedAt: null, treatmentMinutes: 45, bufferMinutes: 10 },
    ];
    // 4 waypoints → 4×4 matrix, every leg 600s
    const n = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => 600));
    const fetchMock = mockFetchOnce({ code: "Ok", durations: matrix });

    const total = await eta.etaSecondsToNewPatient(LONDON_A, queue, LONDON_B);

    // 3 travel legs × 600s + 2 stops × (30 or 45 min treatment + 10 min buffer)
    const expected = 3 * 600 + (30 + 10) * 60 + (45 + 10) * 60;
    expect(total).toBe(expected);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("skips travel legs for stops the van is already at", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    const queue = [
      { lat: 51.51, lng: -0.13, phase: "in_treatment", treatmentStartedAt: new Date(Date.now() - 10 * 60 * 1000), treatmentMinutes: 30, bufferMinutes: 10 },
    ];
    const matrix = [
      [0, 600, 900],
      [600, 0, 700],
      [900, 700, 0],
    ];
    mockFetchOnce({ code: "Ok", durations: matrix });

    const total = await eta.etaSecondsToNewPatient(LONDON_A, queue, LONDON_B);
    // No travel to stop (already there): remaining treatment (20 min) + buffer 10 min + travel stop→target 700s
    const expected = (30 - 10) * 60 + 10 * 60 + 700;
    expect(total).toBe(expected);
  });

  test("formatEtaLabel bands", () => {
    const eta = require("../lib/van-eta");
    expect(eta.formatEtaLabel(90)).toBe("< 5 min");
    expect(eta.formatEtaLabel(1200)).toBe("20–30 min"); // 20 min floors to 20
    expect(eta.formatEtaLabel(1500)).toBe("25–35 min"); // 25 min floors to 25
    expect(eta.formatEtaLabel(7200)).toBe("~2 hr");
  });
});
