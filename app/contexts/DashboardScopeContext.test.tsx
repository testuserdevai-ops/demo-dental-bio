import { describe, expect, it } from "bun:test";
import * as React from "react";
import { render } from "@testing-library/react";
import {
  DashboardScopeProvider,
  useDashboardScope,
} from "./DashboardScopeContext";

function ScopeProbe({ onScope }: { onScope: (scope: object) => void }) {
  onScope(useDashboardScope());
  return null;
}

describe("DashboardScopeProvider", () => {
  it("freezes a stable scope copy so consumer mutation cannot affect rerenders", () => {
    let received: object | undefined;
    const seed = {
      effectiveUserId: "00000000-0000-4000-8000-000000000001",
      dentistryId: "00000000-0000-4000-8000-000000000002",
      username: "owner",
      canManageSubscription: true,
    };

    const view = render(
      <DashboardScopeProvider scope={seed}>
        <ScopeProbe onScope={(scope) => (received = scope)} />
      </DashboardScopeProvider>,
    );

    expect(received).toEqual({
      effectiveUserId: "00000000-0000-4000-8000-000000000001",
      dentistryId: "00000000-0000-4000-8000-000000000002",
      username: "owner",
      canManageSubscription: true,
    });
    expect(Object.keys(received ?? {})).toEqual([
      "effectiveUserId",
      "dentistryId",
      "username",
      "canManageSubscription",
    ]);
    expect(Object.isFrozen(received)).toBe(true);

    try {
      (received as { username: string }).username = "attacker";
    } catch {}
    view.rerender(
      <DashboardScopeProvider scope={seed}>
        <ScopeProbe onScope={(scope) => (received = scope)} />
      </DashboardScopeProvider>,
    );

    expect(received).toEqual({
      effectiveUserId: "00000000-0000-4000-8000-000000000001",
      dentistryId: "00000000-0000-4000-8000-000000000002",
      username: "owner",
      canManageSubscription: true,
    });
    expect(seed.username).toBe("owner");
  });

  it("preserves the provided scope identity when its primitive fields are unchanged", () => {
    const received: object[] = [];
    const view = render(
      <DashboardScopeProvider
        scope={{
          effectiveUserId: "00000000-0000-4000-8000-000000000001",
          dentistryId: "00000000-0000-4000-8000-000000000002",
          username: "owner",
          canManageSubscription: true,
        }}
      >
        <ScopeProbe onScope={(scope) => received.push(scope)} />
      </DashboardScopeProvider>,
    );

    const firstScope = received.at(-1);
    view.rerender(
      <DashboardScopeProvider
        scope={{
          effectiveUserId: "00000000-0000-4000-8000-000000000001",
          dentistryId: "00000000-0000-4000-8000-000000000002",
          username: "owner",
          canManageSubscription: true,
        }}
      >
        <ScopeProbe onScope={(scope) => received.push(scope)} />
      </DashboardScopeProvider>,
    );

    expect(received.at(-1)).toBe(firstScope);
  });

  it.each([
    [
      "effective user",
      "effectiveUserId",
      "00000000-0000-4000-8000-000000000003",
    ],
    ["dentistry", "dentistryId", "00000000-0000-4000-8000-000000000004"],
    ["username", "username", "new-owner"],
    ["subscription capability", "canManageSubscription", false],
  ] as const)(
    "replaces the scope when the %s field changes",
    (_label, changedField, changedValue) => {
      const received: Array<{
        effectiveUserId: string;
        dentistryId: string;
        username: string;
        canManageSubscription: boolean;
      }> = [];
      const initialScope = {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
        canManageSubscription: true,
      };
      const view = render(
        <DashboardScopeProvider scope={initialScope}>
          <ScopeProbe
            onScope={(scope) => received.push(scope as typeof initialScope)}
          />
        </DashboardScopeProvider>,
      );

      const firstScope = received.at(-1);
      view.rerender(
        <DashboardScopeProvider
          scope={{ ...initialScope, [changedField]: changedValue }}
        >
          <ScopeProbe
            onScope={(scope) => received.push(scope as typeof initialScope)}
          />
        </DashboardScopeProvider>,
      );

      expect(received.at(-1)).not.toBe(firstScope);
      expect(received.at(-1)?.[changedField]).toBe(changedValue);
      expect(Object.isFrozen(received.at(-1))).toBe(true);
    },
  );
});
