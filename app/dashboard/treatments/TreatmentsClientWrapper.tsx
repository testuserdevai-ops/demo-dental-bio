"use client";

import AddTreatment from "./AddTreatment";
import { usePreview } from "@/app/contexts/PreviewContext";
import ScopedSectionTitleForm from "./ScopedSectionTitleForm";
import TreatmentManager from "./TreatmentManager";
import { useTreatmentAggregate, useTreatmentMutations } from "./_lib/hooks";
import { mergeKindOrder } from "./_lib/order";
import type { TreatmentAggregate } from "./_lib/queries";
import type { ActionResult } from "@/lib/forms/action-result";

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
  const query = useTreatmentAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useTreatmentMutations({ scopeId, targetHint });
  const aggregate = query.data ?? data;
  const { triggerReload } = usePreview();

  const mutateAndReload = async <T,>(mutation: Promise<ActionResult<T>>) => {
    const result = await mutation;
    if (result.ok) triggerReload();
    return result;
  };

  return (
    <>
      <ScopedSectionTitleForm
        scopeId={scopeId}
        titles={aggregate.sectionTitles}
        onSave={(input) => mutations.saveSectionTitles.mutateAsync(input)}
        onSaved={triggerReload}
      />
      <AddTreatment
        onCreate={async (input) => {
          return mutateAndReload(mutations.create.mutateAsync(input));
        }}
      />
      <TreatmentManager
        kind="treatment"
        items={aggregate.treatments}
        loading={query.isLoading}
        onUpdate={async (input) => {
          return mutateAndReload(mutations.update.mutateAsync(input));
        }}
        onDelete={async (input) => {
          return mutateAndReload(mutations.remove.mutateAsync(input));
        }}
        onReorder={async (input) => {
          const orderedIds = mergeKindOrder(
            aggregate,
            "treatment",
            input.orderedIds,
          );
          return mutateAndReload(mutations.reorder.mutateAsync({ orderedIds }));
        }}
      />
      <TreatmentManager
        kind="service"
        items={aggregate.services}
        loading={query.isLoading}
        onUpdate={async (input) => {
          return mutateAndReload(mutations.update.mutateAsync(input));
        }}
        onDelete={async (input) => {
          return mutateAndReload(mutations.remove.mutateAsync(input));
        }}
        onReorder={async (input) => {
          const orderedIds = mergeKindOrder(
            aggregate,
            "service",
            input.orderedIds,
          );
          return mutateAndReload(mutations.reorder.mutateAsync({ orderedIds }));
        }}
      />
    </>
  );
}
