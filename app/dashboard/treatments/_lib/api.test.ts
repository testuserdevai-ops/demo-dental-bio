import { afterEach, describe, expect, it } from "bun:test";
import { fetchTreatmentAggregate } from "./api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchTreatmentAggregate", () => {
  it("omits the target parameter for an owner read", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ treatments: [], services: [] }));
    }) as typeof fetch;
    await fetchTreatmentAggregate(undefined);
    expect(calls).toEqual(["/api/treatments"]);
  });

  it("uses an explicit target only for delegated reads", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ treatments: [], services: [] }));
    }) as typeof fetch;
    await fetchTreatmentAggregate("00000000-0000-4000-8000-000000000009");
    expect(calls).toEqual([
      "/api/treatments?targetUserId=00000000-0000-4000-8000-000000000009",
    ]);
  });
});
