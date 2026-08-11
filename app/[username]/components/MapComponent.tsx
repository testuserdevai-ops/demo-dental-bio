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
        className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-border bg-muted px-6 py-8 text-center"
        data-map-status="unavailable"
        role="status"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-background text-foreground">
          <MapPin aria-hidden="true" size={24} weight="fill" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            Map preview unavailable
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can still open this address in your maps app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted">
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
          className="absolute inset-0 flex items-center justify-center bg-muted text-sm font-medium text-muted-foreground"
          role="status"
        >
          Loading map…
        </div>
      )}
    </div>
  );
}
