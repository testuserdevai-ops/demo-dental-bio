// @ts-nocheck -- Bun provides its test module at runtime.
import React from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";

afterEach(cleanup);

describe("feedback primitives", () => {
  it("gives standalone loading a status and keeps skeleton decorative", () => {
    render(
      <>
        <Spinner label="Loading treatments" />
        <Skeleton data-testid="skeleton" />
      </>,
    );
    expect(
      screen.getByRole("status", { name: "Loading treatments" }),
    ).toBeTruthy();
    expect(screen.getByTestId("skeleton").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("renders alerts and empty states with consumer-selected semantics", () => {
    render(
      <>
        <Alert variant="warning" role="status">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Review your profile.</AlertDescription>
        </Alert>
        <EmptyState>
          <EmptyStateTitle>No treatments yet</EmptyStateTitle>
          <EmptyStateDescription>
            Add your first treatment to begin.
          </EmptyStateDescription>
        </EmptyState>
      </>,
    );
    expect(screen.getByRole("status").textContent).toContain("Heads up");
    expect(
      screen.getByRole("heading", { name: "No treatments yet" }),
    ).toBeTruthy();
  });
});
