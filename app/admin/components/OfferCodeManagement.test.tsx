import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const originalFetch = globalThis.fetch;
const offers = [
  { id: 1, university: "King's College London", offer_code: "KCL2026" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const { default: OfferCodeManagement } = await import("./OfferCodeManagement");

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OfferCodeManagement", () => {
  it("sorts universities deterministically and filters by university or code", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        json([
          { id: 3, university: "Zurich University", offer_code: "ZRH" },
          { id: 2, university: "alpha University", offer_code: "ALPHA" },
          { id: 1, university: "Alpha University", offer_code: "FIRST" },
        ]),
      ),
    ) as unknown as typeof fetch;

    render(<OfferCodeManagement />);
    await screen.findByText("3 results");

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "1alpha UniversityALPHA",
      "2Alpha UniversityFIRST",
      "3Zurich UniversityZRH",
    ]);

    fireEvent.change(screen.getByLabelText("Search offer codes"), {
      target: { value: "zrh" },
    });
    expect(screen.getByText("1 result for “zrh”")).toBeTruthy();
    expect(screen.getByText("Zurich University")).toBeTruthy();
    expect(screen.queryByText("Alpha University")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("3 results")).toBeTruthy();
  });

  it("keeps a create dialog and its draft open after the API rejects it", async () => {
    globalThis.fetch = mock((_url: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "POST") {
        return Promise.resolve(
          json({ error: "That offer code already exists" }, 400),
        );
      }
      return Promise.resolve(json(offers));
    }) as unknown as typeof fetch;

    render(<OfferCodeManagement />);
    await screen.findByText("King's College London");

    fireEvent.click(screen.getByRole("button", { name: "Add offer code" }));
    fireEvent.change(screen.getByLabelText("University"), {
      target: { value: "University of Leeds" },
    });
    fireEvent.change(screen.getByLabelText("Offer code"), {
      target: { value: "LEEDS2026" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Add offer code" })).getByRole(
        "button",
        { name: "Add offer code" },
      ),
    );

    expect(
      await screen.findByText("That offer code already exists"),
    ).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Add offer code" })).toBeTruthy();
    expect(
      (screen.getByLabelText("University") as HTMLInputElement).value,
    ).toBe("University of Leeds");
  });

  it("keeps the destructive confirmation open when deletion fails", async () => {
    globalThis.fetch = mock((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(json({ error: "Deletion failed" }, 400));
      }
      return Promise.resolve(json(offers));
    }) as unknown as typeof fetch;

    render(<OfferCodeManagement />);
    await screen.findByText("King's College London");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete offer code for King's College London",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete offer code" }));

    await waitFor(() =>
      expect(screen.getByText("Deletion failed")).toBeTruthy(),
    );
    expect(
      screen.getByRole("alertdialog", { name: "Delete offer code?" }),
    ).toBeTruthy();
  });

  it("closes a saved editor even when the canonical reload fails", async () => {
    let getCount = 0;
    globalThis.fetch = mock((_url: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "POST") {
        return Promise.resolve(json({ status: "success" }));
      }
      getCount += 1;
      return Promise.resolve(
        getCount === 1
          ? json(offers)
          : json({ error: "Reload unavailable" }, 503),
      );
    }) as unknown as typeof fetch;

    render(<OfferCodeManagement />);
    await screen.findByText("King's College London");
    fireEvent.click(screen.getByRole("button", { name: "Add offer code" }));
    fireEvent.change(screen.getByLabelText("University"), {
      target: { value: "University of Leeds" },
    });
    fireEvent.change(screen.getByLabelText("Offer code"), {
      target: { value: "LEEDS2026" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Add offer code" })).getByRole(
        "button",
        { name: "Add offer code" },
      ),
    );

    expect(await screen.findByText("Reload unavailable")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Add offer code" })).toBeNull();
  });
});
