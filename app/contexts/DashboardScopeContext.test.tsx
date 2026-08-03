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
  it("exposes only the immutable server scope to dashboard consumers", () => {
    let received: object | undefined;

    render(
      <DashboardScopeProvider
        scope={{
          effectiveUserId: "00000000-0000-4000-8000-000000000001",
          dentistryId: "00000000-0000-4000-8000-000000000002",
          username: "owner",
        }}
      >
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
  });
});
