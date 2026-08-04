"use client";
import React, { useEffect, useState } from "react";
import AddressItem from "../components/AddressItem";
import { usePreview } from "@/app/contexts/PreviewContext";
import AddLocation from "./AddLocation";
import Link from "next/link";
import IntroText from "@/app/components/IntroText";
import { apiClient } from "@/services/apiClient";
import { useDashboardScope } from "@/app/contexts/DashboardScopeContext";

type ManageLocationsProps = {
  locations: any[] | null;
  location_title: string;
  updateLocation: (locationData: LocationType, location_id: string) => void;
  proAvailable: boolean;
};

const ManageLocations: React.FC<ManageLocationsProps> = ({
  locations,
  location_title,
  updateLocation,
  proAvailable = false,
}) => {
  const [existingLocations, setExistingLocations] = useState<any[] | null>(
    null,
  );
  const { triggerReload } = usePreview();
  const scope = useDashboardScope();

  useEffect(() => {
    setExistingLocations(locations!);
  }, [locations]);

  const addAddress = (locationData: LocationType) => {
    setExistingLocations((prevState) => {
      if (!prevState) return [locationData];
      return [...prevState, locationData];
    });
  };

  const deleteLocation = async (location_id: string) => {
    setExistingLocations((prevState) => {
      if (!prevState) return null;

      const remainLocations = prevState.filter(
        (location) => location.location_id !== location_id,
      );
      return remainLocations;
    });

    try {
      await apiClient.delete("/api/location", { location_id });
    } catch (error: any) {
      console.log("Failed to delete", error.message);
    }

    triggerReload();
  };

  return (
    <>
      <AddLocation onAddressAdd={addAddress} location_title={location_title} />
      {scope.canManageSubscription && !proAvailable && (
        <IntroText>
          <Link
            href="/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center items-center px-[20px] py-[10px] font-bold text-white rounded-[26px] bg-primary-1 hover:bg-deep-purple transition-all ease-in-out no-underline cursor-pointer"
          >
            Upgrade your membership to add multiple locations
          </Link>
        </IntroText>
      )}
      {existingLocations?.map((location, index) => (
        <AddressItem
          {...location}
          key={location.location_id}
          onAddressChange={updateLocation}
          onDelete={deleteLocation}
        />
      ))}
    </>
  );
};

export default ManageLocations;
