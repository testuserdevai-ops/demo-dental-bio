"use client";

import type { ActionResult } from "@/lib/forms/action-result";
import SectionTitleForm from "./SectionTitleForm";
import type { TreatmentServiceSectionTitlesInput } from "./_lib/schemas";

export default function ScopedSectionTitleForm({
  onSave,
  onSaved,
  scopeId,
  titles,
}: {
  onSave(
    input: TreatmentServiceSectionTitlesInput,
  ): Promise<ActionResult<TreatmentServiceSectionTitlesInput>>;
  onSaved(): void;
  scopeId: string;
  titles: TreatmentServiceSectionTitlesInput;
}) {
  return (
    <SectionTitleForm
      key={scopeId}
      titles={titles}
      onSave={onSave}
      onSaved={onSaved}
    />
  );
}
