"use client";

import AddTreatment from "./AddTreatment";
import TreatmentManager from "./TreatmentManager";
import { useTreatmentAggregate, useTreatmentMutations } from "./_lib/hooks";
import { mergeKindOrder } from "./_lib/order";
import type { TreatmentAggregate } from "./_lib/queries";

export default function TreatmentsClientWrapper({
  scopeId,
  targetHint,
  data,
  updatedAt,
}: {
  scopeId: string;
  targetHint: string | undefined;
  data: TreatmentAggregate;
  updatedAt: number;
}) {
  const query = useTreatmentAggregate({ scopeId, data, updatedAt });
  const mutations = useTreatmentMutations({ scopeId, targetHint });
  const aggregate = query.data ?? data;

  return (
    <>
      <AddTreatment
        onCreate={async (input) => {
          return mutations.create.mutateAsync(input);
        }}
      />
      <TreatmentManager
        kind="treatment"
        items={aggregate.treatments}
        loading={query.isLoading}
        onUpdate={async (input) => {
          return mutations.update.mutateAsync(input);
        }}
        onDelete={async (input) => {
          return mutations.remove.mutateAsync(input);
        }}
        onReorder={async (input) => {
          const orderedIds = mergeKindOrder(
            aggregate,
            "treatment",
            input.orderedIds,
          );
          return mutations.reorder.mutateAsync({ orderedIds });
        }}
      />
      <TreatmentManager
        kind="service"
        items={aggregate.services}
        loading={query.isLoading}
        onUpdate={async (input) => {
          return mutations.update.mutateAsync(input);
        }}
        onDelete={async (input) => {
          return mutations.remove.mutateAsync(input);
        }}
        onReorder={async (input) => {
          const orderedIds = mergeKindOrder(
            aggregate,
            "service",
            input.orderedIds,
          );
          return mutations.reorder.mutateAsync({ orderedIds });
        }}
      />
    </>
  );
}
