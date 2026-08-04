import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const {
  createPersistentPublicProfileContentLoader,
  createRequestMemoizedLoader,
  isPublicProfileRecord,
  publicProfileContentTags,
  PUBLIC_PROFILE_CACHE_TTL_SECONDS,
} = await import("./public-profile");

describe("public profile query boundary", () => {
  test("only accepts a dentistry record owned by the resolved username", () => {
    expect(
      isPublicProfileRecord(
        { id: "profile-1", username: "ada" },
        { dentistry_id: "dentistry-1", user_id: "profile-1" },
      ),
    ).toBe(true);

    expect(
      isPublicProfileRecord(
        { id: "profile-1", username: "ada" },
        { dentistry_id: "dentistry-1", user_id: "another-profile" },
      ),
    ).toBe(false);
    expect(isPublicProfileRecord(null, null)).toBe(false);
  });

  test("deduplicates a username lookup within one request loader", async () => {
    let calls = 0;
    const load = createRequestMemoizedLoader(async (username) => {
      calls += 1;
      return { username };
    });

    const [first, second] = await Promise.all([load("ada"), load("ada")]);

    expect(first).toEqual({ username: "ada" });
    expect(second).toEqual({ username: "ada" });
    expect(calls).toBe(1);
  });

  test("persists only auth-neutral content by immutable IDs and exact tags", async () => {
    const values = new Map<string, unknown>();
    const options: Array<{ revalidate: number; tags: string[] }> = [];
    const persistentCache = <T>(
      loader: () => Promise<T>,
      keyParts: string[],
      cacheOptions: { revalidate: number; tags: string[] },
    ) => {
      options.push(cacheOptions);
      return async () => {
        const key = keyParts.join(":");
        if (!values.has(key)) values.set(key, await loader());
        return values.get(key) as T;
      };
    };
    let calls = 0;
    const load = createPersistentPublicProfileContentLoader(
      async (profileId, dentistryId) => {
        calls += 1;
        return { profileId, dentistryId } as never;
      },
      persistentCache,
    );

    await load("profile-1", "dentistry-1");
    await load("profile-1", "dentistry-1");
    await load("profile-2", "dentistry-2");

    expect(calls).toBe(2);
    expect(options[0]).toEqual({
      revalidate: PUBLIC_PROFILE_CACHE_TTL_SECONDS,
      tags: publicProfileContentTags("profile-1"),
    });
    expect(options[0]?.tags).not.toContain("ada");
  });
});
