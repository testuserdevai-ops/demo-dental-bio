import { useTreatmentAggregate } from "./hooks";

export function TreatmentAggregateProbe() {
  const query = useTreatmentAggregate({
    scopeId: "00000000-0000-4000-8000-000000000001",
    targetHint: undefined,
    data: { treatments: [], services: [] },
    updatedAt: 0,
  });

  return <p>{query.data?.treatments[0]?.title ?? "empty"}</p>;
}
