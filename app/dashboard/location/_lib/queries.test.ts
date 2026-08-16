import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { getLocationAggregate } = await import("./queries");

describe("location aggregate query", () => {
  it("maps every authoritative location image field without capping rows", async () => {
    const locations = [1, 2, 3, 4].map((position) => ({
      locations: {
        location_id: `00000000-0000-4000-8000-00000000010${position}`,
        business_name: `Clinic ${position}`,
        full_address: `${position} High Street`,
        country: "UK",
        city: "London",
        area: "Central",
        latitude: 51.5,
        longitude: -0.1,
        image_url:
          position === 2 ? null : `https://storage.test/${position}.webp`,
        image_alt: position === 1 ? "Clinic entrance" : null,
        image_decorative: position !== 1,
        updated_at: `2026-08-17T00:0${position}:00.000Z`,
      },
    }));
    const from = mock((table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === "dentistries"
              ? {
                  data: {
                    location_title: "Our clinics",
                    dentistry_locations: locations,
                  },
                  error: null,
                }
              : {
                  data: { subscription_status: "PRO", trial_end: null },
                  error: null,
                },
        }),
      }),
    }));

    const result = await getLocationAggregate(
      {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
        canManageSubscription: true,
      },
      { from } as never,
    );

    expect(result.title).toBe("Our clinics");
    expect(result.locations).toHaveLength(4);
    expect(result.locations[0]).toEqual(
      expect.objectContaining({
        imageUrl: "https://storage.test/1.webp",
        imageAlt: "Clinic entrance",
        imageDecorative: false,
      }),
    );
    expect(result.locations[1]).toEqual(
      expect.objectContaining({
        imageUrl: null,
        imageAlt: "",
        imageDecorative: true,
      }),
    );
    expect(from).toHaveBeenCalledWith("dentistries");
    expect(from).toHaveBeenCalledWith("users");
  });
});
