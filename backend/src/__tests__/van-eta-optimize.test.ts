// Unit tests for optimizeStopOrder — exact permutation search (matrix mode)
// and haversine fallback. fetch is mocked for the matrix path.

process.env.PORT = process.env.PORT || "3000";

describe("optimizeStopOrder", () => {
  const VAN = { lat: 51.5, lng: -0.12 };

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.MAPBOX_TOKEN;
    delete process.env.OSRM_BASE_URL;
  });

  async function loadModule() {
    let mod: typeof import("../lib/van-eta");
    jest.isolateModules(() => {
      mod = require("../lib/van-eta");
    });
    return mod!;
  }

  test("single stop returns trivially", async () => {
    const eta = await loadModule();
    const order = await eta.optimizeStopOrder(VAN, [{ lat: 51.51, lng: -0.13 }]);
    expect(order).toEqual([0]);
  });

  test("matrix mode: picks the genuinely shorter driving route, not the closer straight line", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    // Stop A is straight-line closer to the van; stop B is farther as the
    // crow flies. But driving: van→B is 300s, B→A is 200s (total 500) while
    // van→A is 400s, A→B is 900s (total 1300). Correct answer: B first.
    const A = { lat: 51.505, lng: -0.125 }; // near van
    const B = { lat: 51.52, lng: -0.14 }; // far van
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: "Ok",
        // matrix order: [van, A, B]
        durations: [
          [0, 400, 300],
          [400, 0, 900],
          [300, 200, 0],
        ],
      }),
    } as any);

    const order = await eta.optimizeStopOrder(VAN, [A, B]);
    expect(order).toEqual([1, 0]); // B first — road topology beats straight line
  });

  test("matrix mode: three stops solved exactly", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    // Asymmetric costs designed so [2, 0, 1] is the strict optimum (1000s):
    // [0,1,2]=1100, [0,2,1]=2000, [1,0,2]=1500, [1,2,0]=2100, [2,1,0]=1200.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: "Ok",
        durations: [
          // to:  van   s0   s1   s2
          [0, 300, 500, 100],
          [300, 0, 100, 800],
          [500, 200, 0, 700],
          [100, 800, 900, 0],
        ],
      }),
    } as any);

    const s0 = { lat: 51.501, lng: -0.121 };
    const s1 = { lat: 51.502, lng: -0.122 };
    const s2 = { lat: 51.503, lng: -0.123 };

    const order = await eta.optimizeStopOrder(VAN, [s0, s1, s2]);
    expect(order).toEqual([2, 0, 1]);
  });

  test("haversine fallback (no provider) still returns a full permutation", async () => {
    const eta = await loadModule();

    const stops = [
      { lat: 51.53, lng: -0.15 },
      { lat: 51.501, lng: -0.121 }, // clearly nearest to the van
      { lat: 51.54, lng: -0.16 },
    ];

    const order = await eta.optimizeStopOrder(VAN, stops);

    expect([...order].sort()).toEqual([0, 1, 2]); // valid permutation
    expect(order[0]).toBe(1); // nearest stop first in the fallback model
  });

  test("uses exactly one matrix request for the whole problem", async () => {
    process.env.MAPBOX_TOKEN = "pk_test_unit";
    const eta = await loadModule();

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: "Ok", durations: [[0]] }),
    } as any);
    global.fetch = fetchMock;

    await eta.optimizeStopOrder(VAN, [
      { lat: 51.51, lng: -0.13 },
      { lat: 51.52, lng: -0.14 },
      { lat: 51.53, lng: -0.15 },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
