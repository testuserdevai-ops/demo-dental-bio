import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { getLinkAggregate } = await import("./queries");

describe("getLinkAggregate", () => {
  it("maps and sorts the scoped group and link aggregate", async () => {
    const order = mock(async () => ({
      data: [
        {
          link_group_id: "00000000-0000-4000-8000-000000000002",
          heading: "Resources",
          rank: 2,
          dentistry_links: [
            {
              link_id: "00000000-0000-4000-8000-000000000003",
              links: {
                link_id: "00000000-0000-4000-8000-000000000003",
                title: "Booking",
                link: "https://example.test/book",
                is_active: false,
                rank: 2,
                image_url: "https://storage.test/card.webp",
                image_variant: "large-image",
                image_alt: null,
                image_decorative: true,
                is_featured: true,
                analytics_campaign_id: "00000000-0000-4000-8000-000000000008",
                analytics_campaigns: {
                  campaign_id: "00000000-0000-4000-8000-000000000008",
                  destination_url:
                    "https://example.test/book?location=hove#book",
                  source: "instagram",
                  medium: "paid_social",
                  campaign: "summer-smiles",
                  content: "profile-card",
                  term: null,
                },
              },
            },
            {
              link_id: "00000000-0000-4000-8000-000000000004",
              links: {
                link_id: "00000000-0000-4000-8000-000000000004",
                title: "Website",
                link: "https://example.test",
                is_active: true,
                rank: 1,
                image_url: null,
                image_variant: "none",
                image_alt: null,
                image_decorative: true,
                is_featured: false,
              },
            },
            { link_id: null, links: null },
          ],
        },
      ],
      error: null,
    }));
    const eq = mock(() => ({ order }));
    const select = mock(() => ({ eq }));
    const from = mock(() => ({ select }));

    const result = await getLinkAggregate(
      {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000011",
        username: "owner",
        canManageSubscription: true,
      },
      { from } as never,
    );

    expect(eq).toHaveBeenCalledWith(
      "dentistry_id",
      "00000000-0000-4000-8000-000000000011",
    );
    expect(result.groups[0]?.links.map(({ title }) => title)).toEqual([
      "Website",
      "Booking",
    ]);
    expect(result.groups[0]?.links[1]).toMatchObject({
      imageVariant: "large-image",
      imageDecorative: true,
      isFeatured: true,
      campaignEnabled: true,
      campaignSource: "instagram",
      campaignMedium: "paid_social",
      campaignName: "summer-smiles",
      campaignContent: "profile-card",
      campaignTerm: "",
      destinationUrl: "https://example.test/book?location=hove#book",
    });
  });
});
