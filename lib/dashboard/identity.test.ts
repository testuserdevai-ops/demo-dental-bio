import { describe, expect, mock, test } from "bun:test";

import type { DashboardIdentityDependencies } from "./identity";

mock.module("server-only", () => ({}));

const { resolveDashboardIdentity } = await import("./identity");

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const dentistryId = "33333333-3333-4333-8333-333333333333";

type UserRecord = {
  id: string;
  username: string;
  role: string | null;
  subscriptionStatus: string | null;
  isVerified: boolean | null;
  useDentalBrand: boolean | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  createdAt: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
};

function user(id: string, overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id,
    username: id === actorId ? "owner" : "target",
    role: "user",
    subscriptionStatus: "FREE",
    isVerified: false,
    useDentalBrand: false,
    title: null,
    firstName: null,
    lastName: null,
    position: null,
    createdAt: null,
    trialEnd: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

function dependencies({
  authenticatedUser = { id: actorId },
  users = new Map([
    [actorId, user(actorId)],
    [targetId, user(targetId)],
  ]),
  dentistry = { dentistryId },
}: {
  authenticatedUser?: { id: string } | null;
  users?: Map<string, UserRecord>;
  dentistry?: { dentistryId: string } | null;
} = {}): DashboardIdentityDependencies {
  return {
    getAuthenticatedUser: mock(async () => authenticatedUser),
    getUserById: mock(async (id: string) => users.get(id) ?? null),
    getDentistryByUserId: mock(async () => dentistry),
  };
}

describe("resolveDashboardIdentity", () => {
  test("rejects missing or invalid authenticated actors", async () => {
    for (const authenticatedUser of [null, { id: "not-a-uuid" }]) {
      await expect(
        resolveDashboardIdentity(null, dependencies({ authenticatedUser })),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  test("looks up the actor row with the immutable authenticated ID", async () => {
    const deps = dependencies();

    await resolveDashboardIdentity(null, deps);

    expect(deps.getUserById).toHaveBeenCalledWith(actorId);
  });

  test("resolves an ordinary actor's own scope", async () => {
    const deps = dependencies();
    await expect(resolveDashboardIdentity(null, deps)).resolves.toEqual({
      scope: {
        effectiveUserId: actorId,
        dentistryId,
        username: "owner",
        canManageSubscription: true,
      },
      shell: {
        subscriptionStatus: "FREE",
        isVerified: false,
        useDentalBrand: false,
        position: null,
        createdAt: null,
        trialEnd: null,
        currentPeriodEnd: null,
      },
      profileIdentity: {
        title: null,
        firstName: null,
        lastName: null,
        position: null,
      },
    });
    expect(deps.getUserById).toHaveBeenCalledTimes(1);
  });

  test("rejects a malformed target before a target lookup", async () => {
    const deps = dependencies();

    await expect(
      resolveDashboardIdentity("not-a-uuid", deps),
    ).rejects.toMatchObject({ code: "INVALID_TARGET" });
    expect(deps.getUserById).toHaveBeenCalledTimes(1);
  });

  test("rejects an explicitly supplied empty target before a target lookup", async () => {
    const deps = dependencies();

    await expect(resolveDashboardIdentity("", deps)).rejects.toMatchObject({
      code: "INVALID_TARGET",
    });
    expect(deps.getUserById).toHaveBeenCalledTimes(1);
  });

  test("forbids an ordinary actor from selecting another user", async () => {
    await expect(
      resolveDashboardIdentity(targetId, dependencies()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("resolves an existing target for a database-authorized admin", async () => {
    const deps = dependencies({
      users: new Map([
        [actorId, user(actorId, { role: "admin" })],
        [targetId, user(targetId, { username: "managed" })],
      ]),
    });

    await expect(
      resolveDashboardIdentity(targetId, deps),
    ).resolves.toMatchObject({
      scope: {
        effectiveUserId: targetId,
        dentistryId,
        username: "managed",
        canManageSubscription: false,
      },
    });
    expect(deps.getUserById).toHaveBeenCalledTimes(2);
  });

  test("does not grant owner subscription capability from an admin target hint", async () => {
    const result = await resolveDashboardIdentity(
      targetId,
      dependencies({
        users: new Map([
          [actorId, user(actorId, { role: "admin" })],
          [targetId, user(targetId, { role: "admin" })],
        ]),
      }),
    );

    expect(result.scope.canManageSubscription).toBe(false);
  });

  test("rejects a missing admin target instead of falling back to the actor", async () => {
    await expect(
      resolveDashboardIdentity(
        targetId,
        dependencies({
          users: new Map([[actorId, user(actorId, { role: "admin" })]]),
        }),
      ),
    ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND" });
  });

  test("rejects an effective user without a dentistry", async () => {
    await expect(
      resolveDashboardIdentity(null, dependencies({ dentistry: null })),
    ).rejects.toMatchObject({ code: "DENTISTRY_NOT_FOUND" });
  });

  test("returns only the serializable scope and presentation shell", async () => {
    const result = await resolveDashboardIdentity(
      null,
      dependencies({
        users: new Map([
          [
            actorId,
            user(actorId, {
              role: "admin",
              subscriptionStatus: "PRO",
              isVerified: true,
              useDentalBrand: true,
              title: "Dr",
              firstName: "Alex",
              lastName: "Morgan",
              position: "Cosmetic dentist",
            }),
          ],
        ]),
      }),
    );

    expect(Object.keys(result.scope).sort()).toEqual([
      "canManageSubscription",
      "dentistryId",
      "effectiveUserId",
      "username",
    ]);
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("session");
    expect(result).not.toHaveProperty("isAdmin");
    expect(result.scope).not.toHaveProperty("isAdmin");
    expect(result.profileIdentity).toEqual({
      title: "Dr",
      firstName: "Alex",
      lastName: "Morgan",
      position: "Cosmetic dentist",
    });
  });
});
