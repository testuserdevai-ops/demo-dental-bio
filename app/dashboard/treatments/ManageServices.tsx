"use client";

import TreatmentManager, { type TreatmentItem } from "./TreatmentManager";

export default function ManageServices({
  dentistryId,
  newService,
  onServiceAdded,
}: {
  dentistryId: string;
  newService?: TreatmentItem | null;
  onServiceAdded?: () => void;
}) {
  return (
    <TreatmentManager
      dentistryId={dentistryId}
      kind="service"
      newItem={newService}
      onItemAdded={onServiceAdded}
    />
  );
}
