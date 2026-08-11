"use client";

import {
  Buildings,
  CalendarCheck,
  EnvelopeSimple,
  Phone,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  PublicAction,
  TrackedLink,
} from "@/app/components/analytics/TrackedAction";
import { useTrackedAction } from "@/app/contexts/AnalyticsContext";
import type {
  LocationRouterCopy,
  LocationRouterOption,
} from "../_lib/location-router-template";
import LocationMapModal from "../components/LocationMapModal";

type LocationRouterContact = {
  bookingHref: string | null;
  emailHref: string | null;
  phoneHref: string | null;
};

type LocationRouterExperienceProps = {
  contact: LocationRouterContact;
  copy: LocationRouterCopy;
  defaultOptionId: string | null;
  options: LocationRouterOption[];
  recoveredDefault: boolean;
};

function LocationActionLinks({
  contact,
  option,
}: {
  contact: LocationRouterContact;
  option: LocationRouterOption;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {contact.bookingHref ? (
        <TrackedLink
          analytics={[
            {
              section: "locations",
              position: option.position,
              action: { type: "booking_click", locationId: option.id },
            },
            {
              section: "locations",
              position: option.position,
              action: {
                type: "cta_click",
                ctaType: "booking",
                locationId: option.id,
              },
            },
          ]}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-5 py-3 text-center text-sm font-bold text-[var(--profile-on-primary-action)] no-underline transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--profile-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none sm:col-span-2"
          href={contact.bookingHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <CalendarCheck aria-hidden="true" size={20} weight="bold" />
          Book at {option.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedLink>
      ) : null}

      {contact.phoneHref ? (
        <TrackedLink
          analytics={[
            {
              section: "locations",
              position: option.position,
              action: { type: "phone_click", locationId: option.id },
            },
            {
              section: "locations",
              position: option.position,
              action: {
                type: "cta_click",
                ctaType: "phone",
                locationId: option.id,
              },
            },
          ]}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={contact.phoneHref}
        >
          <Phone aria-hidden="true" size={18} />
          Call this practice
        </TrackedLink>
      ) : null}

      {contact.emailHref ? (
        <TrackedLink
          analytics={[
            {
              section: "locations",
              position: option.position,
              action: { type: "email_click", locationId: option.id },
            },
            {
              section: "locations",
              position: option.position,
              action: {
                type: "cta_click",
                ctaType: "email",
                locationId: option.id,
              },
            },
          ]}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={contact.emailHref}
        >
          <EnvelopeSimple aria-hidden="true" size={18} />
          Email this practice
        </TrackedLink>
      ) : null}
    </div>
  );
}

export default function LocationRouterExperience({
  contact,
  copy,
  defaultOptionId,
  options,
  recoveredDefault,
}: LocationRouterExperienceProps) {
  const [selectedId, setSelectedId] = useState(defaultOptionId);
  const track = useTrackedAction();
  const selectedOption = useMemo(
    () => options.find(({ id }) => id === selectedId) ?? options[0] ?? null,
    [options, selectedId],
  );

  if (!selectedOption) {
    return (
      <section
        aria-labelledby="location-router-empty-title"
        className="rounded-[var(--radius-xl)] border border-border bg-card p-6 text-center shadow-sm"
      >
        <Buildings
          aria-hidden="true"
          className="mx-auto text-muted-foreground"
          size={34}
        />
        <h2
          className="mt-3 text-xl font-bold text-card-foreground"
          id="location-router-empty-title"
        >
          Practice details are being prepared
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Contact the practice directly while location options are updated.
        </p>
      </section>
    );
  }

  const selectOption = (id: string) => {
    const option = options.find((candidate) => candidate.id === id);
    if (!option || option.id === selectedOption.id) return;
    setSelectedId(option.id);
    track({
      section: "locations",
      position: option.position,
      action: { type: "location_select", locationId: option.id },
    });
  };

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="location-router-selector-title"
        className="space-y-3"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.eyebrow}
          </p>
          <h2
            className="mt-1 text-2xl font-bold text-foreground"
            id="location-router-selector-title"
          >
            Find the right place for your visit
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {copy.introduction}
          </p>
        </div>
        <label
          className="block text-sm font-semibold text-foreground"
          htmlFor="location-router-selector"
        >
          {copy.selectorLabel}
        </label>
        <select
          className="min-h-12 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-base font-semibold text-card-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          id="location-router-selector"
          onChange={(event) => selectOption(event.currentTarget.value)}
          value={selectedOption.id}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p aria-live="polite" className="sr-only">
          Showing details for {selectedOption.label}.
        </p>
        {recoveredDefault ? (
          <p className="text-sm text-muted-foreground" role="status">
            The previously selected location is unavailable, so the first
            visible practice is shown.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="location-router-selected-title"
        className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--elevation-card)]"
        id="location-router-selected"
      >
        <div className="border-b border-border bg-muted/50 px-5 py-5 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Your selected practice
          </p>
          <h2
            className="mt-1 text-2xl font-bold text-card-foreground"
            id="location-router-selected-title"
          >
            {selectedOption.label}
          </h2>
          {selectedOption.summary ? (
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {selectedOption.summary}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Address details are being confirmed.
            </p>
          )}
        </div>
        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-[var(--radius-md)] bg-muted px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Opening times
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Contact the practice for today&apos;s opening and appointment
              availability.
            </p>
          </div>
          <LocationMapModal
            contact={{
              bookingEnabled: Boolean(contact.bookingHref),
              bookingLink: contact.bookingHref,
              email: contact.emailHref?.replace(/^mailto:/, "") ?? null,
              phone: contact.phoneHref?.replace(/^tel:/, "") ?? null,
            }}
            location={selectedOption.location}
            locationId={selectedOption.id}
            position={selectedOption.position}
          />
          <LocationActionLinks contact={contact} option={selectedOption} />
        </div>
      </section>

      {options.length > 1 ? (
        <section
          aria-labelledby="location-router-other-title"
          className="space-y-3"
        >
          <h2
            className="text-lg font-bold text-foreground"
            id="location-router-other-title"
          >
            Other practices
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {options
              .filter(({ id }) => id !== selectedOption.id)
              .map((option) => (
                <PublicAction
                  analytics={{
                    section: "locations",
                    position: option.position,
                    action: { type: "location_select", locationId: option.id },
                  }}
                  aria-controls="location-router-selected"
                  className="min-h-16 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
                  key={option.id}
                  onClick={() => setSelectedId(option.id)}
                >
                  <span className="block font-bold">{option.label}</span>
                  {option.summary ? (
                    <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">
                      {option.summary}
                    </span>
                  ) : null}
                </PublicAction>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
