"use client";
import { loadGoogleMapsScript } from "@/utils/loadScript";
import { waitForGoogleAPI } from "@/utils/waitForGoogleAPI";
import {
  Check,
  MapPin,
  Spinner,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import React, { useCallback, useEffect, useRef, useState } from "react";
import LabeledInput from "../components/LabeledInput";

type GoogleMapAutocompleteProps = {
  id: string;
  defaultAddress: string;
  cityname?: string;
  defaultBusinessName?: string;
  defaultCountry?: string;
  defaultArea?: string;
  defaultLatitude?: number;
  defaultLongitude?: number;
  errors?: Record<string, string>;
  onErrorClear?: (field: string) => void;
};

type LocationDetails = {
  city_name: string | null;
  country_name: string | null;
  area_name: string | null;
};

type SourceKeyedDraft<T> = {
  sourceKey: string;
  value: T;
};

function useSourceKeyedDraft<T>(sourceKey: string, source: T) {
  const [draft, setDraft] = useState<SourceKeyedDraft<T>>({
    sourceKey,
    value: source,
  });
  const sourceRef = useRef({ sourceKey, source });
  const value = draft.sourceKey === sourceKey ? draft.value : source;
  useEffect(() => {
    sourceRef.current = { sourceKey, source };
  }, [source, sourceKey]);
  const setValue = useCallback((nextValue: React.SetStateAction<T>) => {
    setDraft((current) => {
      const latestSource = sourceRef.current;
      const currentValue =
        current.sourceKey === latestSource.sourceKey
          ? current.value
          : latestSource.source;
      return {
        sourceKey: latestSource.sourceKey,
        value:
          typeof nextValue === "function"
            ? (nextValue as (value: T) => T)(currentValue)
            : nextValue,
      };
    });
  }, []);

  return [value, setValue] as const;
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

const extractLocationDetails = (
  place: google.maps.places.PlaceResult | google.maps.GeocoderResult,
): LocationDetails => {
  const addressComponents = place.address_components;
  let city_name: string | null = null;
  let country_name: string | null = null;
  let area_name: string | null = null;

  if (addressComponents) {
    for (const component of addressComponents) {
      if (component.types.includes("locality")) {
        city_name = component.long_name;
      } else if (component.types.includes("postal_town")) {
        city_name = city_name || component.long_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        city_name = city_name || component.long_name;
      } else if (component.types.includes("administrative_area_level_2")) {
        area_name = component.long_name;
      } else if (component.types.includes("country")) {
        country_name = component.long_name;
      }
    }
  }

  return { city_name, country_name, area_name };
};

const GoogleMapAutocomplete: React.FC<GoogleMapAutocompleteProps> = ({
  id,
  defaultAddress,
  cityname,
  defaultBusinessName,
  defaultCountry,
  defaultArea,
  defaultLatitude,
  defaultLongitude,
  errors = {},
  onErrorClear,
}: GoogleMapAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [inputAddress, setInputAddress] = useSourceKeyedDraft(
    defaultAddress,
    defaultAddress,
  );
  const [businessName, setBusinessName] = useSourceKeyedDraft(
    defaultBusinessName ?? "",
    defaultBusinessName ?? "",
  );
  const [country, setCountry] = useSourceKeyedDraft(
    defaultCountry ?? "",
    defaultCountry ?? "",
  );
  const [area, setArea] = useSourceKeyedDraft(
    defaultArea ?? "",
    defaultArea ?? "",
  );
  const [city, setCity] = useSourceKeyedDraft(cityname ?? "", cityname ?? "");
  const [latitude, setLatitude] = useSourceKeyedDraft(
    String(defaultLatitude ?? ""),
    defaultLatitude ?? null,
  );
  const [longitude, setLongitude] = useSourceKeyedDraft(
    String(defaultLongitude ?? ""),
    defaultLongitude ?? null,
  );
  const [pendingGeocodeAddress, setPendingGeocodeAddress] = useState<
    string | null
  >(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (typeof window === "undefined" || !apiKey) return;

        await loadGoogleMapsScript(apiKey);
        await waitForGoogleAPI();

        // Initialize Geocoder
        const geocoderInstance = new google.maps.Geocoder();
        setGeocoder(geocoderInstance);

        // Initialize Google Map with a unique container
        const mapElement = document.getElementById(id + "_map");
        if (mapElement) {
          const newMap = new google.maps.Map(mapElement, {
            center: { lat: 51.51, lng: -0.14 }, // Default center
            zoom: 8,
            mapId: `${id}_map`,
          });
          mapRef.current = newMap;

          const newMarker = new google.maps.Marker({
            position: { lat: 51.51, lng: -0.14 },
            map: newMap,
            title: "Marker", // Optional: title to display on hover
          });
          markerRef.current = newMarker;
        }

        // Initialize Autocomplete
        if (inputRef.current) {
          const autoComplete = new google.maps.places.Autocomplete(
            inputRef.current,
          );
          autoComplete.addListener("place_changed", () => {
            const place = autoComplete.getPlace();
            if (place.geometry?.location) {
              const location = place.geometry.location;
              setInputAddress(place.formatted_address || ""); // Update input state
              if (mapRef.current) {
                mapRef.current.setCenter(location);
                mapRef.current.setZoom(18);

                if (markerRef.current)
                  markerRef.current.setPosition({
                    lat: location.lat(),
                    lng: location.lng(),
                  });
              }
            }
          });

          autocompleteRef.current = autoComplete;
        }
      } catch (error) {
        console.error("Error loading Google Maps script:", error);
      }
    };

    void initialize();

    return () => {
      // Cleanup event listeners when the component unmounts
      if (autocompleteRef.current) {
        google.maps.event.clearListeners(
          autocompleteRef.current,
          "place_changed",
        );
      }
    };
  }, [id, setInputAddress]);

  // Handle manual input address changes
  useEffect(() => {
    if (geocoder && mapRef.current && inputAddress) {
      geocoder.geocode({ address: inputAddress }, (results, status) => {
        if (status === "OK" && results && results[0]?.geometry.location) {
          const location = results[0].geometry.location;
          setLatitude(location.lat());
          setLongitude(location.lng());

          const { city_name, country_name, area_name } = extractLocationDetails(
            results[0],
          );

          if (city_name) {
            setCity((currentCity) =>
              currentCity === city_name ? currentCity : city_name,
            );
          }
          setCountry(country_name || "");
          setArea(area_name || "");

          mapRef.current?.setCenter(location);
          mapRef.current?.setZoom(19);

          markerRef.current?.setPosition({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          // console.error('Geocode was not successful for the following reason:', status);
        }
      });
    }
  }, [
    geocoder,
    inputAddress,
    setArea,
    setCity,
    setCountry,
    setLatitude,
    setLongitude,
  ]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (inputAddress === "") {
      setIsFocused(false);
    }
  };

  const geocodeAddress = useCallback(
    (address: string) => {
      if (geocoder && mapRef.current && address) {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0]?.geometry.location) {
            const location = results[0].geometry.location;
            setLatitude(location.lat());
            setLongitude(location.lng());

            const { city_name, country_name, area_name } =
              extractLocationDetails(results[0]);

            setCity(city_name || "");
            setCountry(country_name || "");
            setArea(area_name || "");

            mapRef.current?.setCenter(location);
            mapRef.current?.setZoom(19);

            markerRef.current?.setPosition({
              lat: location.lat(),
              lng: location.lng(),
            });
          } else {
            // console.error('Geocode was not successful for the following reason:', status);
          }
        });
      }
    },
    [geocoder, setArea, setCity, setCountry, setLatitude, setLongitude],
  );

  useEffect(() => {
    if (!pendingGeocodeAddress) return;

    const timer = window.setTimeout(() => {
      geocodeAddress(pendingGeocodeAddress);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [geocodeAddress, pendingGeocodeAddress]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAddress(value);

    setPendingGeocodeAddress(value);
  };

  return (
    <>
      <div className="flex-col-gap w-full mb-3">
        {/* Business Name Input */}
        <LabeledInput
          label="Business Name"
          name={`business-${id}`}
          className="w-full text-base pl-7"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            errors.business_name && onErrorClear?.("business_name");
          }}
          error={errors.business_name}
        >
          <Storefront
            size={24}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
          />
        </LabeledInput>

        {/* Address Input */}
        <div>
          <div
            className={`relative rounded-[26px] bg-white pt-[20px] pb-2 px-4 h-[50px]${errors.address ? " ring-1 ring-red-500" : ""}`}
          >
            <label
              htmlFor={id}
              className={`absolute top-[12px] text-gray-500 transition-all duration-100 ease-linear transform ${isFocused || inputAddress ? "-translate-y-[7px] text-xs" : "scale-100"} pl-7`}
            >
              Enter your address
            </label>
            <MapPin
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
            <input
              ref={inputRef}
              type="text"
              id={id}
              name={id}
              className="w-full pl-7 text-base placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal"
              placeholder=""
              value={inputAddress}
              onChange={(e) => {
                handleAddressChange(e);
                errors.address && onErrorClear?.("address");
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          {errors.address && (
            <p className="text-red-500 text-sm mt-1 pl-4">{errors.address}</p>
          )}
        </div>

        <input type="hidden" name="business_name" value={businessName} />
        <input type="hidden" name="full_address" value={inputAddress} />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name={"city-" + id} value={city} />
        <div className={inputAddress ? "block" : "hidden"}>
          <LabeledInput
            label="City"
            name={"city-" + id}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              errors.city && onErrorClear?.("city");
            }}
            className="w-full"
            error={errors.city}
          />
        </div>
        <input type="hidden" name="area" value={area} />
        <input
          type="hidden"
          name="latitude"
          value={latitude !== null ? latitude.toString() : ""}
        />
        <input
          type="hidden"
          name="longitude"
          value={longitude !== null ? longitude.toString() : ""}
        />
      </div>

      {/* Map Container with unique ID */}
      <div
        id={id + "_map"}
        className={`w-full h-[400px] ${inputAddress ? "block" : "hidden"}`}
      />
    </>
  );
};

export default GoogleMapAutocomplete;
