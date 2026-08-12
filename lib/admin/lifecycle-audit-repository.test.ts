import { beforeEach, describe, expect, it, mock } from "bun:test";

const rpc = mock(
  async (
    name: string,
  ): Promise<{ data: unknown; error: { message: string } | null }> => {
    if (name === "get_lifecycle_audit") {
      return {
        data: [
          {
            audit_id: 9,
            campaign: "weekly_performance",
            outcome: "sent",
            reason_code: "provider_accepted",
            occurred_at: "2026-08-12T05:00:00.000Z",
          },
        ],
        error: null,
      };
    }
    return {
      data: [
        {
          lifecycle_emails_enabled: true,
          weekly_summary_enabled: true,
          milestone_emails_enabled: false,
          promotional_unsubscribed_at: null,
          permanent_delivery_failure_at: null,
          support_paused_until: null,
          revision: 3,
          updated_at: "2026-08-12T04:00:00.000Z",
        },
      ],
      error: null,
    };
  },
);
const createServerSupabaseClient = mock(async () => ({ rpc }));

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { getAdminLifecycleAudit } = await import("./lifecycle-audit-repository");

const filters = {
  ownerId: "11111111-1111-4111-8111-111111111111",
  invalidOwnerId: false,
  campaign: "all" as const,
  outcome: "all" as const,
  limit: 50 as const,
};

describe("lifecycle audit repository", () => {
  beforeEach(() => {
    rpc.mockClear();
    createServerSupabaseClient.mockClear();
  });

  it("loads the admin-only audit and owner preference RPCs without private table reads", async () => {
    const model = await getAdminLifecycleAudit(filters);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("get_lifecycle_audit", {
      p_target_user_id: filters.ownerId,
      p_limit: 100,
    });
    expect(rpc).toHaveBeenCalledWith("get_lifecycle_preferences", {
      p_target_user_id: filters.ownerId,
    });
    expect(model.preferences.revision).toBe(3);
    expect(model.events[0]?.reasonCode).toBe("provider_accepted");
  });

  it("fails closed when either authoritative source is unavailable", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(getAdminLifecycleAudit(filters)).rejects.toThrow(
      "Unable to load lifecycle operator audit",
    );
  });
});
