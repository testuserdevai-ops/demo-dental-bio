import { beforeEach, expect, mock, test } from "bun:test";

const updateTag = mock((_tag: string) => undefined);

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({ updateTag }));

const { invalidatePublicProfileCache } = await import("./cache-invalidation");

beforeEach(() => updateTag.mockClear());

test("immediately expires every exact tag after an authorized mutation", () => {
  invalidatePublicProfileCache({
    profileId: "profile-1",
    feature: "blogs",
    entities: [
      { kind: "blog-group", id: "group-1" },
      { kind: "blog", id: "blog-1" },
    ],
  });

  expect(updateTag.mock.calls.map(([tag]) => tag)).toEqual([
    "public-profile:profile-1",
    "blogs:profile-1",
    "blog-group:group-1",
    "blog:blog-1",
  ]);
});
