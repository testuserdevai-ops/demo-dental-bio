import { beforeEach, describe, expect, mock, test } from "bun:test";

const verifyUnsubscribeToken = mock((token: string): string | null => {
  if (token === "valid") return "owner@example.com";
  if (token === "html") return 'owner+"><script>@example.com';
  return null;
});
mock.module("@/utils/marketing/unsubscribeToken", () => ({
  verifyUnsubscribeToken,
}));

const recordMarketingUnsubscribe = mock(async () => undefined);
mock.module("@/lib/admin/marketing-repository", () => ({
  recordMarketingUnsubscribe,
}));

const { GET, POST } = await import("./route");

function request(method: "GET" | "POST", token?: string) {
  const url = new URL("https://dental.test/api/marketing/unsubscribe");
  if (token) url.searchParams.set("token", token);
  return method === "POST"
    ? POST(new Request(url, { method }))
    : GET(new Request(url, { method }));
}

beforeEach(() => {
  verifyUnsubscribeToken.mockClear();
  recordMarketingUnsubscribe.mockReset();
  recordMarketingUnsubscribe.mockResolvedValue(undefined);
});

describe("marketing unsubscribe route", () => {
  test("POST records a one-click unsubscribe and returns an empty 200", async () => {
    const response = await request("POST", "valid");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(recordMarketingUnsubscribe).toHaveBeenCalledWith(
      "owner@example.com",
      "one-click",
    );
  });

  test("POST remains an empty 200 for invalid tokens", async () => {
    const response = await request("POST", "invalid");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(recordMarketingUnsubscribe).not.toHaveBeenCalled();
  });

  test("POST propagates a bounded repository failure", async () => {
    recordMarketingUnsubscribe.mockRejectedValueOnce(
      new Error("Marketing unsubscribe write failed", {
        cause: new Error("provider detail"),
      }),
    );

    await expect(request("POST", "valid")).rejects.toThrow(
      "Marketing unsubscribe write failed",
    );
  });

  test("GET renders the existing successful confirmation and escapes the email", async () => {
    const response = await request("GET", "html");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(recordMarketingUnsubscribe).toHaveBeenCalledWith(
      'owner+"><script>@example.com',
      "link",
    );
    expect(html).toContain("Unsubscribed");
    expect(html).toContain("owner+&quot;&gt;&lt;script&gt;@example.com");
    expect(html).not.toContain('owner+"><script>@example.com');
  });

  test("GET renders the existing invalid-link confirmation and status", async () => {
    const response = await request("GET", "invalid");
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain("Something went wrong");
    expect(html).toContain("This unsubscribe link is invalid or has expired.");
    expect(recordMarketingUnsubscribe).not.toHaveBeenCalled();
  });

  test("repeated valid GET clicks use the same idempotent repository operation", async () => {
    expect((await request("GET", "valid")).status).toBe(200);
    expect((await request("GET", "valid")).status).toBe(200);

    expect(recordMarketingUnsubscribe).toHaveBeenCalledTimes(2);
    expect(recordMarketingUnsubscribe).toHaveBeenNthCalledWith(
      1,
      "owner@example.com",
      "link",
    );
    expect(recordMarketingUnsubscribe).toHaveBeenNthCalledWith(
      2,
      "owner@example.com",
      "link",
    );
  });

  test("GET propagates a bounded repository failure", async () => {
    recordMarketingUnsubscribe.mockRejectedValueOnce(
      new Error("Marketing unsubscribe write failed", {
        cause: new Error("provider detail"),
      }),
    );

    await expect(request("GET", "valid")).rejects.toThrow(
      "Marketing unsubscribe write failed",
    );
  });
});
