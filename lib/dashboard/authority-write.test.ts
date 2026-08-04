import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let singleResult: {
  data: { id: string } | null;
  error: { message: string } | null;
};
const update = mock(() => ({
  eq: mock(() => ({
    select: mock(() => ({
      single: async () => singleResult,
    })),
  })),
}));
const from = mock(() => ({ update }));

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from },
}));

const authorityWriteModule = "./authority-write.ts?authority-write-test";
const { saveVeriffSession, setUserVerification, updateSubscriptionAuthority } =
  await import(authorityWriteModule);

describe("dashboard authority writes", () => {
  beforeEach(() => {
    from.mockClear();
    update.mockClear();
    singleResult = { data: { id: "user-1" }, error: null };
  });

  it("writes only the Veriff session authority fields through the server client", async () => {
    await saveVeriffSession("user-1", {
      sessionId: "veriff-session-1",
      sessionUrl: "https://example.test/session",
      createdAt: "2026-08-04T00:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({
      session_id: "veriff-session-1",
      veriff_session_url: "https://example.test/session",
      session_created_at: "2026-08-04T00:00:00.000Z",
    });
  });

  it("writes an explicit verification decision for one user", async () => {
    await setUserVerification("user-1", true);

    expect(update).toHaveBeenCalledWith({ isVerified: true });
  });

  it("writes only the supplied subscription authority fields", async () => {
    await updateSubscriptionAuthority("user-1", {
      subscription_id: null,
      plan_id: null,
      subscription_status: "FREE",
      current_period_end: null,
      trial_end: null,
    });

    expect(update).toHaveBeenCalledWith({
      subscription_id: null,
      plan_id: null,
      subscription_status: "FREE",
      current_period_end: null,
      trial_end: null,
    });
  });

  it("rejects a missing user instead of treating a zero-row write as success", async () => {
    singleResult = { data: null, error: null };

    await expect(setUserVerification("missing-user", true)).rejects.toThrow(
      "user was not found",
    );
  });
});
