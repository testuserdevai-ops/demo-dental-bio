"use client";
import { loadGoogleMapsScript } from "@/utils/loadScript";
import { waitForGoogleAPI } from "@/utils/waitForGoogleAPI";
import React, { useEffect, useReducer, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type MapComponentProps = {
  id: string;
  latitude: number;
  longitude: number;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const MapComponent: React.FC<MapComponentProps> = ({
  id,
  latitude,
  longitude,
}: MapComponentProps) => {
  useEffect(() => {
    const initialize = async () => {
      try {
        if (typeof google === "undefined" || !google.maps) {
          console.error("Google Maps API is not available");
          return;
        }

        // Initialize Google Map with a unique container
        const mapElement = document.getElementById(id + "_map");
        if (mapElement) {
          const newMap = new google.maps.Map(mapElement as HTMLElement, {
            center: { lat: latitude, lng: longitude }, // Default center
            zoom: 17,
          });

          new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: newMap,
            title: "Marker", // Optional: title to display on hover
          });
        }
      } catch (error) {
        console.error("Error loading Google Maps script:", error);
      }
    };

    loadGoogleMapsScript(apiKey);

    waitForGoogleAPI()
      .then(() => {
        initialize();
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      // No custom listeners to clean up for now
    };
  }, [apiKey, id, latitude, longitude]);

  return (
    <>
      <div id={id + "_map"} className={`w-full h-[400px] mb-3`} />
    </>
  );
};

export default MapComponent;
