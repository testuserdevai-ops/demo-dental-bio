import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const invalidatePublicProfileCache = mock(() => {});
const invalidatePublicProfileIdentityCache = mock(() => {});
const currentSingle = mock(async () => ({
  data: { username: "grandfathered-owner-username" },
  error: null,
}));
const conflictSingle = mock(async () => ({ data: null, error: null }));
const updateEq = mock(async () => ({ error: null }));
const update = mock(() => ({ eq: updateEq }));
const select = mock((projection: string) => {
  if (projection === "username")
    return { eq: () => ({ single: currentSingle }) };
  if (projection === "id")
    return { eq: () => ({ neq: () => ({ maybeSingle: conflictSingle }) }) };
  throw new Error(`Unexpected projection: ${projection}`);
});
const from = mock(() => ({ select, update }));

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
}));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from }),
}));

const { saveDashboardSettings } = await import("./actions");
const input = {
  title: "Dr",
  username: "grandfathered-owner-username",
  first_name: "Dental",
  middle_name: "",
  last_name: "Owner",
  birthday: "2000-02-29",
};

describe("saveDashboardSettings", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({ scope });
    currentSingle.mockReset();
    currentSingle.mockResolvedValue({
      data: { username: input.username },
      error: null,
    });
    conflictSingle.mockReset();
    conflictSingle.mockResolvedValue({ data: null, error: null });
    updateEq.mockReset();
    updateEq.mockResolvedValue({ error: null });
    update.mockClear();
    from.mockClear();
    select.mockClear();
    invalidatePublicProfileCache.mockClear();
    invalidatePublicProfileIdentityCache.mockClear();
  });

  it("preserves a grandfathered username and writes only profile fields", async () => {
    const result = await saveDashboardSettings(undefined, input);
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      title: "Dr",
      username: input.username,
      first_name: "Dental",
      middle_name: "",
      last_name: "Owner",
      birthday: "2000-02-29",
    });
    expect(updateEq).toHaveBeenCalledWith("id", scope.effectiveUserId);
    expect(invalidatePublicProfileCache).toHaveBeenCalledWith({
      profileId: scope.effectiveUserId,
      feature: "profile",
    });
    expect(invalidatePublicProfileIdentityCache).toHaveBeenCalledWith([
      input.username,
      input.username,
    ]);
  });

  it("applies the current registration limit when the username changes", async () => {
    const result = await saveDashboardSettings(undefined, {
      ...input,
      username: "a-new-username-that-is-too-long",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors?.username?.[0]).toContain("20 characters");
    expect(update).not.toHaveBeenCalled();
  });

  it("fails closed before data access when dashboard authorization fails", async () => {
    resolveDashboardIdentity.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const result = await saveDashboardSettings("forged", input);
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});
