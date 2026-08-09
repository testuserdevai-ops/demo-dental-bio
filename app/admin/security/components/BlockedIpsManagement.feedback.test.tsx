import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const toast = { error: mock(), success: mock() };
mock.module("sonner", () => ({ toast }));

const { default: BlockedIpsManagement } =
  await import("./BlockedIpsManagement");

const originalFetch = globalThis.fetch;

function response({
  ok,
  body,
}: {
  ok: boolean;
  body: Record<string, unknown>;
}) {
  return { json: async () => body, ok } as Response;
}

function mockFetch(postResponse: Response) {
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return Promise.resolve(postResponse);
    return Promise.resolve(
      response({ ok: true, body: { count: 0, data: [] } }),
    );
  }) as unknown as typeof fetch;
}

async function submitIp(ip = "203.0.113.10") {
  fireEvent.click(screen.getByRole("button", { name: "Block IP Address" }));
  fireEvent.change(screen.getByLabelText(/IP Address/), {
    target: { value: ip },
  });
  fireEvent.click(screen.getByRole("button", { name: "Block IP" }));
}

describe("BlockedIpsManagement feedback", () => {
  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("uses a Sonner success notification after a successful block", async () => {
    mockFetch(response({ ok: true, body: {} }));
    render(<BlockedIpsManagement />);

    await submitIp();

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("IP blocked successfully"),
    );
  });

  it("preserves the server error copy through a Sonner error notification", async () => {
    mockFetch(
      response({ ok: false, body: { error: "This IP cannot be blocked" } }),
    );
    render(<BlockedIpsManagement />);

    await submitIp();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This IP cannot be blocked"),
    );
  });
});
