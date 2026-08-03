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
    });
    expect(Object.keys(received ?? {})).toEqual([
      "effectiveUserId",
      "dentistryId",
      "username",
    ]);
    expect(Object.isFrozen(received)).toBe(true);

    try {
      (received as { username: string }).username = "attacker";
    } catch {}
    seed.username = "changed-after-render";
    view.rerender(
      <DashboardScopeProvider scope={seed}>
        <ScopeProbe onScope={(scope) => (received = scope)} />
      </DashboardScopeProvider>,
    );

    expect(received).toEqual({
      effectiveUserId: "00000000-0000-4000-8000-000000000001",
      dentistryId: "00000000-0000-4000-8000-000000000002",
      username: "owner",
    });
    expect(seed.username).toBe("changed-after-render");
  });
});
