"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import "../../globals.css";
import MapComponent from "./MapComponent";
import { useNavbar } from "@/app/contexts/NavbarContext";

export default function WorkLocation({
  dentistry,
}: {
  dentistry: any;
}) {
  const [locations, setLocations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { setNavItemState } = useNavbar();

  useEffect(() => {
    async function fetchLocation() {
      const supabase = createClient();

      // Fetch location based on dentistry_id
      const { data: dentistryLocations, error: dentistryLocationError } = await supabase
        .from("dentistry_locations")
        .select(`
          location_id,
          locations (country, city, area, latitude, longitude, full_address, business_name)
        `)
        .eq("dentistry_id", dentistry.dentistry_id) // Assuming one location per dentistry

      if (dentistryLocationError) {
        console.error("Error fetching location:", dentistryLocationError);
        setLoading(false);
        return;
      }

      if (dentistryLocations.length)
        setNavItemState('Location', true);

      setLocations(dentistryLocations); // Store the location data
      setLoading(false);
    }

    fetchLocation();
  }, [dentistry.dentistry_id]);

  // Show loading message while fetching location data
  if (loading) {
    return <h2 className="section-heading-work">Loading location...</h2>;
  }

  // If no location data is available, show a placeholder message
  if (!location) {
    return <h2 className="section-heading-work p-0"></h2>;
  }

  return (
    <div id="location">
      {(locations && locations.length > 0) ? (
        <div className="row section-wrapper-work">
          <h1 className="text-center text-[23px] md:text-[26px] font-semibold pb-8">{dentistry.location_title}</h1>

          {locations?.map((location) =>
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
