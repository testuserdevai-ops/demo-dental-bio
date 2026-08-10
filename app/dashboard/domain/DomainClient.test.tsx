import { afterEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";

const get = mock(async () => ({
  domain: "owner.example",
  verified: false,
  records: [],
}));
const put = mock(async () => ({ domain: "owner.example" }));
mock.module("@/services/apiClient", () => ({
  apiClient: { get, put, post: mock(), delete: mock() },
}));

const { default: DomainClient } = await import("./DomainClient");

afterEach(() => {
  cleanup();
  get.mockClear();
  put.mockClear();
});

describe("DomainClient", () => {
  it("performs a fresh GET after re-check even while cached data is fresh", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <DomainClient />
      </QueryClientProvider>,
    );
    const button = await screen.findByRole("button", { name: "Re-check" });
    expect(get).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
