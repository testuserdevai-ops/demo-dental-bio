import { describe, expect, it } from "bun:test";
import { dashboardSettingsSchema } from "./schemas";

const valid = {
  title: "Dr",
  username: "existing-owner",
  first_name: "Dental",
  middle_name: "",
  last_name: "Owner",
  birthday: "2000-02-29",
};

describe("dashboardSettingsSchema", () => {
  it("accepts a real leap day", () => {
    expect(dashboardSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["2026-02-29", "2026-02-31", "2026-13-01"])(
    "rejects impossible calendar date %s",
    (birthday) => {
      expect(
        dashboardSettingsSchema.safeParse({ ...valid, birthday }).success,
      ).toBe(false);
    },
  );
});
