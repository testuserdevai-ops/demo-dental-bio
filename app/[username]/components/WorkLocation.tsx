"use client";

import {
  CalendarCheck,
  EnvelopeSimple,
  MapPin,
  Phone,
} from "@phosphor-icons/react";
import { useEffect } from "react";

import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { useNavbar } from "@/app/contexts/NavbarContext";
import type { PublicLocation } from "../_lib/public-profile";
import { getLocationLabel, getLocationSummary } from "../_lib/location-map";
import LocationMapModal from "./LocationMapModal";
import LocationImage from "./LocationImage";

type DentistryContact = {
  booking_link: string | null;
  booking_link_enabled?: boolean | null;
  contact_email: string | null;
  location_title: string | null;
  phone: string | null;
  [key: string]: unknown;
};

type RenderableLocation = PublicLocation & {
  location_id: string;
  locations: NonNullable<PublicLocation["locations"]>;
};

function isRenderableLocation(
  location: PublicLocation,
): location is RenderableLocation {
  return Boolean(location.location_id && location.locations);
}

function LocationContactLinks({
  dentistry,
  locationId,
  position,
}: {
  dentistry: DentistryContact;
  locationId?: string;
  position?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {dentistry.booking_link_enabled && dentistry.booking_link && (
        <TrackedLink
          analytics={[
            {
              action: { type: "booking_click", locationId },
              section: "locations",
              position,
            },
            {
              action: { type: "cta_click", ctaType: "booking", locationId },
              section: "locations",
              position,
            },
          ]}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-[var(--profile-link)] underline-offset-4 hover:text-[var(--profile-link-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--profile-focus)]"
          href={dentistry.booking_link}
        >
          <CalendarCheck aria-hidden="true" size={18} />
          Book
        </TrackedLink>
      )}
      {dentistry.phone && (
        <TrackedLink
          analytics={[
            {
              action: { type: "phone_click", locationId },
              section: "locations",
              position,
            },
            {
              action: { type: "cta_click", ctaType: "phone", locationId },
              section: "locations",
              position,
            },
          ]}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-[var(--profile-link)] underline-offset-4 hover:text-[var(--profile-link-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--profile-focus)]"
          href={`tel:${dentistry.phone}`}
        >
          <Phone aria-hidden="true" size={18} />
          Call
        </TrackedLink>
      )}
      {dentistry.contact_email && (
        <TrackedLink
          analytics={[
            {
              action: { type: "email_click", locationId },
              section: "locations",
              position,
            },
            {
              action: { type: "cta_click", ctaType: "email", locationId },
              section: "locations",
              position,
            },
          ]}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-[var(--profile-link)] underline-offset-4 hover:text-[var(--profile-link-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--profile-focus)]"
          href={`mailto:${dentistry.contact_email}`}
        >
          <EnvelopeSimple aria-hidden="true" size={18} />
          Email
        </TrackedLink>
      )}
    </div>
  );
}

export default function WorkLocation({
  dentistry,
  serverLocations = [],
}: {
  dentistry: DentistryContact;
  serverLocations?: PublicLocation[];
}) {
  const { setNavItemState } = useNavbar();
  const locations = serverLocations
    .map((location, sourceIndex) => ({ location, sourceIndex }))
    .filter(
      (item): item is { location: RenderableLocation; sourceIndex: number } =>
        isRenderableLocation(item.location),
    );

  useEffect(() => {
    if (locations.length) setNavItemState("Location", true);
  }, [locations.length, setNavItemState]);

  if (!locations.length) {
    return (
      <div className="flex items-center justify-center">
        <LocationContactLinks dentistry={dentistry} />
      </div>
    );
  }

  return (
    <section className="section-wrapper-work" id="location">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 text-center sm:mb-9">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--profile-text-muted)]">
            In person
          </p>
          <h2 className="text-[23px] font-semibold leading-tight text-[var(--profile-text)] md:text-[26px]">
            {dentistry.location_title || "Visit the practice"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--profile-text-muted)]">
            Choose a location to view the map, get directions, or contact the
            practice.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5">
          {locations.map(({ location, sourceIndex }, visibleIndex) => {
            const position = visibleIndex + 1;
            const label = getLocationLabel(location.locations);
            const summary = getLocationSummary(location.locations);

            return (
              <article
                className="rounded-[24px] border border-[var(--profile-border-subtle)] bg-[var(--profile-surface)] p-4 shadow-sm sm:p-5"
                id={`location-wrapper-${location.location_id}-${sourceIndex}`}
                key={location.location_id}
              >
                <LocationImage
                  className="mb-4 w-full"
                  location={location.locations}
                  sizes="(min-width: 768px) 768px, calc(100vw - 64px)"
                />
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--profile-muted)] text-[var(--profile-on-muted)]">
                    <MapPin aria-hidden="true" size={22} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-6 text-[var(--profile-text)] sm:text-lg">
                      {label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--profile-text-muted)]">
                      {summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-[var(--profile-border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <LocationMapModal
                    contact={{
                      bookingEnabled: dentistry.booking_link_enabled,
                      bookingLink: dentistry.booking_link,
                      email: dentistry.contact_email,
                      phone: dentistry.phone,
                    }}
                    location={location.locations}
                    locationId={location.location_id}
                    position={position}
                  />
                  <LocationContactLinks
                    dentistry={dentistry}
                    locationId={location.location_id}
                    position={position}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
