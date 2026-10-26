// Run with `npm test`. Node strips the types from pav-dentists.ts when it is imported.

import { moveId, profilePayload, sortForWebsite, toForm } from "./pav-dentists.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const dentist = {
  id: "a",
  fullName: "Dr Synthetic One",
  roleTitle: "Dentist",
  gdcNumber: "999991",
  specialisms: ["Implants", "Oral surgery"],
  bio: "Synthetic bio.",
  photoUrl: null,
  showOnWebsite: true,
  websiteOrder: 0,
};

describe("profilePayload", () => {
  it("trims, splits specialisms and turns blanks into null", () => {
    const result = profilePayload({ ...toForm(dentist), specialisms: " Implants, , Oral surgery ", photoUrl: " " });
    assert.equal(result.ok, true);
    assert.deepEqual(result.payload.specialisms, ["Implants", "Oral surgery"]);
    assert.equal(result.payload.photoUrl, null);
  });

  it("refuses a bad GDC number or an insecure photo link", () => {
    assert.equal(profilePayload({ ...toForm(dentist), gdcNumber: "12345" }).ok, false);
    assert.equal(profilePayload({ ...toForm(dentist), photoUrl: "http://images.example.test/a.jpg" }).ok, false);
  });

  it("needs a bio before someone goes on the website", () => {
    assert.equal(profilePayload({ ...toForm(dentist), bio: "" }).ok, false);
    assert.equal(profilePayload({ ...toForm(dentist), bio: "", showOnWebsite: false }).ok, true);
  });
});

describe("ordering", () => {
  it("puts shown dentists first, in their order", () => {
    const list = [
      { ...dentist, id: "hidden", fullName: "Dr A", showOnWebsite: false },
      { ...dentist, id: "second", websiteOrder: 2 },
      { ...dentist, id: "first", websiteOrder: 1 },
    ];
    assert.deepEqual(
      sortForWebsite(list).map((d) => d.id),
      ["first", "second", "hidden"],
    );
  });

  it("moves one place and stops at the ends", () => {
    assert.deepEqual(moveId(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
    assert.deepEqual(moveId(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
    assert.equal(moveId(["a", "b"], 0, -1), null);
    assert.equal(moveId(["a", "b"], 1, 1), null);
  });
});
