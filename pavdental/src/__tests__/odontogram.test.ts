import { mockOdontogram } from "../features/records/records-mock-data";

describe("Dental Odontogram Records Integrity", () => {
  test("contains exactly 32 universal teeth", () => {
    expect(mockOdontogram.length).toBe(32);
  });

  test("contains 16 upper and 16 lower teeth", () => {
    const upper = mockOdontogram.filter((t) => t.arch === "upper");
    const lower = mockOdontogram.filter((t) => t.arch === "lower");
    expect(upper.length).toBe(16);
    expect(lower.length).toBe(16);
  });

  test("each tooth has a quadrant assignment", () => {
    for (const tooth of mockOdontogram) {
      expect(["UR", "UL", "LL", "LR"]).toContain(tooth.quadrant);
    }
  });

  test("detects LR7 decaying tooth requiring composite filling", () => {
    const target = mockOdontogram.find((t) => t.number === 31);
    expect(target).toBeDefined();
    expect(target?.condition).toBe("decay");
    expect(target?.quadrant).toBe("LR");
  });
});

