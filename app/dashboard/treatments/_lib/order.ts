import type { TreatmentAggregate } from "./queries";

export function mergeKindOrder(
  aggregate: TreatmentAggregate,
  kind: "treatment" | "service",
  orderedIds: string[],
): string[] {
  const replacement = [...orderedIds];
  return [...aggregate.treatments, ...aggregate.services]
    .sort((left, right) => left.rank - right.rank)
    .map((item) => (item.kind === kind ? replacement.shift()! : item.id));
}
