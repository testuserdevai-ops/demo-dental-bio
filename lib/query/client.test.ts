import { describe, expect, it } from "bun:test";
import {
  createDashboardQueryClient,
  shouldRetryDashboardQuery,
} from "./client";
import { DashboardNetworkError, DashboardQueryError } from "./errors";

describe("dashboard query client", () => {
  it("keeps dashboard reads fresh for 30 seconds and garbage-collects after 10 minutes", () => {
    const client = createDashboardQueryClient();
    const queryDefaults = client.getDefaultOptions().queries;

    if (!queryDefaults) {
      throw new Error("Dashboard query defaults are missing");
    }

    expect(queryDefaults.staleTime).toBe(30_000);
    expect(queryDefaults.gcTime).toBe(10 * 60_000);
  });

  it("does not refetch on focus and does refetch on reconnect", () => {
    const client = createDashboardQueryClient();
    const queryDefaults = client.getDefaultOptions().queries;

    if (!queryDefaults) {
      throw new Error("Dashboard query defaults are missing");
    }

    expect(queryDefaults.refetchOnWindowFocus).toBe(false);
    expect(queryDefaults.refetchOnReconnect).toBe(true);
  });

  it("retries one network or controlled 5xx failure", () => {
    expect(
      shouldRetryDashboardQuery(
        0,
        new DashboardNetworkError("Network request failed"),
      ),
    ).toBe(true);
    expect(
      shouldRetryDashboardQuery(
        0,
        new DashboardQueryError(503, "Service temporarily unavailable"),
      ),
    ).toBe(true);
    expect(
      shouldRetryDashboardQuery(
        1,
        new DashboardQueryError(503, "Service temporarily unavailable"),
      ),
    ).toBe(false);
  });

  it("does not retry controlled 4xx failures", () => {
    expect(
      shouldRetryDashboardQuery(
        0,
        new DashboardQueryError(422, "Validation failed", {
          ok: false,
          code: "VALIDATION_ERROR",
        }),
      ),
    ).toBe(false);
  });

  it("does not retry arbitrary TypeErrors or misleading transport text", () => {
    expect(
      shouldRetryDashboardQuery(0, new TypeError("Invalid dashboard state")),
    ).toBe(false);
    expect(
      shouldRetryDashboardQuery(0, new Error("Unable to fetch saved form")),
    ).toBe(false);
    expect(
      shouldRetryDashboardQuery(0, new Error("Validation timeout exceeded")),
    ).toBe(false);
  });

  it("does not retry aborted requests", () => {
    const abortError = Object.assign(new Error("Request aborted"), {
      name: "AbortError",
    });

    expect(shouldRetryDashboardQuery(0, abortError)).toBe(false);
  });

  it("does not retry or throw mutation failures globally", () => {
    const mutationDefaults =
      createDashboardQueryClient().getDefaultOptions().mutations;

    if (!mutationDefaults) {
      throw new Error("Dashboard mutation defaults are missing");
    }

    expect(mutationDefaults.retry).toBe(false);
    expect(mutationDefaults.throwOnError).toBe(false);
  });
});
