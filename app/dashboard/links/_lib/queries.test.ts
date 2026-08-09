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
  });
});
