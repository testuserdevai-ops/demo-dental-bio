"use client";

import { loadGoogleMapsScript } from "@/utils/loadScript";
import { useEffect } from "react";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const MapLoader = () => {
  useEffect(() => {
    if (!apiKey) return;

    void loadGoogleMapsScript(apiKey).catch((error) => {
      console.error("Error loading Google Maps script:", error);
    });
  }, []);

  return <div className="hidden">Google Map Loader</div>;
};

export default MapLoader;
