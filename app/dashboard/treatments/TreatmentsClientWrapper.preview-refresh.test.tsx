import React from "react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";

import type { ActionResult } from "@/lib/forms/action-result";

type Callback = (input: never) => Promise<ActionResult<unknown>>;
type ManagerCallbacks = {
  onUpdate: Callback;
  onDelete: Callback;
  onReorder: Callback;
};

let createCallback: Callback | undefined;
const managerCallbacks = new Map<string, ManagerCallbacks>();
const triggerReload = mock(() => {});

const mutationMocks = {
  create: mock(async (): Promise<ActionResult<unknown>> => ({
    ok: true,
    data: undefined,
  })),
  update: mock(async (): Promise<ActionResult<unknown>> => ({
    ok: true,
    data: undefined,
  })),
  remove: mock(async (): Promise<ActionResult<unknown>> => ({
    ok: true,
    data: undefined,
  })),
  reorder: mock(async (): Promise<ActionResult<unknown>> => ({
    ok: true,
    data: undefined,
  })),
  saveSectionTitles: mock(async (): Promise<ActionResult<unknown>> => ({
    ok: true,
    data: undefined,
  })),
};

mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
}));
mock.module("./_lib/hooks", () => ({
  useTreatmentAggregate: ({ data }: { data: unknown }) => ({
    data,
    isLoading: false,
  }),
  useTreatmentMutations: () =>
    Object.fromEntries(
      Object.entries(mutationMocks).map(([key, mutateAsync]) => [
        key,
        { mutateAsync },
      ]),
    ),
}));
mock.module("./AddTreatment", () => ({
  default: ({ onCreate }: { onCreate: Callback }) => {
    createCallback = onCreate;
    return null;
  },
}));
mock.module("./TreatmentManager", () => ({
  default: ({ kind, ...callbacks }: ManagerCallbacks & { kind: string }) => {
    managerCallbacks.set(kind, callbacks);
    return null;
  },
}));
mock.module("./ScopedSectionTitleForm", () => ({ default: () => null }));

const { default: TreatmentsClientWrapper } =
  await import("./TreatmentsClientWrapper");

const data = {
  sectionTitles: {
    treatmentSectionTitle: "Treatments",
    serviceSectionTitle: "Services",
  },
  treatments: [
    {
      id: "treatment-a",
      title: "Treatment A",
      description: "",
      kind: "treatment" as const,
      rank: 1,
    },
    {
      id: "treatment-b",
      title: "Treatment B",
      description: "",
      kind: "treatment" as const,
      rank: 3,
    },
  ],
  services: [
    {
      id: "service-a",
      title: "Service A",
      description: "",
      kind: "service" as const,
      rank: 2,
    },
    {
      id: "service-b",
      title: "Service B",
      description: "",
      kind: "service" as const,
      rank: 4,
    },
  ],
};

type Operation = {
  name: string;
  mutation: keyof typeof mutationMocks;
  callback(): Callback;
  input: Record<string, unknown>;
};

const operations: Operation[] = [
  {
    name: "treatment create",
    mutation: "create",
    callback: () => createCallback!,
    input: { title: "New treatment", description: "", kind: "treatment" },
  },
  {
    name: "service create",
    mutation: "create",
    callback: () => createCallback!,
    input: { title: "New service", description: "", kind: "service" },
  },
  ...(["treatment", "service"] as const).flatMap((kind) => [
    {
      name: `${kind} update`,
      mutation: "update" as const,
      callback: () => managerCallbacks.get(kind)!.onUpdate,
      input: {
        treatmentId: `${kind}-a`,
        title: `Updated ${kind}`,
        description: "",
        kind,
      },
    },
    {
      name: `${kind} delete`,
      mutation: "remove" as const,
      callback: () => managerCallbacks.get(kind)!.onDelete,
      input: { treatmentId: `${kind}-a` },
    },
    {
      name: `${kind} reorder`,
      mutation: "reorder" as const,
      callback: () => managerCallbacks.get(kind)!.onReorder,
      input: { orderedIds: [`${kind}-b`, `${kind}-a`] },
    },
  ]),
];

function renderWrapper() {
  render(
    <TreatmentsClientWrapper
      data={data}
      scopeId="owner-1"
      targetHint={undefined}
      updatedAt={Date.now()}
    />,
  );
}

afterEach(cleanup);

describe("TreatmentsClientWrapper preview refresh mutation matrix", () => {
  beforeEach(() => {
    createCallback = undefined;
    managerCallbacks.clear();
    triggerReload.mockClear();
    for (const mutation of Object.values(mutationMocks)) mutation.mockClear();
  });

  for (const operation of operations) {
    it(`${operation.name}: reloads exactly once after success`, async () => {
      mutationMocks[operation.mutation].mockResolvedValueOnce({
        ok: true,
        data: undefined,
      });
      renderWrapper();

      await act(async () => {
        await operation.callback()(operation.input as never);
      });

      expect(mutationMocks[operation.mutation]).toHaveBeenCalledTimes(1);
      expect(triggerReload).toHaveBeenCalledTimes(1);
    });

    it(`${operation.name}: does not reload after a returned failure`, async () => {
      mutationMocks[operation.mutation].mockResolvedValueOnce({
        ok: false,
        code: "EXPECTED_FAILURE",
        formError: "Expected failure",
      });
      renderWrapper();

      await act(async () => {
        await operation.callback()(operation.input as never);
      });

      expect(mutationMocks[operation.mutation]).toHaveBeenCalledTimes(1);
      expect(triggerReload).not.toHaveBeenCalled();
    });

    it(`${operation.name}: does not reload after a rejected mutation`, async () => {
      mutationMocks[operation.mutation].mockRejectedValueOnce(
        new Error("network unavailable"),
      );
      renderWrapper();

      let thrown: unknown;
      await act(async () => {
        try {
          await operation.callback()(operation.input as never);
        } catch (error) {
          thrown = error;
        }
      });

      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toBe("network unavailable");
      expect(mutationMocks[operation.mutation]).toHaveBeenCalledTimes(1);
      expect(triggerReload).not.toHaveBeenCalled();
    });
  }
});
