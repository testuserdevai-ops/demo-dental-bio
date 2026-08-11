import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ActionResult } from "@/lib/forms/action-result";
import type { QuestionContentOptions } from "@/lib/profile-presentation/questions/registry";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

import type { SaveQuestionAnswersData } from "../actions";

const saveQuestionAnswers = mock(
  async (input: any): Promise<ActionResult<SaveQuestionAnswersData>> => ({
    ok: true,
    data: {
      answers: input.answers,
      revision: input.expectedRevision + 1,
      completed: input.intent === "complete",
      summary: [],
    },
  }),
);

mock.module("../actions", () => ({ saveQuestionAnswers }));

const { TemplateQuestionFlow } = await import("./TemplateQuestionFlow");

const contentOptions: QuestionContentOptions = {
  treatments: [{ id: "11", label: "Invisalign" }],
  locations: [
    { id: "00000000-0000-4000-8000-000000000012", label: "City clinic" },
  ],
  reviews: [{ id: "21", label: "Review by Sam" }],
  galleries: [{ id: "31", label: "Smile case" }],
  links: [
    { id: "00000000-0000-4000-8000-000000000041", label: "Research article" },
  ],
  products: [{ id: "51", label: "Care guide" }],
};

function renderFlow(
  overrides: Partial<React.ComponentProps<typeof TemplateQuestionFlow>> = {},
) {
  return render(
    <TemplateQuestionFlow
      contentOptions={contentOptions}
      initialAnswers={{}}
      initialRevision={4}
      initialStep="direct-primary-action"
      templateId="direct-booking"
      themeId="clinical-light"
      {...overrides}
    />,
  );
}

describe("TemplateQuestionFlow", () => {
  beforeEach(() => {
    resetNavigationMocks();
    saveQuestionAnswers.mockReset();
    saveQuestionAnswers.mockImplementation(async (input: any) => ({
      ok: true,
      data: {
        answers: input.answers,
        revision: input.expectedRevision + 1,
        completed: input.intent === "complete",
        summary: [],
      },
    }));
  });

  it("autosaves a controlled answer and reveals the next conditional question", async () => {
    renderFlow();

    fireEvent.click(screen.getByRole("radio", { name: "Book an appointment" }));

    await waitFor(() =>
      expect(saveQuestionAnswers).toHaveBeenCalledWith({
        templateId: "direct-booking",
        expectedRevision: 4,
        baseAnswers: {},
        answers: { primaryAction: "booking" },
        intent: "autosave",
      }),
    );
    expect(screen.getByText("Private draft saved")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(navigationSpies.push).toHaveBeenCalledWith(
      "/onboarding/questions?template=direct-booking&step=direct-secondary-action",
    );
  });

  it("keeps local answers selected and offers reload after a conflict", async () => {
    saveQuestionAnswers.mockResolvedValueOnce({
      ok: false,
      code: "CONFLICT",
      formError:
        "These answers changed in another tab. Your answers are still here; reload the saved draft before trying again.",
    });
    renderFlow();

    const booking = screen.getByRole("radio", { name: "Book an appointment" });
    fireEvent.click(booking);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Your answers are still here",
    );
    expect((booking as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reload saved draft" }));
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
  });

  it("focuses a field-specific error and does not leave an unanswered required step", async () => {
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    const error = await screen.findByRole("alert");
    expect(error.textContent).toContain("Choose an answer before continuing");
    await waitFor(() => expect(document.activeElement).toBe(error));
    expect(navigationSpies.push).not.toHaveBeenCalled();
  });

  it("renders an empty entity state that returns to the existing builder", () => {
    renderFlow({
      contentOptions: { ...contentOptions, products: [] },
      initialAnswers: { defaultAudience: "clinic" },
      initialStep: "commerce-featured-product",
      templateId: "clinic-commerce",
    });

    expect(screen.getByText("No saved options yet")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open the existing builder" })
        .getAttribute("href"),
    ).toBe("/dashboard/shop");
  });

  it("keeps the advance action in a safe-area mobile action surface", () => {
    const { container } = renderFlow();
    const actionBar = container.querySelector("[data-onboarding-action-bar]");
    const main = container.querySelector("main");

    expect(actionBar).not.toBeNull();
    expect(actionBar?.className).toContain("fixed");
    expect(actionBar?.className).toContain("bottom-0");
    expect(actionBar?.className).toContain("env(safe-area-inset-bottom)");
    expect(actionBar?.className).toContain("md:static");
    expect(main?.className).toContain("pb-56");
    expect(main?.className).toContain("md:pb-12");
  });

  it("reviews the private draft with labels and deterministic module order", () => {
    renderFlow({
      initialAnswers: {
        primaryAction: "booking",
        featuredTreatmentIds: ["11"],
      },
      initialStep: "review",
    });

    expect(
      screen.getByRole("heading", { name: "Review your profile plan" }),
    ).toBeTruthy();
    expect(screen.getByText("Direct Booking")).toBeTruthy();
    expect(screen.getByText("Clinical Light")).toBeTruthy();
    expect(screen.getByText("Invisalign")).toBeTruthy();
    expect(screen.getByText(/Nothing on this page publishes/)).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(
      screen
        .getByRole("link", { name: "Continue to dashboard" })
        .closest("[data-onboarding-action-bar]"),
    ).not.toBeNull();
  });
});
