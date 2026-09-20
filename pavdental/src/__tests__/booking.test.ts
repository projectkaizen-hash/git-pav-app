import { formatGbp, mockServices, mockClinics, mockClinicians } from "../__mocks__/booking-mock-data";

describe("Booking Domain & Currency Formatting", () => {
  test("formats pence to GBP correctly", () => {
    expect(formatGbp(6500)).toBe("£65.00");
    expect(formatGbp(2000)).toBe("£20.00");
    expect(formatGbp(49500)).toBe("£495.00");
    expect(formatGbp(0)).toBe("£0.00");
  });

  test("service catalogue contains checkup, hygiene, emergency and cosmetic", () => {
    const categories = mockServices.map((s) => s.category);
    expect(categories).toContain("checkup");
    expect(categories).toContain("hygiene");
    expect(categories).toContain("emergency");
    expect(categories).toContain("cosmetic");
  });

  test("clinic locations have valid UK postcodes", () => {
    for (const clinic of mockClinics) {
      expect(clinic.postcode).toBeDefined();
      expect(clinic.postcode.length).toBeGreaterThan(4);
    }
  });

  test("clinicians have registered GDC numbers", () => {
    for (const doc of mockClinicians) {
      expect(doc.gdcNumber).toBeDefined();
      expect(doc.gdcNumber.length).toBe(6);
    }
  });
});

