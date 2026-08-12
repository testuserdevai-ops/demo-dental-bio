import { beforeEach, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const deliverLifecycleMessages = mock(async () => ({
  considered: 2,
  sent: 1,
  suppressed: 1,
  failed: 0,
}));
mock.module("@/lib/lifecycle/delivery", () => ({ deliverLifecycleMessages }));

const { POST } = await import("./route");

beforeEach(() => {
  deliverLifecycleMessages.mockClear();
  process.env.CRON_SECRET_KEY = "cron-secret";
});

test("rejects missing and incorrect cron credentials", async () => {
  expect(await POST(new Request("https://example.test"))).toMatchObject({
    status: 401,
  });
  expect(
    await POST(
      new Request("https://example.test", {
        headers: { authorization: "Bearer wrong" },
      }),
    ),
  ).toMatchObject({ status: 401 });
  expect(deliverLifecycleMessages).not.toHaveBeenCalled();
});

test("runs the bounded lifecycle worker for an authorized cron call", async () => {
  const response = await POST(
    new Request("https://example.test", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    considered: 2,
    sent: 1,
    suppressed: 1,
    failed: 0,
  });
});
