import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { getAdminActorFromDependencies } = await import("./actor");

describe("admin actor resolution", () => {
  it("returns null without a server-verified authenticated identity", async () => {
    const getActorById = mock(async () => null);
    const result = await getAdminActorFromDependencies({
      getAuthenticatedUser: async () => null,
      getActorById,
    });

    expect(result).toBeNull();
    expect(getActorById).not.toHaveBeenCalled();
  });

  it("looks up the actor by immutable authenticated user ID", async () => {
    const authenticatedId = "00000000-0000-4000-8000-000000000001";
    const actor = {
      id: authenticatedId,
      role: "security_admin",
      isBlocked: false,
    };
    const getActorById = mock(async (id: string) =>
      id === authenticatedId ? actor : null,
    );

    await expect(
      getAdminActorFromDependencies({
        getAuthenticatedUser: async () => ({ id: authenticatedId }),
        getActorById,
      }),
    ).resolves.toEqual(actor);
    expect(getActorById).toHaveBeenCalledWith(authenticatedId);
  });
});
