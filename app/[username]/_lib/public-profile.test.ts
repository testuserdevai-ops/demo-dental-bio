import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const {
  createPersistentPublicProfileIdentityLoader,
  createPersistentPublicProfileContentLoader,
  createRequestMemoizedLoader,
  isPublicProfileRecord,
  normalizePublicProfileUsername,
  publicProfileContentTags,
  publicProfileUsernameTag,
  resolvePublicProfilePresentation,
  PUBLIC_PROFILE_CACHE_TTL_SECONDS,
  PUBLIC_PROFILE_IDENTITY_CACHE_TTL_SECONDS,
} = await import("./public-profile");

describe("public profile query boundary", () => {
  test("resolves missing and unknown presentation values to Basic", () => {
    expect(resolvePublicProfilePresentation(null, null)).toMatchObject({
      configuration: {
        templateId: "basic",
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
      },
      revision: 0,
      resolutionReason: "missing",
    });
    expect(
      resolvePublicProfilePresentation(
        {
          schemaVersion: 1,
          templateId: "retired-template",
          themeId: "clinical-light",
          layoutVariant: "classic-stack",
          answers: {},
        },
        -2,
      ),
    ).toMatchObject({
      configuration: { templateId: "basic" },
      revision: 0,
      resolutionReason: "malformed",
    });
  });

  test("preserves a valid projected selection and revision", () => {
    expect(
      resolvePublicProfilePresentation(
        {
          schemaVersion: 1,
          templateId: "direct-booking",
          themeId: "clinical-light",
          layoutVariant: "classic-stack",
          answers: {},
        },
        4,
      ),
    ).toMatchObject({
      configuration: { templateId: "direct-booking" },
      revision: 4,
      resolutionReason: "valid",
    });
  });

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

  test("rejects impossible scanner paths before loading but preserves valid-looking misses", () => {
    // Representative values come from outputs/scanner-log-analysis-20260810.
    expect(normalizePublicProfileUsername("../../.env")).toBeNull();
    expect(
      normalizePublicProfileUsername("z9x8c7v6b5-debug-trigger-therapists.bio"),
    ).toBeNull();
    expect(normalizePublicProfileUsername(" WTL-AUTO-7XE4H7AP ")).toBe(
      "wtl-auto-7xe4h7ap",
    );
    expect(normalizePublicProfileUsername("anilmaini")).toBe("anilmaini");
  });

  test("persistently caches successful identity lookups and misses by normalized username", async () => {
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
    const load = createPersistentPublicProfileIdentityLoader(
      async (username) => {
        calls += 1;
        return username === "missing" ? null : ({ username } as never);
      },
      persistentCache,
    );

    await load("Ada");
    await load("ada");
    await load("missing");
    await load("missing");
    await load("../../.env");

    expect(calls).toBe(2);
    expect(options).toEqual([
      {
        revalidate: PUBLIC_PROFILE_IDENTITY_CACHE_TTL_SECONDS,
        tags: [publicProfileUsernameTag("ada")],
      },
      {
        revalidate: PUBLIC_PROFILE_IDENTITY_CACHE_TTL_SECONDS,
        tags: [publicProfileUsernameTag("missing")],
      },
    ]);
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
