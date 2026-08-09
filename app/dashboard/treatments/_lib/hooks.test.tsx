import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const createTreatment = mock(async () => ({ ok: true as const, data: {} }));
const updateTreatment = mock(async () => ({ ok: true as const, data: {} }));
const deleteTreatment = mock(async () => ({
  ok: true as const,
  data: undefined,
}));
const reorderTreatments = mock(async () => ({
  ok: false as const,
  code: "REORDER_FAILED",
}));
mock.module("../actions", () => ({
  createTreatment,
  updateTreatment,
  deleteTreatment,
  reorderTreatments,
}));

const { useTreatmentAggregate, useTreatmentMutations } =
  await import("./hooks");

function Probe() {
  const query = useTreatmentAggregate({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: undefined,
    data: { treatments: [], services: [] },
    updatedAt: 0,
  });
  return <p>{query.data?.treatments[0]?.title ?? "empty"}</p>;
}

function MutationProbe() {
  const mutations = useTreatmentMutations({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: "00000000-0000-4000-8000-000000000001",
  });
  return (
    <>
      <button
        onClick={() =>
          mutations.create.mutate({
            title: "Check-up",
            description: "Routine",
            kind: "treatment",
          })
        }
      >
        create
      </button>
      <button
        onClick={() =>
          mutations.reorder.mutate({
            orderedIds: ["00000000-0000-4000-8000-000000000001"],
          })
        }
      >
        reorder
      </button>
    </>
  );
}

describe("useTreatmentAggregate", () => {
  it("seeds the aggregate under its immutable scope key", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Probe />
      </QueryClientProvider>,
    );
    expect(screen.getByText("empty")).toBeTruthy();
  });
});

describe("treatment mutation hooks", () => {
  it("invalidates only the aggregate after create and restores/refetches after a failed reorder", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = mock(client.invalidateQueries.bind(client));
    const refetchQueries = mock(client.refetchQueries.bind(client));
    client.invalidateQueries = invalidateQueries;
    client.refetchQueries = refetchQueries;
    client.setQueryData(
      ["dashboard", "treatments", "00000000-0000-4000-8000-000000000001"],
      { treatments: [], services: [] },
    );
    render(
      <QueryClientProvider client={client}>
        <MutationProbe />
      </QueryClientProvider>,
    );
    screen.getByRole("button", { name: "create" }).click();
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          "dashboard",
          "treatments",
          "00000000-0000-4000-8000-000000000001",
        ],
      }),
    );
    screen.getByRole("button", { name: "reorder" }).click();
    await waitFor(() =>
      expect(refetchQueries.mock.calls.length).toBeGreaterThan(1),
    );
  });
});
