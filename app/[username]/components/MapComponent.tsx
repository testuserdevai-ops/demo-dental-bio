"use client";

import { MapPin } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { loadGoogleMapsScript } from "@/utils/loadScript";

type MapComponentProps = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
  apiKey?: string;
};

type MapStatus = "loading" | "ready" | "unavailable";

function getValidCoordinates(
  latitude: number | null,
  longitude: number | null,
): { latitude: number; longitude: number } | null {
  const valid =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;

  return valid ? { latitude, longitude } : null;
}

export default function MapComponent({
  id,
  latitude,
  longitude,
  label,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
}: MapComponentProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const coordinates = getValidCoordinates(latitude, longitude);
  const [status, setStatus] = useState<MapStatus>(
    apiKey && coordinates ? "loading" : "unavailable",
  );

  useEffect(() => {
    const validCoordinates = getValidCoordinates(latitude, longitude);
    if (!apiKey || !validCoordinates) {
      return;
    }

    let cancelled = false;
    let marker: google.maps.Marker | undefined;
    void loadGoogleMapsScript(apiKey)
      .then(() => {
        if (
          cancelled ||
          !mapElementRef.current ||
          typeof google === "undefined" ||
          !google.maps
        ) {
          if (!cancelled) setStatus("unavailable");
          return;
        }

        const map = new google.maps.Map(mapElementRef.current, {
          center: {
            lat: validCoordinates.latitude,
            lng: validCoordinates.longitude,
          },
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: 16,
        });
        marker = new google.maps.Marker({
          map,
          position: {
            lat: validCoordinates.latitude,
            lng: validCoordinates.longitude,
          },
          title: label,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
      marker?.setMap(null);
    };
  }, [apiKey, label, latitude, longitude]);

  if (status === "unavailable") {
    return (
      <div
        className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--profile-border-subtle)] bg-[var(--profile-muted)] px-6 py-8 text-center text-[var(--profile-on-muted)]"
        data-map-status="unavailable"
        role="status"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--profile-secondary-action)] text-[var(--profile-on-secondary-action)]">
          <MapPin aria-hidden="true" size={24} weight="fill" />
        </span>
        <div>
          <p className="font-semibold text-[var(--profile-text)]">
            Map preview unavailable
          </p>
          <p className="mt-1 text-sm text-[var(--profile-text-muted)]">
            You can still open this address in your maps app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--profile-border-subtle)] bg-[var(--profile-muted)]">
      <div
        ref={mapElementRef}
        id={`${id}-map`}
        aria-label={`Map showing ${label}`}
        className="h-56 w-full sm:h-64"
        data-map-status={status}
        role="img"
      />
      {status === "loading" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[var(--profile-muted)] text-sm font-medium text-[var(--profile-text-muted)]"
          role="status"
        >
          Loading map…
        </div>
      )}
    </div>
  );
}
