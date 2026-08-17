import { Card } from "@/app/components/ui/card";
import { cn } from "@/lib/utils";

import type {
  ProfileInventoryItem,
  ProfileTreatmentServiceSelection,
} from "../_lib/profile-treatment-services";

export type ProfileInventoryVariant =
  "numbered" | "card-grid" | "accent-grid" | "compact-grid" | "editorial-grid";

const gridClasses: Record<ProfileInventoryVariant, string> = {
  numbered: "sm:grid-cols-3",
  "card-grid": "sm:grid-cols-3",
  "accent-grid": "sm:grid-cols-2",
  "compact-grid": "sm:grid-cols-3",
  "editorial-grid": "sm:grid-cols-2",
};

const cardClasses: Record<ProfileInventoryVariant, string> = {
  numbered: "p-4 shadow-sm",
  "card-grid": "p-4 shadow-sm",
  "accent-grid":
    "border-l-4 border-l-[var(--profile-primary-action)] p-5 shadow-sm",
  "compact-grid": "px-4 py-3 shadow-none",
  "editorial-grid": "bg-muted/40 p-5 shadow-none",
};

function InventorySection({
  items,
  moduleId,
  title,
  variant,
}: {
  items: readonly ProfileInventoryItem[];
  moduleId: string;
  title: string;
  variant: ProfileInventoryVariant;
}) {
  if (items.length === 0) return null;
  const kind = items[0]!.kind;
  const headingId = `${moduleId}-${kind}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4"
      data-profile-inventory-kind={kind}
      id={kind === "service" ? "services" : "treatments"}
    >
      <h2
        className={cn(
          "text-2xl font-bold tracking-tight text-foreground",
          variant === "compact-grid" && "text-xl",
          variant === "numbered" && "text-center",
        )}
        id={headingId}
      >
        {title}
      </h2>
      <div className={cn("grid gap-3", gridClasses[variant])}>
        {items.map((item) => (
          <Card
            className={cardClasses[variant]}
            data-inventory-position={item.position}
            data-treatment-id={item.id}
            key={item.id}
          >
            {variant === "numbered" ? (
              <span className="grid size-8 place-items-center rounded-full bg-[var(--profile-secondary-action)] text-sm font-bold text-[var(--profile-on-secondary-action)]">
                {item.position}
              </span>
            ) : null}
            <h3
              className={cn(
                "font-bold leading-snug text-card-foreground",
                variant === "numbered" && "mt-3",
              )}
            >
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function ProfileTreatmentServiceSections({
  inventory,
  moduleId,
  serviceTitle,
  treatmentTitle,
  variant,
}: {
  inventory: ProfileTreatmentServiceSelection;
  moduleId: string;
  serviceTitle: string;
  treatmentTitle: string;
  variant: ProfileInventoryVariant;
}) {
  if (inventory.treatments.length === 0 && inventory.services.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-6 sm:space-y-8"
      data-profile-module={`${moduleId}-treatment-services`}
    >
      <InventorySection
        items={inventory.treatments}
        moduleId={moduleId}
        title={treatmentTitle}
        variant={variant}
      />
      <InventorySection
        items={inventory.services}
        moduleId={moduleId}
        title={serviceTitle}
        variant={variant}
      />
    </div>
  );
}
