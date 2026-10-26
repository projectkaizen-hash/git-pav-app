import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PHOTO_PENDING, toDoctor } from "./team-data.ts";

describe("toDoctor", () => {
  const row = {
    id: "a",
    fullName: " Dr Synthetic Van Example ",
    gdcNumber: "999991",
    roleTitle: "Visiting implantologist",
    specialisms: ["Dental implants"],
    bio: "Synthetic bio.",
    photoUrl: null,
  };

  it("splits the name after the title and keeps the rest as the surname", () => {
    const d = toDoctor(row);
    assert.equal(d.name, "Dr Synthetic Van Example");
    assert.equal(d.firstName, "Synthetic");
    assert.equal(d.lastName, "Van Example");
    assert.deepEqual(d.tags, ["DENTAL IMPLANTS"]);
  });

  it("shows the pending photo and a plain role when they're missing", () => {
    const d = toDoctor({ ...row, roleTitle: null, photoUrl: null, bio: null });
    assert.equal(d.photo, PHOTO_PENDING);
    assert.equal(d.role, "Dentist");
    assert.equal(d.bio, "");
  });
});
