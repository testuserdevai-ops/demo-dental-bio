import { describe, expect, it } from "bun:test";
import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardQueryProvider } from "./DashboardQueryProvider";

type ProviderProps = React.ComponentProps<typeof DashboardQueryProvider>;
type HasNoProp<T, TKey extends string> = TKey extends keyof T ? false : true;

const hasNoAuthProp: HasNoProp<ProviderProps, "auth"> = true;
const hasNoUserProp: HasNoProp<ProviderProps, "user"> = true;

function QueryClientProbe({
  onClient,
}: {
  onClient: (clientId: object) => void;
}) {
  const client = useQueryClient();
  onClient(client);
  return null;
}

describe("DashboardQueryProvider", () => {
  it("preserves its query client across child rerenders and creates one for a new mount", () => {
    const clients: object[] = [];
    const onClient = (client: object) => clients.push(client);
    const firstRender = render(
      <DashboardQueryProvider>
        <QueryClientProbe onClient={onClient} />
      </DashboardQueryProvider>,
    );

    firstRender.rerender(
      <DashboardQueryProvider>
        <QueryClientProbe onClient={onClient} />
      </DashboardQueryProvider>,
    );
    expect(clients[0]).toBe(clients[1]);

    cleanup();
    render(
      <DashboardQueryProvider>
        <QueryClientProbe onClient={onClient} />
      </DashboardQueryProvider>,
    );
    expect(clients[2]).not.toBe(clients[0]);
  });

  it("accepts only its children as provider props", () => {
    expect(hasNoAuthProp).toBe(true);
    expect(hasNoUserProp).toBe(true);
  });
});
