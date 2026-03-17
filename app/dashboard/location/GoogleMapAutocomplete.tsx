'use client';
import { loadGoogleMapsScript } from '@/utils/loadScript';
import { waitForGoogleAPI } from '@/utils/waitForGoogleAPI';
import { Check, MapPin, Spinner, Storefront } from '@phosphor-icons/react/dist/ssr';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import LabeledInput from '../components/LabeledInput';

type GoogleMapAutocompleteProps = {
  id: string;
  defaultAddress: string;
  cityname?: string;
  defaultBusinessName?: string;
  errors?: Record<string, string>;
  onErrorClear?: (field: string) => void;
};

type LocationDetails = {
  city_name: string | null;
  country_name: string | null;
  area_name: string | null;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

loadGoogleMapsScript(apiKey);

const GoogleMapAutocomplete: React.FC<GoogleMapAutocompleteProps> = ({
  id,
  defaultAddress,
  cityname,
  defaultBusinessName,
  errors = {},
  onErrorClear,
}: GoogleMapAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [inputAddress, setInputAddress] = useState(defaultAddress); // Track input changes
  const [businessName, setBusinessName] = useState(defaultBusinessName || "");
  const [country, setCountry] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [city, setCity] = useState<string>(cityname || "");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const status = useFormStatus();
  const hasStartedPending = useRef(false);

  useEffect(() => {
    console.log(city)
  }, [city])

  useEffect(() => {
    if (defaultAddress)
      setInputAddress(defaultAddress);
    if (cityname)
      setCity(cityname);
    if (defaultBusinessName !== undefined) {
      setBusinessName(defaultBusinessName);
    }
  }, [defaultAddress, cityname, defaultBusinessName])

  useEffect(() => {
    const initialize = async () => {
      try {
        if (typeof window === 'undefined')
          return;
        // Initialize Geocoder
        const geocoderInstance = new google.maps.Geocoder();
        setGeocoder(geocoderInstance);

        // Initialize Google Map with a unique container
        const mapElement = document.getElementById(id + "_map");
        if (mapElement) {
          const newMap = new google.maps.Map(mapElement, {
            center: { lat: 51.51, lng: -0.14 }, // Default center
            zoom: 8,
            mapId: `${id}_map`
          });
          setMap(newMap);

          const newMarker = new google.maps.Marker({
            position: { lat: 51.51, lng: -0.14 },
            map: newMap,
            title: 'Marker', // Optional: title to display on hover
          });
          setMarker(newMarker);
        }

        // Initialize Autocomplete
        if (inputRef.current) {
          const autoComplete = new google.maps.places.Autocomplete(inputRef.current);
          autoComplete.addListener('place_changed', () => {
            const place = autoComplete.getPlace();
            if (place.geometry?.location) {
              const location = place.geometry.location;
              setInputAddress(place.formatted_address || ''); // Update input state
              if (map) {
                map.setCenter(location);
                map.setZoom(18);

                if (marker)
                  marker.setPosition({ lat: location.lat(), lng: location.lng() });
              }
            }
          });

          setAutocomplete(autoComplete);
        }
      } catch (error) {
        console.error('Error loading Google Maps script:', error);
      }
    };

    // console.log(typeof google);
    waitForGoogleAPI()
      .then(() => {
        initialize();
      })
      .catch((error) => {
        console.error(error);
      })

    return () => {
      // Cleanup event listeners when the component unmounts
      if (autocomplete) {
        google.maps.event.clearListeners(autocomplete, 'place_changed');
      }
      // Cleanup debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [apiKey, typeof google]);

  // Handle manual input address changes
  useEffect(() => {
    if (geocoder && map && inputAddress) {
      geocoder.geocode({ address: inputAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry.location) {
          const location = results[0].geometry.location;
          setLatitude(location.lat());
          setLongitude(location.lng());

          const { city_name, country_name, area_name } = extractLocationDetails(results[0]);

          if (city_name !== city && city_name)
            setCity(city_name || "");
          setCountry(country_name || "");
          setArea(area_name || "");

          map.setCenter(location);
          map.setZoom(19);

          if (marker)
            marker.setPosition({ lat: location.lat(), lng: location.lng() });
        } else {
          // console.error('Geocode was not successful for the following reason:', status);
        }
      });
    }
  }, [inputAddress, geocoder, map]);

  useEffect(() => {
    if (status.pending && !hasStartedPending.current) {
      hasStartedPending.current = true;
    }

    if (!status.pending && hasStartedPending.current) {
      hasStartedPending.current = false;

      setInputAddress("");

      // Dispatch the custom event to trigger iframe refresh
      const event = new Event("iframeRefresh");
      window.dispatchEvent(event); // Fire the event to refresh the iframe
    }
  }, [status.pending]);

  // Function to extract city name from address components
  const extractLocationDetails = (
    place: google.maps.places.PlaceResult | google.maps.GeocoderResult
  ): LocationDetails => {
    const addressComponents = place.address_components;
    let city_name: string | null = null;
    let country_name: string | null = null;
    let area_name: string | null = null;

    if (addressComponents) {
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          city_name = component.long_name; // City name
        } else if (component.types.includes('postal_town')) {
          city_name = city_name || component.long_name; // Fallback for city name
        } else if (component.types.includes('administrative_area_level_1')) {
          city_name = city_name || component.long_name; // Fallback for city name (state/province-level)
        } else if (component.types.includes('administrative_area_level_2')) {
          area_name = component.long_name; // Area (e.g., county or district)
        } else if (component.types.includes('country')) {
          country_name = component.long_name; // Country name
        }
      }
    }

    return { city_name, country_name, area_name };
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (inputAddress === '') {
      setIsFocused(false);
    }
  };

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced geocoding function
  const debouncedGeocode = (address: string) => {
    if (geocoder && map && address) {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry.location) {
          const location = results[0].geometry.location;
          setLatitude(location.lat());
          setLongitude(location.lng());

          const { city_name, country_name, area_name } = extractLocationDetails(results[0]);

          setCity(city_name || "");
          setCountry(country_name || "");
          setArea(area_name || "");

          map.setCenter(location);
          map.setZoom(19);

          if (marker)
            marker.setPosition({ lat: location.lat(), lng: location.lng() });
        } else {
          // console.error('Geocode was not successful for the following reason:', status);
        }
      });
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAddress(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer (500ms delay)
    debounceTimerRef.current = setTimeout(() => {
      debouncedGeocode(value);
    }, 500);
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
          onChange={(e) => { setBusinessName(e.target.value); errors.business_name && onErrorClear?.("business_name"); }}
          error={errors.business_name}
        >
          <Storefront
            size={24}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
          />
        </LabeledInput>

        {/* Address Input */}
        <div>
          <div className={`relative rounded-[26px] bg-white pt-[20px] pb-2 px-4 h-[50px]${errors.address ? ' ring-1 ring-red-500' : ''}`}>
            <label
              htmlFor={id}
              className={`absolute top-[12px] text-gray-500 transition-all duration-100 ease-linear transform ${isFocused || inputAddress ? '-translate-y-[7px] text-xs' : 'scale-100'} pl-7`}
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
              onChange={(e) => { handleAddressChange(e); errors.address && onErrorClear?.("address"); }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          {errors.address && <p className="text-red-500 text-sm mt-1 pl-4">{errors.address}</p>}
        </div>

        <input type="hidden" name="business_name" value={businessName} />
        <input type="hidden" name="full_address" value={inputAddress} />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name={"city-" + id} value={city} />
        <div className={inputAddress ? "block" : "hidden"}>
          <LabeledInput
            label='City'
            name={"city-" + id}
            value={city}
            onChange={(e) => { setCity(e.target.value); errors.city && onErrorClear?.("city"); }}
            className="w-full"
            error={errors.city}
          />
        </div>
        <input type="hidden" name="area" value={area} />
        <input
          type="hidden"
          name="latitude"
          value={latitude ? latitude.toString() : ""}
        />
        <input
          type="hidden"
          name="longitude"
          value={longitude ? longitude.toString() : ""}
        />
      </div >

      {/* Map Container with unique ID */}
      <div id={id + "_map"} className={`w-full h-[400px] ${inputAddress ? "block" : "hidden"}`} />
    </>
  );
};

export default GoogleMapAutocomplete;
