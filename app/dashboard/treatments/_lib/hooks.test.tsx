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
const saveTreatmentServiceSectionTitles = mock(async () => ({
  ok: true as const,
  data: {
    treatmentSectionTitle: "Treatments",
    serviceSectionTitle: "Services",
  },
}));
mock.module("../actions", () => ({
  createTreatment,
  updateTreatment,
  deleteTreatment,
  reorderTreatments,
  saveTreatmentServiceSectionTitles,
}));

const { TreatmentAggregateProbe } = await import("./TreatmentAggregateProbe");
const { TreatmentMutationProbe } = await import("./TreatmentMutationProbe");

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
});
