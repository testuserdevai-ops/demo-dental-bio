import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const updateLocation = mock(async () => ({
  ok: false as const,
  code: "CONFLICT",
  formError: "This location changed. Review your draft and try again.",
}));

mock.module("../actions", () => ({
  saveLocationTitle: mock(),
  createLocation: mock(),
  updateLocation,
  deleteLocation: mock(),
}));

const { useLocationMutations } = await import("./hooks");

function MutationProbe() {
  const mutations = useLocationMutations({ scopeId: "dentistry-1" });
  return (
    <button
      onClick={() =>
        mutations.updateLocation.mutate({
          id: crypto.randomUUID(),
          expectedUpdatedAt: "2026-08-04T00:00:00.000Z",
          businessName: "Clinic",
          fullAddress: "1 High Street",
          country: "UK",
          city: "London",
          area: "Central",
          latitude: 51.5,
          longitude: -0.1,
        })
      }
    >
      update
    </button>
  );
}

describe("location mutation hooks", () => {
  it("refreshes the authoritative revision after a stale update conflict", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = mock(client.invalidateQueries.bind(client));
    const refetchQueries = mock(client.refetchQueries.bind(client));
    client.invalidateQueries = invalidateQueries;
    client.refetchQueries = refetchQueries;

    render(
      <QueryClientProvider client={client}>
        <MutationProbe />
      </QueryClientProvider>,
    );

    screen.getByRole("button", { name: "update" }).click();

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["dashboard", "locations", "dentistry-1"],
      }),
    );
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "locations", "dentistry-1"],
    });
  });
});
