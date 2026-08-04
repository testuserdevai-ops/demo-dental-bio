import { describe, expect, it } from "bun:test";
import { profileInputSchema, socialLinksInputSchema } from "./schemas";

const profile = {
  title: "Dr",
  position: "Dentist",
  gdcNo: "123",
  qualification: "BDS",
  aboutTitle: "Dr Example",
  aboutText: "About",
  phone: "+44 20 1234",
  contactEmail: "owner@example.test",
  website: "https://example.test",
  bookingLink: "https://example.test/book",
  bookingEnabled: true,
};

describe("profile schemas", () => {
  it("accepts only controlled profile presentation fields", () => {
    expect(profileInputSchema.parse(profile)).toEqual(profile);
    expect(
      profileInputSchema.safeParse({ ...profile, userId: crypto.randomUUID() })
        .success,
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ ...profile, website: "javascript:x" })
        .success,
    ).toBe(false);
  });

  it("normalizes supported social handles and rejects unsafe other links", () => {
    const parsed = socialLinksInputSchema.parse({
      twitter: "@DentalBio",
      instagram: "",
      facebook: "",
      tiktok: "",
      other: "https://example.test/social",
    });
    expect(parsed.twitter).toBe("https://x.com/DentalBio");
    expect(
      socialLinksInputSchema.safeParse({ ...parsed, other: "data:text/html,x" })
        .success,
    ).toBe(false);
  });
});
