// Unit tests for the unified van coverage helper.
// Prisma is mocked so both the PostGIS and JS code paths can be exercised
// hermetically, including the backend-probe logic and the GeoJSON tolerance
// behaviour (full GeoJSON vs legacy bare coordinate rings).

import { prisma } from "../lib/prisma";
import {
  getCoverageBackend,
  findCoveringVans,
  getOnlineShiftsCoveringPoint,
} from "../lib/van-coverage";

jest.mock("../lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    vanServicePolygon: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    vanShift: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const SQUARE_RING = [
  [-0.13, 51.49],
  [-0.11, 51.49],
  [-0.11, 51.51],
  [-0.13, 51.51],
  [-0.13, 51.49],
];

function fakePolygon(overrides: Record<string, unknown> = {}) {
  return {
    id: "poly_1",
    vanId: "van_1",
    sectorName: "Central",
    polygonGeoJson: { type: "Polygon", coordinates: [SQUARE_RING] },
    van: { name: "Van #1", vehicleModel: "Sprinter", isActive: true },
    ...overrides,
  };
}

const INSIDE_POINT = { lat: 51.5, lng: -0.12 };

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$queryRaw as jest.Mock).mockReset();
  (prisma.$executeRawUnsafe as jest.Mock).mockReset().mockResolvedValue(0);
  (prisma.vanServicePolygon.findMany as jest.Mock).mockReset().mockResolvedValue([]);
  (prisma.vanShift.findMany as jest.Mock).mockReset().mockResolvedValue([]);
});

describe("backend probing", () => {
  test("uses PostGIS when the extension and geometry column exist", async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ extname: "postgis" }])
      .mockResolvedValue([{ cnt: 1n }]);

    const backend = await getCoverageBackend(true);

    expect(backend.mode).toBe("postgis");
    // Backfill of NULL geometry columns ran against the DB
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  test("falls back to JS and drops the dead trigger when PostGIS is absent", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const backend = await getCoverageBackend(true);

    expect(backend.mode).toBe("js");
    expect(backend.reason).toBeDefined();
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("DROP TRIGGER IF EXISTS trigger_update_polygon")
    );
  });
});

describe("findCoveringVans — JS mode", () => {
  beforeEach(async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // no postgis extension
    await getCoverageBackend(true);
  });

  test("returns matching active vans", async () => {
    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([
      fakePolygon(),
      fakePolygon({ id: "poly_2", vanId: "van_2", sectorName: "Far" }),
    ]);

    const matches = await findCoveringVans(INSIDE_POINT);

    expect(matches.length).toBe(2);
    expect(matches[0]).toMatchObject({ vanName: "Van #1", sectorName: "Central" });
    expect(typeof matches[0].distanceKm).toBe("number");
  });

  test("skips malformed GeoJSON instead of throwing", async () => {
    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([
      fakePolygon({ polygonGeoJson: { type: "Polygon", coordinates: [] } }),
    ]);

    const matches = await findCoveringVans(INSIDE_POINT);
    expect(matches).toEqual([]);
  });

  test("tolerates legacy bare coordinate rings", async () => {
    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([
      fakePolygon({ polygonGeoJson: [SQUARE_RING] as any }),
    ]);

    const matches = await findCoveringVans(INSIDE_POINT);
    expect(matches.length).toBe(1);
  });

  test("excludes points outside every polygon", async () => {
    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([fakePolygon()]);

    const matches = await findCoveringVans({ lat: 53.0, lng: -1.0 });
    expect(matches).toEqual([]);
  });
});

describe("getOnlineShiftsCoveringPoint — JS mode", () => {
  beforeEach(async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await getCoverageBackend(true);
  });

  test("filters online shifts to those whose van covers the point", async () => {
    // shift_1's van covers central London; shift_2's van covers only York.
    const yorkRing = [
      [-1.2, 53.9],
      [-1.0, 53.9],
      [-1.0, 54.0],
      [-1.2, 54.0],
      [-1.2, 53.9],
    ];
    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([fakePolygon()]);
    (prisma.vanShift.findMany as jest.Mock).mockResolvedValue([
      { id: "shift_1", vanId: "van_1", van: { servicePolygons: [fakePolygon()] } },
      {
        id: "shift_2",
        vanId: "van_9",
        van: {
          servicePolygons: [
            fakePolygon({ vanId: "van_9", polygonGeoJson: { type: "Polygon", coordinates: [yorkRing] } }),
          ],
        },
      },
    ]);

    const shifts = await getOnlineShiftsCoveringPoint(INSIDE_POINT);
    expect(shifts.map((s: any) => s.id)).toEqual(["shift_1"]);
  });
});

describe("findCoveringVans — PostGIS mode", () => {
  test("maps raw spatial rows to coverage matches", async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ extname: "postgis" }]) // call 1: probe extension
      .mockResolvedValueOnce([{ cnt: 1n }]) // call 2: probe geometry column
      .mockResolvedValue([
        {
          van_id: "van_1",
          van_name: "Van #1",
          vehicle_model: "Sprinter",
          sector_name: "Central",
          distance_km: 1.234,
        },
      ]); // call 3+: data query
    await getCoverageBackend(true);

    const matches = await findCoveringVans(INSIDE_POINT);

    expect(matches).toEqual([
      {
        vanId: "van_1",
        vanName: "Van #1",
        vehicleModel: "Sprinter",
        sectorName: "Central",
        distanceKm: 1.234,
      },
    ]);
  });

  test("degrades to the JS path when the PostGIS query fails mid-flight", async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ extname: "postgis" }])
      .mockResolvedValue([{ cnt: 1n }])
      .mockRejectedValueOnce(new Error("geometry column dropped"));
    await getCoverageBackend(true);

    (prisma.vanServicePolygon.findMany as jest.Mock).mockResolvedValue([fakePolygon()]);

    const matches = await findCoveringVans(INSIDE_POINT);
    expect(matches.length).toBe(1); // served by the JS fallback
  });
});
