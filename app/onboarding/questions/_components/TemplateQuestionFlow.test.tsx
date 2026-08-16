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
const completeQuestionStep = mock(async (input: any) => ({
  ok: true as const,
  data: { completedStepIds: [input.stepId], revision: 1 },
}));

mock.module("../actions", () => ({
  completeQuestionStep,
  saveQuestionAnswers,
}));
mock.module("./OnboardingContentBuilder", () => ({
  OnboardingContentBuilder: ({ question }: { question: { title: string } }) => (
    <div data-testid="content-builder">{question.title}</div>
  ),
}));

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
      builderContext={{} as any}
      initialAnswers={{}}
      initialCompletedStepIds={[]}
      initialRevision={4}
      initialStep="profile-details"
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
    completeQuestionStep.mockClear();
  });

  it("starts with a real profile-content form step", () => {
    const { container } = renderFlow({ themeId: "premium-contrast" });
    expect(screen.getByTestId("content-builder").textContent).toContain(
      "profile and booking details",
    );
    expect(screen.queryByRole("radio")).toBeNull();
    expect(container.querySelector("[data-profile-theme]")).toBeNull();
  });

  it("lets a new owner skip every content step without inventing data", async () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() =>
      expect(navigationSpies.push).toHaveBeenCalledWith(
        "/onboarding/questions?template=direct-booking&step=social-links",
      ),
    );
    expect(completeQuestionStep).toHaveBeenCalledWith({
      templateId: "direct-booking",
      stepId: "profile-details",
    });
    expect(saveQuestionAnswers).not.toHaveBeenCalled();
  });

  it("continues from an optional form without requiring a saved entity", async () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await waitFor(() =>
      expect(navigationSpies.push).toHaveBeenCalledWith(
        "/onboarding/questions?template=direct-booking&step=social-links",
      ),
    );
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
    expect(screen.getByRole("button", { name: "Skip" }).className).toContain(
      "min-h-11",
    );
    expect(
      screen.getByRole("link", { name: "Finish later" }).className,
    ).toContain("min-h-11");
  });

  it("reviews the applied setup with labels and deterministic module order", () => {
    renderFlow({
      initialAnswers: {},
      initialStep: "review",
    });

    expect(
      screen.getByRole("heading", { name: "Review your profile plan" }),
    ).toBeTruthy();
    expect(screen.getByText("Direct Booking")).toBeTruthy();
    expect(screen.getByText("Clinical Light")).toBeTruthy();
    expect(
      screen.getAllByText(/Profile content can be added now or later/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/applied to your public bio/)).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(
      screen
        .getByRole("link", { name: "Continue to dashboard" })
        .closest("[data-onboarding-action-bar]"),
    ).not.toBeNull();
  });
});
