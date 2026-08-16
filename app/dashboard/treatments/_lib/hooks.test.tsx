import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

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
const saveTreatmentServiceSectionTitles = mock(async () => ({
  ok: true as const,
  data: {
    treatmentSectionTitle: "Treatments",
    serviceSectionTitle: "Services",
  },
}));
const initialAggregate = {
  sectionTitles: {
    treatmentSectionTitle: "Treatments",
    serviceSectionTitle: "Services",
  },
  treatments: [],
  services: [],
};
const authoritativeAggregate = {
  ...initialAggregate,
  sectionTitles: {
    treatmentSectionTitle: "Authoritative treatments",
    serviceSectionTitle: "Authoritative services",
  },
};
mock.module("../actions", () => ({
  createTreatment,
  updateTreatment,
  deleteTreatment,
  reorderTreatments,
  saveTreatmentServiceSectionTitles,
}));

const { TreatmentAggregateProbe } = await import("./TreatmentAggregateProbe");
const { TreatmentMutationProbe } = await import("./TreatmentMutationProbe");
const { useTreatmentAggregate, useTreatmentMutations } =
  await import("./hooks");
const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

function TitleReconciliationProbe() {
  const query = useTreatmentAggregate({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: "00000000-0000-4000-8000-000000000001",
    data: initialAggregate,
    updatedAt: 0,
  });
  const mutations = useTreatmentMutations({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: "00000000-0000-4000-8000-000000000001",
  });
  return (
    <>
      <p>{query.data?.sectionTitles.treatmentSectionTitle}</p>
      <button
        onClick={() =>
          mutations.saveSectionTitles.mutate({
            treatmentSectionTitle: "Draft treatment title",
            serviceSectionTitle: "Draft service title",
          })
        }
      >
        reconcile titles
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
        <TreatmentAggregateProbe />
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
      {
        sectionTitles: {
          treatmentSectionTitle: "Treatments",
          serviceSectionTitle: "Services",
        },
        treatments: [],
        services: [],
      },
    );
    render(
      <QueryClientProvider client={client}>
        <TreatmentMutationProbe />
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
    invalidateQueries.mockClear();
    refetchQueries.mockClear();
    screen.getByRole("button", { name: "save titles" }).click();
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(1));
    expect(refetchQueries.mock.calls.length).toBeGreaterThanOrEqual(1);
    screen.getByRole("button", { name: "reorder" }).click();
    await waitFor(() =>
      expect(refetchQueries.mock.calls.length).toBeGreaterThan(1),
    );
  });

  it("reconciles the aggregate to authoritative refetched titles after save", async () => {
    let aggregateFetchCount = 0;
    const authoritativeFetch = mock(async () => {
      aggregateFetchCount += 1;
      return new Response(
        JSON.stringify(
          aggregateFetchCount === 1 ? initialAggregate : authoritativeAggregate,
        ),
      );
    });
    globalThis.fetch = authoritativeFetch as unknown as typeof fetch;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <TitleReconciliationProbe />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(authoritativeFetch).toHaveBeenCalled());
    expect(screen.getByText("Treatments")).toBeTruthy();

    screen.getByRole("button", { name: "reconcile titles" }).click();
    await waitFor(() =>
      expect(screen.getByText("Authoritative treatments")).toBeTruthy(),
    );
    expect(authoritativeFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
