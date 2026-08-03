"use client";
import React from "react";
import GoogleMapAutocomplete from "./GoogleMapAutocomplete";
import SaveButton from "../components/SaveButton";
import AddressItem from "../components/AddressItem";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";

type LocationManagerProps = {
  saveLocation: (formData: FormData) => void;
  locations: any[];
};

const LocationListManager: React.FC<LocationManagerProps> = ({
  saveLocation,
  locations,
}) => {
  return (
    <>
      <div id="columns">
        <form action={saveLocation} className="mb-6 mt-10">
          <h2 className="text-lg font-semibold mb-3">Location</h2>
          <GoogleMapAutocomplete defaultAddress="" id="full_address" />
          <div className="w-full flex items-end justify-end mt-4">
            <FullRoundedButton type="submit" buttonType="primary">
              Save
            </FullRoundedButton>
          </div>
        </form>
      </div>
      {locations &&
        locations.map((location, index) => (
          <AddressItem {...location} key={location.id} />
        ))}
    </>
  );
};

export default LocationListManager;
