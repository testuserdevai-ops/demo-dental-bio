import { useTreatmentMutations } from "./hooks";

export function TreatmentMutationProbe() {
  const mutations = useTreatmentMutations({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: "00000000-0000-4000-8000-000000000001",
  });

  return (
    <>
      <button
        onClick={() =>
          mutations.create.mutate({
            title: "Check-up",
            description: "Routine",
            kind: "treatment",
          })
        }
      >
        create
      </button>
      <button
        onClick={() =>
          mutations.reorder.mutate({
            orderedIds: ["00000000-0000-4000-8000-000000000001"],
          })
        }
      >
        reorder
      </button>
      <button
        onClick={() =>
          mutations.saveSectionTitles.mutate({
            treatmentSectionTitle: "Smile treatments",
            serviceSectionTitle: "Patient services",
          })
        }
      >
        save titles
      </button>
    </>
  );
}
