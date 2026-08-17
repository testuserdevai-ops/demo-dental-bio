import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PROFILE_TEMPLATE_CATALOG } from "@/lib/profile-presentation/catalog";

import { createBasicNavigationState } from "./basic-template";
import type { PublicProfileViewModel } from "./public-profile";

function profile(
  overrides: Partial<PublicProfileViewModel> = {},
): PublicProfileViewModel {
  return {
    treatments: [],
    linkGroups: [],
    blogGroups: [],
    products: [],
    videoGroups: [],
    galleries: [],
    generalGalleries: [],
    reviews: [],
    externalReviewPages: [],
    locations: [],
    socials: null,
    ...overrides,
  } as PublicProfileViewModel;
}

const validReview = {
  id: 1,
  reviewer_name: "Owner reviewer",
  content: "Owner-authored review content",
  stars: 5,
  image_url: null,
  platform: "Owner platform",
  created_at: "2026-01-01T00:00:00.000Z",
  enabled: true,
};

describe("Basic profile template compatibility", () => {
  test("keeps the legacy public module order explicit and stable", () => {
    expect(PROFILE_TEMPLATE_CATALOG.basic.moduleOrder).toEqual([
      "header",
      "profile",
      "treatments",
      "services",
      "links",
      "blogs",
      "videos",
      "gallery",
      "reviews",
      "locations-contact",
      "footer",
    ]);
  });

  test("preserves sparse and hidden-item navigation rules", () => {
    expect(
      createBasicNavigationState(
        profile({
          blogGroups: [{ blogs: [] }] as never,
          videoGroups: [{ datas: [] }] as never,
        }),
      ),
    ).toEqual({
      Links: false,
      Blog: false,
      Gallery: false,
      Videos: false,
      Reviews: false,
      Shop: false,
      Location: false,
    });
  });

  test("preserves populated-profile navigation visibility", () => {
    expect(
      createBasicNavigationState(
        profile({
          linkGroups: [{}] as never,
          blogGroups: [{ blogs: [{}] }] as never,
          products: [{}] as never,
          videoGroups: [{ datas: [{}] }] as never,
          generalGalleries: [{}] as never,
          reviews: [validReview] as never,
          locations: [{}] as never,
        }),
      ),
    ).toEqual({
      Links: true,
      Blog: true,
      Gallery: true,
      Videos: true,
      Reviews: true,
      Shop: true,
      Location: true,
    });
  });

  test("keeps review navigation reachable for a valid external-only inventory", () => {
    expect(
      createBasicNavigationState(
        profile({
          reviews: [],
          externalReviewPages: [
            { id: 71, link: "https://reviews.example/profile" },
          ] as never,
        }),
      ).Reviews,
    ).toBe(true);
    expect(
      createBasicNavigationState(
        profile({
          reviews: [],
          externalReviewPages: [
            { id: 72, link: "http://reviews.example/unsafe" },
          ] as never,
        }),
      ).Reviews,
    ).toBe(false);
  });

  test("keeps the renderer child order aligned with the compatibility contract", async () => {
    const source = await readFile(
      join(
        process.cwd(),
        "app/[username]/_components/BasicProfileTemplate.tsx",
      ),
      "utf8",
    );
    const componentNames = [
      "<Header",
      "<ProfileDetail",
      "<ProfileProductSection",
      "<Treatments",
      "<Services",
      "<Links",
      "<BlogGroupList",
      "<ProfileVideoSections",
      "<Gallery",
      "<ProfileReviewsSection",
      "<WorkLocation",
      "<Footer",
    ];
    const positions = componentNames.map((name) => source.indexOf(name));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(source).toContain('data-profile-template="basic"');
    expect(source).toContain("<Header");
    expect(source).toContain("<Footer");
    expect(source).toContain("<ProfileProductSection");
    expect(source).toContain('shopBehavior="navigate"');
    expect(source).toContain("serverProducts={[]}");
  });
});
