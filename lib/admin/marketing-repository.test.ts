import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const upsert = mock(async (): Promise<{ error: Error | null }> => ({
  error: null,
}));
const from = mock(() => ({ upsert }));

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from },
}));

const { recordMarketingUnsubscribe } = await import("./marketing-repository");

beforeEach(() => {
  from.mockClear();
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
});

describe("marketing unsubscribe repository", () => {
  test.each(["one-click", "link"] as const)(
    "upserts the exact normalized email with controlled %s source",
    async (source) => {
      await recordMarketingUnsubscribe("owner@example.com", source);

      expect(from).toHaveBeenCalledWith("marketing_unsubscribes");
      expect(upsert).toHaveBeenCalledWith(
        { email: "owner@example.com", source },
        { onConflict: "email" },
      );
    },
  );

  test("propagates a bounded write failure without provider details", async () => {
    upsert.mockResolvedValueOnce({ error: new Error("provider detail") });

    await expect(
      recordMarketingUnsubscribe("owner@example.com", "link"),
    ).rejects.toThrow("Marketing unsubscribe write failed");

    upsert.mockRejectedValueOnce(new Error("network provider detail"));
    await expect(
      recordMarketingUnsubscribe("owner@example.com", "one-click"),
    ).rejects.toThrow("Marketing unsubscribe write failed");
  });
});
