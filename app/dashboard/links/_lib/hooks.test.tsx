import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const successfulCreate = mock(async () => ({ ok: true as const, data: {} }));
const failedReorder = mock(async () => ({
  ok: false as const,
  code: "REORDER_FAILED",
}));
mock.module("../actions", () => ({
  createLinkGroup: successfulCreate,
  updateLinkGroup: mock(async () => ({ ok: true })),
  deleteLinkGroup: mock(async () => ({ ok: true })),
  reorderLinkGroups: failedReorder,
  createLink: mock(async () => ({ ok: true })),
  updateLink: mock(async () => ({ ok: true })),
  deleteLink: mock(async () => ({ ok: true })),
  reorderLinks: failedReorder,
}));

const { useLinkMutations } = await import("./hooks");
const scopeId = "00000000-0000-4000-8000-000000000001";

function Probe() {
  const mutations = useLinkMutations({ scopeId, targetHint: undefined });
  return (
    <>
      <button
        onClick={() => mutations.createGroup.mutate({ heading: "Links" })}
      >
        create
      </button>
      <button
        onClick={() =>
          mutations.reorderGroups.mutate({
            orderedIds: ["00000000-0000-4000-8000-000000000002"],
          })
        }
      >
        reorder
      </button>
    </>
  );
}

describe("link mutation hooks", () => {
  it("refetches only the scoped aggregate after success and not after a controlled failure", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = mock(client.invalidateQueries.bind(client));
    const refetchQueries = mock(client.refetchQueries.bind(client));
    client.invalidateQueries = invalidateQueries;
    client.refetchQueries = refetchQueries;
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    screen.getByRole("button", { name: "create" }).click();
    await waitFor(() => expect(refetchQueries).toHaveBeenCalledTimes(2));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "links", scopeId],
    });

    screen.getByRole("button", { name: "reorder" }).click();
    await waitFor(() => expect(failedReorder).toHaveBeenCalledTimes(1));
    expect(refetchQueries).toHaveBeenCalledTimes(2);
  });
});
