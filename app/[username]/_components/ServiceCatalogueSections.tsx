"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

import { TrackedButton } from "@/app/components/analytics/TrackedAction";

export type CatalogueSectionItem = {
  id: string;
  title: string;
  description: string | null;
  kind: "treatment" | "service";
};

export function ServiceCatalogueSections({
  heading,
  id,
  items,
}: {
  heading: string;
  id?: string;
  items: readonly CatalogueSectionItem[];
}) {
  if (items.length === 0) return null;

  const headingId = `catalogue-${items[0]?.kind ?? "care"}-heading`;

  return (
    <section aria-labelledby={headingId} className="space-y-4" id={id}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Browse by need
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id={headingId}
        >
          {heading}
        </h2>
      </div>
      <ServiceCatalogueItems items={items} />
    </section>
  );
}

export function ServiceCatalogueItems({
  items,
  positionOffset = 0,
}: {
  items: readonly CatalogueSectionItem[];
  positionOffset?: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const open = openId === item.id;
        const contentId = `catalogue-item-${item.id}`;
        if (!item.description) {
          return (
            <article
              className="min-h-14 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-4 text-base font-bold text-card-foreground shadow-sm sm:px-5"
              data-catalogue-item={item.id}
              key={item.id}
            >
              {item.title}
            </article>
          );
        }
        return (
          <article
            className="self-start overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-sm"
            data-catalogue-item={item.id}
            key={item.id}
          >
            <TrackedButton
              analytics={{
                section: item.kind === "service" ? "services" : "treatments",
                position: positionOffset + index + 1,
                action:
                  item.kind === "service"
                    ? { type: "service_expand", treatmentId: item.id }
                    : { type: "treatment_expand", treatmentId: item.id },
              }}
              aria-controls={contentId}
              aria-expanded={open}
              className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left text-base font-bold text-card-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:px-5"
              onClick={() => setOpenId(open ? null : item.id)}
              type="button"
            >
              <span>{item.title}</span>
              <CaretDown
                aria-hidden="true"
                className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                size={20}
                weight="bold"
              />
            </TrackedButton>
            <div
              className={
                open ? "border-t border-border px-4 py-4 sm:px-5" : "hidden"
              }
              id={contentId}
            >
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
