import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportProfileDialog } from "./ReportProfileDialog";

const originalFetch = globalThis.fetch;
const fetchMock = mock(async () =>
  Response.json(
    { reference: "RPT-ABCDEF12", duplicate: false },
    { status: 201 },
  ),
);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    Response.json(
      { reference: "RPT-ABCDEF12", duplicate: false },
      { status: 201 },
    ),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function renderValidReport(details?: string) {
  const user = userEvent.setup();
  render(
    <ReportProfileDialog
      brandName="DentalBio"
      open
      onOpenChange={() => undefined}
      profileId="00000000-0000-4000-8000-000000000001"
      username="dr-smith"
    />,
  );
  const category = screen.getByRole("combobox", {
    name: "What is the concern?",
  });
  category.focus();
  await user.keyboard("{ArrowDown}{Enter}");
  if (details) {
    await user.type(screen.getByRole("textbox", { name: /Details/ }), details);
  }
  await user.click(screen.getByRole("button", { name: "Review report" }));
  await screen.findByRole("alertdialog", { name: "Submit this report?" });
  return user;
}

describe("ReportProfileDialog", () => {
  test("requires review confirmation and cancelling sends nothing", async () => {
    const user = await renderValidReport();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("combobox", { name: "What is the concern?" }),
    ).toBeTruthy();
  });

  test("submits only after confirmation and exposes the safe reference", async () => {
    const user = await renderValidReport();
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await screen.findByText("RPT-ABCDEF12");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      profileId: "00000000-0000-4000-8000-000000000001",
      category: "fraud_or_impersonation",
    });
  });

  test("preserves the draft after a recoverable server failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "Please try again later." }, { status: 503 }),
    );
    const user = await renderValidReport(
      "This is useful context for the moderation team.",
    );
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await screen.findByRole("alert");
    expect(screen.getByText("Please try again later.")).toBeTruthy();
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: /Details/,
          }) as HTMLTextAreaElement
        ).value,
      ).toBe("This is useful context for the moderation team."),
    );
  });
});
