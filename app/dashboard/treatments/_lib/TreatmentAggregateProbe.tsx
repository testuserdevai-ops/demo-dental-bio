import { useTreatmentAggregate } from "./hooks";

export function TreatmentAggregateProbe() {
  const query = useTreatmentAggregate({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: undefined,
    data: {
      sectionTitles: {
        treatmentSectionTitle: "Treatments",
        serviceSectionTitle: "Services",
      },
      treatments: [],
      services: [],
    },
    updatedAt: 0,
  });

  return <p>{query.data?.treatments[0]?.title ?? "empty"}</p>;
}
