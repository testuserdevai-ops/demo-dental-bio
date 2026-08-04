import { describe, expect, test } from "bun:test";
import { brandFaviconByDomain, getBrandFavicon } from "./brandIcons";

describe("brand favicons", () => {
  test("maps every supported brand to its own favicon", () => {
    expect(Object.keys(brandFaviconByDomain)).toEqual([
      "coach.bio",
      "dental.bio",
      "doctors.bio",
      "injector.bio",
      "pharmacists.bio",
      "podcasts.bio",
      "specialist.bio",
      "therapists.bio",
    ]);
    expect(getBrandFavicon("www.coach.bio")).toBe("/favicons/coachbio.svg");
    expect(getBrandFavicon("therapists.bio")).toBe(
      "/favicons/therapistsbio.svg",
    );
    expect(getBrandFavicon("unknown.example")).toBe("/favicons/dentalbio.svg");
  });
});
