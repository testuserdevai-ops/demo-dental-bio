import { describe, expect, test } from "bun:test";

import {
  publicProfileMutationTags,
  publicProfileUsernameTag,
} from "./cache-tags";

const profileId = "00000000-0000-4000-8000-000000000001";

describe("public profile cache tags", () => {
  test("normalizes username identity tags", () => {
    expect(publicProfileUsernameTag(" Dr.Jane_Doe ")).toBe(
      "public-profile-username:dr.jane_doe",
    );
  });

  test("always includes the aggregate and exact feature tag", () => {
    expect(
      publicProfileMutationTags({ profileId, feature: "treatments" }),
    ).toEqual([`public-profile:${profileId}`, `treatments:${profileId}`]);
  });

  test("adds controlled entity tags without duplicates", () => {
    expect(
      publicProfileMutationTags({
        profileId,
        feature: "links",
        entities: [
          { kind: "link-group", id: "group-1" },
          { kind: "link", id: "link-1" },
          { kind: "link", id: "link-1" },
        ],
      }),
    ).toEqual([
      `public-profile:${profileId}`,
      `links:${profileId}`,
      "link-group:group-1",
      "link:link-1",
    ]);
  });

  test("keeps profile and external review page tags exact", () => {
    expect(
      publicProfileMutationTags({ profileId, feature: "profile" }),
    ).toEqual([`public-profile:${profileId}`, `profile:${profileId}`]);
    expect(
      publicProfileMutationTags({
        profileId,
        feature: "external-review-page",
      }),
    ).toEqual([
      `public-profile:${profileId}`,
      `external-review-page:${profileId}`,
    ]);
  });
});
