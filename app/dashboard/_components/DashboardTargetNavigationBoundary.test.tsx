import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { setMockSearchParams } from "@/test/mocks/next-navigation";
import { DashboardTargetNavigationBoundary } from "./DashboardTargetNavigationBoundary";

const assign = mock(() => {});

beforeEach(() => {
  assign.mockClear();
  Object.defineProperty(window.location, "assign", {
    configurable: true,
    value: assign,
  });
});

describe("DashboardTargetNavigationBoundary", () => {
  it("reloads the document when client navigation changes the dashboard target", async () => {
    setMockSearchParams(
      new URLSearchParams("userId=22222222-2222-4222-8222-222222222222"),
    );

    render(
      <DashboardTargetNavigationBoundary initialTargetUserId="11111111-1111-4111-8111-111111111111" />,
    );

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
  });

  it("does not reload for the target used to resolve the layout", async () => {
    const targetId = "22222222-2222-4222-8222-222222222222";
    setMockSearchParams(new URLSearchParams(`userId=${targetId}`));

    render(
      <DashboardTargetNavigationBoundary initialTargetUserId={targetId} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(assign).not.toHaveBeenCalled();
  });

  it("renders dashboard content for the target used to resolve the layout", () => {
    const targetId = "22222222-2222-4222-8222-222222222222";
    setMockSearchParams(new URLSearchParams(`userId=${targetId}`));

    render(
      <DashboardTargetNavigationBoundary initialTargetUserId={targetId}>
        <p>target shell</p>
      </DashboardTargetNavigationBoundary>,
    );

    expect(screen.getByText("target shell")).toBeTruthy();
  });

  it("does not expose stale dashboard content before reloading a changed target", () => {
    setMockSearchParams(
      new URLSearchParams("userId=22222222-2222-4222-8222-222222222222"),
    );

    render(
      <DashboardTargetNavigationBoundary initialTargetUserId="11111111-1111-4111-8111-111111111111">
        <p>owner shell</p>
      </DashboardTargetNavigationBoundary>,
    );

    expect(screen.queryByText("owner shell")).toBeNull();
  });
});
