"use client";

import TreatmentManager, { type TreatmentItem } from "./TreatmentManager";

export default function ManageTreatments({
  dentistryId,
  newTreatment,
  onTreatmentAdded,
}: {
  dentistryId: string;
  newTreatment?: TreatmentItem | null;
  onTreatmentAdded?: () => void;
}) {
  return (
    <TreatmentManager
      dentistryId={dentistryId}
      kind="treatment"
      newItem={newTreatment}
      onItemAdded={onTreatmentAdded}
    />
  );
}
