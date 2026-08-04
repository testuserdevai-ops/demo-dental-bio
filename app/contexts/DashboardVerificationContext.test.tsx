import { describe, expect, it } from "bun:test";
import * as React from "react";
import { render } from "@testing-library/react";
import {
  DashboardVerificationProvider,
  useDashboardVerification,
} from "./DashboardVerificationContext";
import type {
  DashboardScope,
  DashboardShellViewModel,
} from "@/lib/dashboard/types";

type VerificationValue = {
  scope: DashboardScope;
  shell: DashboardShellViewModel;
  targetUserId: string | null;
};

function VerificationProbe({
  onValue,
}: {
  onValue: (value: VerificationValue) => void;
}) {
  onValue(useDashboardVerification());
  return null;
}

const initialValue: VerificationValue = {
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
    dentistryId: "00000000-0000-4000-8000-000000000002",
    username: "owner",
  },
  shell: {
    subscriptionStatus: "active",
    isVerified: true,
    useDentalBrand: false,
    position: "Dentist",
    createdAt: "2026-01-01T00:00:00.000Z",
    trialEnd: null,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
  },
  targetUserId: null,
};

describe("DashboardVerificationProvider", () => {
  it("preserves identity for semantically identical scope, shell, and target values", () => {
    const received: VerificationValue[] = [];
    const view = render(
      <DashboardVerificationProvider value={initialValue}>
        <VerificationProbe onValue={(value) => received.push(value)} />
      </DashboardVerificationProvider>,
    );

    const firstValue = received.at(-1);
    view.rerender(
      <DashboardVerificationProvider
        value={{
          scope: { ...initialValue.scope },
          shell: { ...initialValue.shell },
          targetUserId: null,
        }}
      >
        <VerificationProbe onValue={(value) => received.push(value)} />
      </DashboardVerificationProvider>,
    );

    expect(received.at(-1)).toBe(firstValue);
    expect(Object.isFrozen(firstValue)).toBe(true);
    expect(Object.isFrozen(firstValue?.scope)).toBe(true);
    expect(Object.isFrozen(firstValue?.shell)).toBe(true);
  });

  it.each([
    [
      "scope user",
      "scope",
      "effectiveUserId",
      "00000000-0000-4000-8000-000000000003",
    ],
    [
      "scope dentistry",
      "scope",
      "dentistryId",
      "00000000-0000-4000-8000-000000000004",
    ],
    ["scope username", "scope", "username", "new-owner"],
    ["shell subscription", "shell", "subscriptionStatus", "past_due"],
    ["shell verification", "shell", "isVerified", false],
    ["shell brand", "shell", "useDentalBrand", true],
    ["shell position", "shell", "position", "Orthodontist"],
    ["shell creation", "shell", "createdAt", "2026-02-01T00:00:00.000Z"],
    ["shell trial", "shell", "trialEnd", "2026-03-01T00:00:00.000Z"],
    ["shell period", "shell", "currentPeriodEnd", "2027-02-01T00:00:00.000Z"],
    [
      "admin target",
      "targetUserId",
      null,
      "00000000-0000-4000-8000-000000000005",
    ],
  ] as const)(
    "replaces the verification value when %s changes",
    (_label, container, field, changedValue) => {
      const received: VerificationValue[] = [];
      const view = render(
        <DashboardVerificationProvider value={initialValue}>
          <VerificationProbe onValue={(value) => received.push(value)} />
        </DashboardVerificationProvider>,
      );

      const firstValue = received.at(-1);
      const value: VerificationValue =
        container === "targetUserId"
          ? { ...initialValue, targetUserId: changedValue as string }
          : ({
              ...initialValue,
              [container]: {
                ...initialValue[container],
                [field as string]: changedValue,
              },
            } as VerificationValue);
      view.rerender(
        <DashboardVerificationProvider value={value}>
          <VerificationProbe
            onValue={(nextValue) => received.push(nextValue)}
          />
        </DashboardVerificationProvider>,
      );

      expect(received.at(-1)).not.toBe(firstValue);
      expect(received.at(-1)).toEqual(value);
    },
  );
});
