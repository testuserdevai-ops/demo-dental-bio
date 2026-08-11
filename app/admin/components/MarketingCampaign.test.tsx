import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import MarketingCampaign from "./MarketingCampaign";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("MarketingCampaign", () => {
  const uploadRecipients = async () => {
    fireEvent.change(screen.getByLabelText("Recipients (CSV)"), {
      target: {
        files: [
          new File(
            ["email,first_name\nreader@example.test,Reader"],
            "list.csv",
            { type: "text/csv" },
          ),
        ],
      },
    });
    await screen.findByRole("group", { name: "Valid recipients: 1" });
  };

  it("validates the owned fields before opening confirmation", async () => {
    render(
      <MarketingCampaign
        brands={[{ domain: "dental.bio", brandName: "Dentalbio" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send campaign" }));

    expect(await screen.findByText("Enter a subject")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("summarizes valid, duplicate, and invalid recipients before review", async () => {
    render(
      <MarketingCampaign
        brands={[{ domain: "dental.bio", brandName: "Dentalbio" }]}
      />,
    );

    expect(screen.getByText("No recipient list uploaded yet.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Recipients (CSV)"), {
      target: {
        files: [
          new File(
            [
              "email,first_name\nreader@example.test,Reader\nREADER@example.test,Duplicate\nnot-an-email,Invalid",
            ],
            "mixed-list.csv",
            { type: "text/csv" },
          ),
        ],
      },
    });

    await screen.findByText("3 CSV rows reviewed.");
    const summary = screen.getByRole("region", { name: "Recipient summary" });
    expect(
      within(summary).getByRole("group", { name: "Valid recipients: 1" }),
    ).toBeTruthy();
    expect(
      within(summary).getByRole("group", { name: "Duplicates: 1" }),
    ).toBeTruthy();
    expect(
      within(summary).getByRole("group", { name: "Invalid recipients: 1" }),
    ).toBeTruthy();
  });

  it("keeps the confirmation and campaign draft after delivery fails", async () => {
    const fetchMock = mock(async () =>
      Response.json({ error: "Delivery unavailable" }, { status: 503 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(
      <MarketingCampaign
        brands={[{ domain: "dental.bio", brandName: "Dentalbio" }]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "A useful update" },
    });
    await uploadRecipients();

    fireEvent.click(screen.getByRole("button", { name: "Send campaign" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Send this campaign?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Send campaign" }),
    );

    expect(
      await within(dialog).findByText("Delivery unavailable"),
    ).toBeTruthy();
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe(
      "A useful update",
    );
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("closes confirmation and warns against retry after an unknown outcome", async () => {
    const fetchMock = mock(async () => {
      throw new TypeError("Network response lost");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(
      <MarketingCampaign
        brands={[{ domain: "dental.bio", brandName: "Dentalbio" }]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "A useful update" },
    });
    await uploadRecipients();
    fireEvent.click(screen.getByRole("button", { name: "Send campaign" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Send campaign",
      }),
    );

    expect(await screen.findByText(/Delivery outcome is unknown/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
