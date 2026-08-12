import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const submitPublicProfileReport = mock(async () => ({
  id: "abcdef12-0000-4000-8000-000000000001",
  created: true,
}));

class PublicReportError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

mock.module("@/lib/reporting/public-repository", () => ({
  PublicReportError,
  submitPublicProfileReport,
}));

const { POST } = await import("./route");
const profileId = "00000000-0000-4000-8000-000000000001";

function request(body: unknown) {
  return new Request("https://dental.bio/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  submitPublicProfileReport.mockReset();
  submitPublicProfileReport.mockResolvedValue({
    id: "abcdef12-0000-4000-8000-000000000001",
    created: true,
  });
});

describe("POST /api/reports", () => {
  test("rejects malformed input before persistence", async () => {
    const response = await POST(request({ profileId, category: "invented" }));
    expect(response.status).toBe(400);
    expect(submitPublicProfileReport).not.toHaveBeenCalled();
  });

  test("returns a safe reference for a new or duplicate report", async () => {
    const response = await POST(
      request({ profileId, category: "privacy_or_personal_data" }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      reference: "RPT-ABCDEF12",
      duplicate: false,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");

    submitPublicProfileReport.mockResolvedValue({
      id: "abcdef12-0000-4000-8000-000000000001",
      created: false,
    });
    const duplicate = await POST(
      request({ profileId, category: "privacy_or_personal_data" }),
    );
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()).duplicate).toBe(true);
  });

  test("maps anti-abuse and missing-profile failures without leaking details", async () => {
    submitPublicProfileReport.mockRejectedValue(
      new PublicReportError("RATE_LIMITED"),
    );
    const limited = await POST(
      request({ profileId, category: "unsafe_or_harmful" }),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("3600");

    submitPublicProfileReport.mockRejectedValue(
      new PublicReportError("PROFILE_NOT_FOUND"),
    );
    expect(
      (await POST(request({ profileId, category: "unsafe_or_harmful" })))
        .status,
    ).toBe(404);
  });
});
