import { beforeEach, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const revalidateTag = mock(
  (_tag: string, _profile: { expire: number }) => undefined,
);
mock.module("next/cache", () => ({ revalidateTag }));

const { revalidatePublicProfileIdentityCache } =
  await import("./cache-revalidation");

beforeEach(() => revalidateTag.mockClear());

test("immediately expires unique normalized identity tags in route handlers", () => {
  revalidatePublicProfileIdentityCache([
    "Profile-Owner",
    " profile-owner ",
    null,
    undefined,
  ]);

  expect(revalidateTag).toHaveBeenCalledTimes(1);
  expect(revalidateTag).toHaveBeenCalledWith(
    "public-profile-username:profile-owner",
    { expire: 0 },
  );
});
