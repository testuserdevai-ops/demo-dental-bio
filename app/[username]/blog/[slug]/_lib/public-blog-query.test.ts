import { describe, expect, mock, test } from "bun:test";

import type { PublicBlogQueryDependencies } from "./public-blog-query";

mock.module("server-only", () => ({}));

const { getPublicBlogPageFromDependencies } =
  await import("./public-blog-query");

const profile = {
  id: "profile-1",
  username: "dr-sam",
  title: "Dr",
  firstName: "Sam",
  lastName: "Taylor",
  isVerified: true,
  useDentalBrand: false,
  registeredDomain: null,
};

const blog = {
  id: 12,
  groupId: 3,
  title: "Dental care",
  content: "<p>Content</p>",
  slug: "dental-care",
  imageUrl: null,
  metaTitle: "Dental care",
  metaDescription: "Useful advice",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function dependencies(
  overrides: Partial<PublicBlogQueryDependencies> = {},
): PublicBlogQueryDependencies {
  return {
    getProfileByUsername: mock(async () => profile),
    getEnabledGroupIds: mock(async () => [3]),
    getEnabledBlog: mock(async () => blog),
    getDentistry: mock(async () => ({
      dentistryId: "dentistry-1",
      aboutTitle: "Taylor Dental",
      aboutText: null,
      phone: null,
      bookingLink: null,
      contactEmail: "hello@example.com",
      locationTitle: null,
    })),
    getProfilePictureUrl: mock(async () => "/placeholder.webp"),
    ...overrides,
  };
}

describe("getPublicBlogPageFromDependencies", () => {
  test("scopes a blog to the username's profile and enabled group", async () => {
    const deps = dependencies();

    const result = await getPublicBlogPageFromDependencies(
      { username: "dr-sam", slug: "dental-care" },
      deps,
    );

    expect(result).toMatchObject({ profile, blog });
    expect(deps.getProfileByUsername).toHaveBeenCalledWith("dr-sam");
    expect(deps.getEnabledGroupIds).toHaveBeenCalledWith("profile-1");
    expect(deps.getEnabledBlog).toHaveBeenCalledWith("dental-care", [3]);
  });

  test("hides a blog when the requested username does not resolve", async () => {
    const deps = dependencies({ getProfileByUsername: mock(async () => null) });

    await expect(
      getPublicBlogPageFromDependencies(
        { username: "other-profile", slug: "dental-care" },
        deps,
      ),
    ).resolves.toBeNull();
    expect(deps.getEnabledGroupIds).not.toHaveBeenCalled();
  });

  test("hides private, disabled, deleted, or mismatched blogs", async () => {
    for (const overrides of [
      { getEnabledGroupIds: mock(async () => []) },
      { getEnabledBlog: mock(async () => null) },
    ]) {
      await expect(
        getPublicBlogPageFromDependencies(
          { username: "dr-sam", slug: "dental-care" },
          dependencies(overrides),
        ),
      ).resolves.toBeNull();
    }
  });

  test("keeps the render model free of counter side effects", async () => {
    const deps = dependencies();

    await getPublicBlogPageFromDependencies(
      { username: "dr-sam", slug: "dental-care" },
      deps,
    );

    expect(Object.keys(deps)).not.toContain("incrementCounter");
  });
});
