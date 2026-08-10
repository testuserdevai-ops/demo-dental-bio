import { describe, expect, it } from "bun:test";
import { createLocationSchema, updateLocationSchema } from "./schemas";
const location = {
  businessName: "Main clinic",
  fullAddress: "1 High Street",
  country: "UK",
  city: "London",
  area: "Central",
  latitude: 51.5,
  longitude: -0.1,
};
describe("location schemas", () => {
  it("accepts bounded location fields", () =>
    expect(createLocationSchema.parse(location)).toEqual(location));
  it("rejects invalid coordinates and authority fields", () => {
    expect(
      createLocationSchema.safeParse({ ...location, latitude: 91 }).success,
    ).toBe(false);
    expect(
      createLocationSchema.safeParse({
        ...location,
        dentistryId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("requires an ID and ISO revision for updates", () => {
    expect(
      updateLocationSchema.safeParse({
        ...location,
        id: crypto.randomUUID(),
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
    expect(
      updateLocationSchema.safeParse({
        ...location,
        id: crypto.randomUUID(),
        expectedUpdatedAt: "yesterday",
      }).success,
    ).toBe(false);
  });
});
