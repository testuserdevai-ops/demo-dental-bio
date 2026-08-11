"use client";

import {
  ArrowSquareOut,
  CalendarCheck,
  EnvelopeSimple,
  MapPin,
  NavigationArrow,
  Phone,
} from "@phosphor-icons/react";
import { useState } from "react";

import {
  PublicAction,
  TrackedLink,
} from "@/app/components/analytics/TrackedAction";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createExternalDirectionsUrl,
  getLocationLabel,
  getLocationSummary,
  type PublicLocationDetails,
} from "../_lib/location-map";
import MapComponent from "./MapComponent";

type LocationContactDetails = {
  bookingLink?: string | null;
  bookingEnabled?: boolean | null;
  email?: string | null;
  phone?: string | null;
};

type LocationMapModalProps = {
  locationId: string;
  location: PublicLocationDetails;
  position: number;
  contact: LocationContactDetails;
};

const actionClassName =
  "min-h-11 w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function ContactActions({
  contact,
  locationId,
  position,
}: Pick<LocationMapModalProps, "contact" | "locationId" | "position">) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {contact.bookingEnabled && contact.bookingLink && (
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
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            actionClassName,
          )}
          href={contact.bookingLink}
        >
          <CalendarCheck aria-hidden="true" size={19} />
          Book appointment
        </TrackedLink>
      )}
      {contact.phone && (
        <TrackedLink
          analytics={{
            action: { type: "phone_click", locationId },
            section: "locations",
            position,
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            actionClassName,
          )}
          href={`tel:${contact.phone}`}
        >
          <Phone aria-hidden="true" size={19} />
          Call practice
        </TrackedLink>
      )}
      {contact.email && (
        <TrackedLink
          analytics={{
            action: { type: "email_click", locationId },
            section: "locations",
            position,
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            actionClassName,
          )}
          href={`mailto:${contact.email}`}
        >
          <EnvelopeSimple aria-hidden="true" size={19} />
          Email practice
        </TrackedLink>
      )}
    </div>
  );
}

export default function LocationMapModal({
  locationId,
  location,
  position,
  contact,
}: LocationMapModalProps) {
  const [open, setOpen] = useState(false);
  const label = getLocationLabel(location);
  const summary = getLocationSummary(location);
  const directionsUrl = createExternalDirectionsUrl(location);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PublicAction
          analytics={{
            action: { type: "map_open", locationId },
            section: "locations",
            position,
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--profile-primary-action)] px-5 py-2.5 text-sm font-semibold text-[var(--profile-on-primary-action)] transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--profile-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--profile-surface)] motion-reduce:transition-none sm:w-auto"
        >
          <MapPin aria-hidden="true" size={19} weight="fill" />
          View map
        </PublicAction>
      </DialogTrigger>

      {open && (
        <DialogContent className="bottom-0 top-auto max-h-[92svh] w-full max-w-none translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-[var(--radius-xl)] bg-popover p-0 sm:bottom-auto sm:top-1/2 sm:max-w-2xl sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]">
          <div className="border-b border-border px-5 pb-4 pt-6 pr-16 sm:px-7 sm:pb-5 sm:pt-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Practice location
            </p>
            <DialogTitle className="text-xl leading-tight sm:text-2xl">
              {label}
            </DialogTitle>
            <DialogDescription className="mt-2 flex items-start gap-2 text-sm leading-6 sm:text-base">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 shrink-0"
                size={18}
              />
              <span>{summary}</span>
            </DialogDescription>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-7 sm:py-6">
            <MapComponent
              id={`location-${locationId}-${position}`}
              latitude={location.latitude}
              longitude={location.longitude}
              label={label}
            />

            {directionsUrl ? (
              <TrackedLink
                analytics={[
                  {
                    action: { type: "directions_click", locationId },
                    section: "locations",
                    position,
                  },
                  {
                    action: {
                      type: "cta_click",
                      ctaType: "directions",
                      locationId,
                    },
                    section: "locations",
                    position,
                  },
                ]}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "min-h-12 w-full",
                )}
                href={directionsUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <NavigationArrow aria-hidden="true" size={20} weight="fill" />
                Get directions
                <ArrowSquareOut aria-hidden="true" size={17} />
              </TrackedLink>
            ) : (
              <p
                className="rounded-[var(--radius-md)] border border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground"
                role="status"
              >
                Directions are not available for this location yet.
              </p>
            )}

            <ContactActions
              contact={contact}
              locationId={locationId}
              position={position}
            />

            <DialogClose asChild>
              <Button className="min-h-11 w-full" variant="ghost">
                Done
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export { ContactActions };
