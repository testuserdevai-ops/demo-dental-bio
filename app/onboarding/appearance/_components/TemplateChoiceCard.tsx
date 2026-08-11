import { CheckCircleIcon, LockSimpleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";

type TemplateChoiceCardProps = {
  id: ProfileTemplateId;
  name: string;
  purpose: string;
  structure: readonly string[];
  checked: boolean;
  locked: boolean;
  onChange: (id: ProfileTemplateId) => void;
};

export function TemplateChoiceCard({
  id,
  name,
  purpose,
  structure,
  checked,
  locked,
  onChange,
}: TemplateChoiceCardProps) {
  const descriptionId = `template-${id}-description`;
  const availabilityId = `template-${id}-availability`;

  return (
    <label
      className={cn(
        "relative flex min-h-56 rounded-[var(--radius-lg)] border-2 bg-card p-5 text-left transition-[border-color,box-shadow,transform] motion-reduce:transition-none",
        checked
          ? "border-primary shadow-[var(--elevation-card)]"
          : "border-border hover:border-primary-3",
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
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
      <span className="flex w-full flex-col gap-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
        <span className="flex items-start justify-between gap-3">
          <span className="text-lg font-bold text-card-foreground">{name}</span>
          {checked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
              <CheckCircleIcon aria-hidden="true" weight="fill" /> Selected
            </span>
          ) : null}
        </span>
        <span id={descriptionId} className="text-sm text-muted-foreground">
          {purpose}
        </span>
        <span className="mt-auto space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Typical opening
          </span>
          <span className="flex flex-wrap gap-2" aria-hidden="true">
            {structure.map((item, index) => (
              <span
                key={item}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
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
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"
        >
          {locked ? <LockSimpleIcon aria-hidden="true" /> : null}
          {locked ? "Pro plan required" : "Available on Free"}
        </span>
      </span>
    </label>
  );
}
