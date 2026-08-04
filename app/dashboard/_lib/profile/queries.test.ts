import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const { getProfileViewModel } = await import("./queries");

describe("getProfileViewModel", () => {
  it("maps the resolved user, dentistry, socials, and latest dentistry-folder image", async () => {
    const from = mock((table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === "users"
              ? {
                  data: {
                    title: "Dr",
                    position: "Dentist",
                    gdc_no: "123",
                    qualification: "BDS",
                  },
                  error: null,
                }
              : {
                  data: {
                    dentistry_id: "00000000-0000-4000-8000-000000000811",
                    about_title: "Owner",
                    about_text: "About",
                    phone: "",
                    contact_email: "",
                    website: "",
                    booking_link: "",
                    booking_link_enabled: false,
                    socials: [
                      {
                        linkedin_link:
                          "https://www.linkedin.com/in/profile-owner",
                        twitter_link: "https://x.com/owner",
                      },
                    ],
                  },
                  error: null,
                },
        }),
      }),
    }));
    const list = mock(async () => ({
      data: [
        { name: "old.webp", created_at: "2026-01-01T00:00:00Z" },
        { name: "latest.webp", created_at: "2026-02-01T00:00:00Z" },
      ],
      error: null,
    }));
    const result = await getProfileViewModel(
      {
        effectiveUserId: "00000000-0000-4000-8000-000000000801",
        dentistryId: "00000000-0000-4000-8000-000000000811",
        username: "owner",
        canManageSubscription: true,
      },
      {
        from,
        storage: {
          from: () => ({
            list,
            getPublicUrl: (path: string) => ({
              data: { publicUrl: `https://storage.test/${path}` },
            }),
          }),
        },
      } as never,
    );
    expect(list).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000811");
    expect(result.socials.twitter).toBe("https://x.com/owner");
    expect(result.socials.linkedin).toBe(
      "https://www.linkedin.com/in/profile-owner",
    );
    expect(result.profilePicture.objectPath).toEndWith("/latest.webp");
  });
});
