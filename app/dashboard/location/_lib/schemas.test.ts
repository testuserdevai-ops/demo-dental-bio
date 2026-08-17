import { describe, expect, it } from "bun:test";
import { createLocationSchema, updateLocationSchema } from "./schemas";
const location = {
  id: crypto.randomUUID(),
  businessName: "Main clinic",
  fullAddress: "1 High Street",
  country: "UK",
  city: "London",
  area: "Central",
  latitude: 51.5,
  longitude: -0.1,
  imageUrl: null,
  imageAlt: "",
  imageDecorative: true,
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
        latitude: null,
        longitude: "",
      }).success,
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
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
    expect(
      updateLocationSchema.safeParse({
        ...location,
        expectedUpdatedAt: "yesterday",
      }).success,
    ).toBe(false);
  });
  it("enforces informative and decorative image semantics", () => {
    expect(
      createLocationSchema.safeParse({
        ...location,
        imageUrl: "https://storage.test/location.webp",
        imageAlt: "Front entrance to Main clinic",
        imageDecorative: false,
      }).success,
    ).toBe(true);
    expect(
      createLocationSchema.safeParse({
        ...location,
        imageUrl: "https://storage.test/location.webp",
        imageAlt: "",
        imageDecorative: false,
      }).success,
    ).toBe(false);
    expect(
      createLocationSchema.safeParse({
        ...location,
        imageUrl: "https://storage.test/location.webp",
        imageAlt: "Visible decorative text",
        imageDecorative: true,
      }).success,
    ).toBe(false);
    expect(
      createLocationSchema.safeParse({
        ...location,
        imageUrl: "https://user:secret@storage.test/location.webp",
      }).success,
    ).toBe(false);
  });
});
