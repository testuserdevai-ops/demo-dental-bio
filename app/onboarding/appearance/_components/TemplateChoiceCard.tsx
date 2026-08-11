import { CheckCircleIcon, LockSimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ProfilePresentationTier,
  ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";
import { resolveAppearanceChoiceAvailability } from "../_lib/choice-availability";

type TemplateChoiceCardProps = {
  id: ProfileTemplateId;
  name: string;
  purpose: string;
  structure: readonly string[];
  checked: boolean;
  entitlementTier: ProfilePresentationTier;
  minimumTier: ProfilePresentationTier;
  onChange: (id: ProfileTemplateId) => void;
  onPreview?: (id: ProfileTemplateId, trigger: HTMLButtonElement) => void;
};

export function TemplateChoiceCard({
  id,
  name,
  purpose,
  structure,
  checked,
  entitlementTier,
  minimumTier,
  onChange,
  onPreview,
}: TemplateChoiceCardProps) {
  const availability = resolveAppearanceChoiceAvailability(
    minimumTier,
    entitlementTier,
  );
  const locked = availability.locked;
  const descriptionId = `template-${id}-description`;
  const availabilityId = `template-${id}-availability`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border-2 bg-card text-left transition-[border-color,box-shadow,transform] motion-reduce:transition-none",
        checked
          ? "border-primary shadow-[var(--elevation-card)]"
          : "border-border hover:border-primary-3",
        locked ? "opacity-70" : undefined,
      )}
      data-template-choice-card
    >
      <label
        className={cn(
          "relative flex p-3 sm:min-h-56 sm:p-5",
          locked ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <input
          className="peer sr-only"
          type="radio"
          name="template"
          value={id}
          checked={checked}
          disabled={locked}
          aria-describedby={`${descriptionId} ${availabilityId}`}
          onChange={() => onChange(id)}
        />
        <span className="flex w-full flex-col gap-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring sm:gap-4">
          <span className="flex items-start justify-between gap-3">
            <span className="text-lg font-bold text-card-foreground">
              {name}
            </span>
            {checked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                <CheckCircleIcon aria-hidden="true" weight="fill" /> Selected
              </span>
            ) : null}
          </span>
          <span
            id={descriptionId}
            className="text-sm leading-5 text-muted-foreground"
          >
            {purpose}
          </span>
          <span className="space-y-1.5 sm:mt-auto sm:space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
              Opens with
            </span>
            <span className="flex flex-wrap gap-2" aria-hidden="true">
              {structure.slice(0, 3).map((item, index) => (
                <span
                  key={item}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold sm:px-2.5 sm:py-1",
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {item}
                </span>
              ))}
            </span>
          </span>
          <span
            id={availabilityId}
            className="sr-only items-center gap-1 text-xs font-bold text-muted-foreground lg:not-sr-only lg:inline-flex"
          >
            {locked ? <LockSimpleIcon aria-hidden="true" /> : null}
            {availability.label}
          </span>
        </span>
      </label>
      {onPreview ? (
        <div className="flex items-center justify-between gap-2 px-3 pb-3 lg:hidden">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
            {locked ? <LockSimpleIcon aria-hidden="true" /> : null}
            {availability.label}
          </span>
          <Button
            aria-label={`Preview ${name}`}
            className="min-h-11 shrink-0 px-4"
            onClick={(event) => onPreview(id, event.currentTarget)}
            type="button"
            variant="outline"
          >
            Preview
          </Button>
        </div>
      ) : null}
    </div>
  );
}
