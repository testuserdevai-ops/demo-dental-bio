"use client";
import React, { useEffect } from "react";
import "../../globals.css";
import MapComponent from "./MapComponent";
import { useNavbar } from "@/app/contexts/NavbarContext";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

export default function WorkLocation({
  dentistry,
  serverLocations = [],
}: {
  dentistry: any;
  serverLocations?: any[];
}) {
  const { setNavItemState } = useNavbar();

  useEffect(() => {
    if (serverLocations.length) setNavItemState("Location", true);
  }, [serverLocations, setNavItemState]);

  return (
    <div id="location">
      {serverLocations.length > 0 ? (
        <div className="row section-wrapper-work">
          <h1 className="text-center text-[23px] md:text-[26px] font-semibold pb-8">
            {dentistry.location_title}
          </h1>

          {serverLocations.map((location, index) => (
            <div
              className="col-12 map-wrapper"
              key={`${location.location_id}-${index}`}
              id={`location-wrapper-${location.location_id}-${index}`}
            >
              {/* Google Maps Iframe with dynamic latitude and longitude */}
              <MapComponent
                id={`location-${location.location_id}-${index}`}
                latitude={location.locations.latitude}
                longitude={location.locations.longitude}
              />
              <div className="flex items-center justify-center map-button">
                {dentistry.booking_link_enabled && dentistry.booking_link && (
                  <TrackedLink
                    analytics={[
                      {
                        action: {
                          type: "booking_click",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                      {
                        action: {
                          type: "cta_click",
                          ctaType: "booking",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                    ]}
                    href={dentistry.booking_link || ""}
                    className="primary-btn map-primary-btn no-underline"
                  >
                    Book an appointment
                  </TrackedLink>
                )}
                {dentistry.contact_email && (
                  <TrackedLink
                    analytics={[
                      {
                        action: {
                          type: "email_click",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                      {
                        action: {
                          type: "cta_click",
                          ctaType: "email",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                    ]}
                    className="primary-btn map-primary-btn text-white text-decoration-none"
                    href={`mailto:${dentistry.contact_email || ""}`}
                  >
                    Email
                  </TrackedLink>
                )}
                {dentistry.phone && (
                  <TrackedLink
                    analytics={[
                      {
                        action: {
                          type: "phone_click",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                      {
                        action: {
                          type: "cta_click",
                          ctaType: "phone",
                          locationId: location.location_id,
                        },
                        section: "locations",
                        position: index + 1,
                      },
                    ]}
                    className="primary-btn map-primary-btn text-white text-decoration-none"
                    href={`tel:${dentistry.phone || ""}`}
                  >
                    {dentistry.phone}
                  </TrackedLink>
                )}
              </div>
              <p className="text-decoration-none text-center map-detail">
                {location.locations.business_name
                  ? `${location.locations.business_name}, ${location.locations.full_address}`
                  : location.locations.full_address}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center map-button">
          {dentistry.booking_link_enabled && dentistry.booking_link && (
            <TrackedLink
              analytics={[
                { action: { type: "booking_click" }, section: "locations" },
                {
                  action: { type: "cta_click", ctaType: "booking" },
                  section: "locations",
                },
              ]}
              href={dentistry.booking_link || ""}
              className="primary-btn map-primary-btn no-underline"
            >
              Book an appointment
            </TrackedLink>
          )}
          {dentistry.contact_email && (
            <TrackedLink
              analytics={[
                { action: { type: "email_click" }, section: "locations" },
                {
                  action: { type: "cta_click", ctaType: "email" },
                  section: "locations",
                },
              ]}
              className="primary-btn map-primary-btn text-white text-decoration-none"
              href={`mailto:${dentistry.contact_email || ""}`}
            >
              Email
            </TrackedLink>
          )}
          {dentistry.phone && (
            <TrackedLink
              analytics={[
                { action: { type: "phone_click" }, section: "locations" },
                {
                  action: { type: "cta_click", ctaType: "phone" },
                  section: "locations",
                },
              ]}
              className="primary-btn map-primary-btn text-white text-decoration-none"
              href={`tel:${dentistry.phone || ""}`}
            >
              {dentistry.phone}
            </TrackedLink>
          )}
        </div>
      )}
    </div>
  );
}
