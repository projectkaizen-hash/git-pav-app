import type { DependantItem, DependantRelationship, NewDependant } from "./account-api";

export interface DependantForm {
  firstName: string;
  lastName: string;
  dob: string;
  relationship: DependantRelationship | "Other";
}

/**
 * The fields a guardian actually changed, ready for PATCH. A legacy "Other"
 * relationship can't be picked, so it's never sent back.
 */
export function changedDependantFields(original: DependantItem, form: DependantForm): Partial<NewDependant> {
  const updates: Partial<NewDependant> = {};
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const dob = form.dob.trim();
  if (firstName !== original.firstName) updates.firstName = firstName;
  if (lastName !== original.lastName) updates.lastName = lastName;
  if (dob !== String(original.dob).slice(0, 10)) updates.dob = dob;
  if (form.relationship !== original.relationship && form.relationship !== "Other") {
    updates.relationship = form.relationship;
  }
  return updates;
}
