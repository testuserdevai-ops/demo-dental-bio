import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  publicActionSchema,
  type TrackableAction,
} from "@/lib/analytics/contract";

const track = mock((_descriptor: TrackableAction) => false);

mock.module("@/app/contexts/AnalyticsContext", () => ({
  useLegacyCounterAllowed: () => false,
  useTrackedAction: () => track,
}));

const { default: ProfileLinksSection } = await import("./ProfileLinksSection");

function savedLink(id: string, rank: number) {
  return {
    links: {
      link_id: id,
      title: `Owner link ${id}`,
      link: `https://example.test/${id}`,
      is_active: true,
      rank,
      image_url: null,
      image_variant: "none",
      image_alt: null,
      image_decorative: true,
      is_featured: false,
    },
  };
}

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("ProfileLinksSection", () => {
  test("renders every owner link as a native tracked anchor with stable global positions", () => {
    const groupId = "11111111-1111-4111-8111-111111111111";
    const linkIds = Array.from(
      { length: 5 },
      (_, index) => `22222222-2222-4222-8222-22222222222${index + 1}`,
    );
    const { container } = render(
      <ProfileLinksSection
        linkGroups={[
          {
            link_group_id: groupId,
            heading: "Owner resources",
            rank: 1,
            dentistry_links: linkIds.map((id, index) =>
              savedLink(id, index + 1),
            ),
          },
        ]}
        moduleId="direct-booking"
        variant="grid"
      />,
    );
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("[data-link-id] a"),
    );

    expect(
      container.querySelector('[data-profile-module="direct-booking-links"]'),
    ).toBeTruthy();
    expect(screen.getByText("Owner resources")).toBeTruthy();
    expect(links).toHaveLength(5);
    expect(
      links.map((link) => [
        link.parentElement?.dataset.linkId,
        link.parentElement?.dataset.linkPosition,
        link.getAttribute("href"),
        link.getAttribute("target"),
        link.getAttribute("rel"),
      ]),
    ).toEqual(
      Array.from({ length: 5 }, (_, index) => [
        linkIds[index],
        String(index + 1),
        `https://example.test/${linkIds[index]}`,
        "_blank",
        "noopener noreferrer",
      ]),
    );

    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    expect(fireEvent.click(links[4]!, { metaKey: true })).toBe(false);
    expect(track).toHaveBeenCalledWith({
      section: "links",
      position: 5,
      action: {
        type: "link_click",
        linkId: linkIds[4]!,
        groupId,
      },
    });
    expect(
      publicActionSchema.safeParse(track.mock.calls[0]?.[0].action).success,
    ).toBe(true);
  });

  test("omits empty and unsafe inventories without fallback copy", () => {
    const { container } = render(
      <ProfileLinksSection
        linkGroups={[
          {
            link_group_id: "unsafe",
            heading: "Owner heading",
            rank: 1,
            dentistry_links: [
              savedLink("disabled", 1),
              savedLink("unsafe", 2),
            ].map((entry, index) => ({
              links: {
                ...entry.links,
                ...(index === 0
                  ? { is_active: false }
                  : { link: "javascript:alert(1)" }),
              },
            })),
          },
        ]}
        moduleId="trust-first-family-practice"
      />,
    );

    expect(container.childElementCount).toBe(0);
    expect(screen.queryByText("Links", { exact: true })).toBeNull();
  });
});
