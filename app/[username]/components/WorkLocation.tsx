"use client";
import Link from "next/link";
import React from "react";
import MapComponent from "./MapComponent";
import "../../globals.css";

export default function WorkLocation({
  dentistry,
  serverLocations,
}: {
  dentistry: any;
  serverLocations: any[];
}) {
  return (
    <div id="location">
      {(serverLocations.length > 0) ? (
        <div className="row section-wrapper-work">
          <h1 className="text-center text-[23px] md:text-[26px] font-semibold pb-8">{dentistry.location_title}</h1>

          {serverLocations?.map((location) =>
            <div className="col-12 map-wrapper" key={location.location_id} id={`id-${location.location_id}`}>
              {/* Google Maps Iframe with dynamic latitude and longitude */}
              <MapComponent
                id={location.location_id}
                latitude={location.locations.latitude}
                longitude={location.locations.longitude}
              />
              <div className="flex items-center justify-center map-button">
                {(dentistry.booking_link_enabled && dentistry.booking_link) && (
                  <Link
                    href={dentistry.booking_link || ""}
                    className="primary-btn map-primary-btn no-underline"
                  >
                    Book an appointment
                  </Link>
                )}
                {dentistry.contact_email && (
                  <Link
                    className="primary-btn map-primary-btn text-white text-decoration-none"
                    href={`mailto:${dentistry.contact_email || ""}`}
                  >
                    Email
                  </Link>
                )}
                {dentistry.phone && (
                  <Link
                    className="primary-btn map-primary-btn text-white text-decoration-none"
                    href={`tel:${dentistry.phone || ""}`}
                  >
                    {dentistry.phone}
                  </Link>
                )}
              </div>
              <p className="text-decoration-none text-center map-detail">
                {location.locations.business_name ? `${location.locations.business_name}, ${location.locations.full_address}` : location.locations.full_address}
              </p>
            </div>)}
        </div>) :
        <div className="flex items-center justify-center map-button">
          {(dentistry.booking_link_enabled && dentistry.booking_link) && (
            <Link
              href={dentistry.booking_link || ""}
              className="primary-btn map-primary-btn no-underline"
            >
              Book an appointment
            </Link>
          )}
          {dentistry.contact_email && (
            <Link
              className="primary-btn map-primary-btn text-white text-decoration-none"
              href={`mailto:${dentistry.contact_email || ""}`}
            >
              Email
            </Link>
          )}
          {dentistry.phone && (
            <Link
              className="primary-btn map-primary-btn text-white text-decoration-none"
              href={`tel:${dentistry.phone || ""}`}
            >
              {dentistry.phone}
            </Link>
          )}
        </div>}
    </div>
  );
}
