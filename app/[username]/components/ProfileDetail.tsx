"use client";
import React, { useEffect, useState, useReducer } from "react";
import Navbar from "./Navbar";
import { createClient } from "@/utils/supabase/client";
import SocialLinks from "./SocialLinks";
import VerificationBadge from "@/app/components/VerificationBadge";
import IndividualProductList from "./IndividualProductList";

export default function ProfileDetail({
  username,
  position,
  gdc_no,
  qualification,
  title,
  description,
  dentistry_id,
  isVerified,
  isFreePlan,
  website_link,
  navState,
  serverLocations,
  serverSocials,
  serverProducts
}: {
  username: string;
  position: string;
  gdc_no: string;
  qualification: string;
  title: string;
  description: string;
  dentistry_id: string;
  isVerified: boolean;
  isFreePlan: boolean;
  website_link?: string;
  navState: NavBarStatusType;
  serverLocations: any[];
  serverSocials: any;
  serverProducts: IndividualProductType[]
}) {
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isShopOpen, toggleShopOpen] = useReducer((state: boolean) => !state, false);

  // Fetch the location based on the dentistry_id
  useEffect(() => {
    fetchProfilePicture(dentistry_id);
  }, [dentistry_id]);

  const fetchProfilePicture = async (dentistryId: string) => {
    try {
      const supabase = createClient();

      // Check if the profile picture exists in the storage
      const { data, error } = await supabase.storage
        .from("profile-pics")
        .list(dentistryId);

      if (error) throw error;

      if (data.length > 0) {
        const fileName = data[0].name;
        const { data: urlData } = await supabase.storage
          .from("profile-pics")
          .getPublicUrl(`${dentistryId}/${fileName}`);

        setProfilePicUrl(urlData?.publicUrl || "/placeholder.webp"); // Set the image URL or placeholder
      } else {
        setProfilePicUrl("/placeholder.webp"); // Use placeholder if no profile pic
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePicUrl("/placeholder.webp"); // Set placeholder on error
    }
  };

  const handleScroll = (target: string) => {
    const targetElement = document.querySelector(target);
    const offset = 120; // Adjust this value for your navbar height or desired gap
    const elementPosition = targetElement!.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth', // Enables smooth scrolling
    });
  }

  return (
    <>
      <div className="pt-4">
        <div className="flex justify-center mt-8 mb-4">
          <img
            src={profilePicUrl || "/placeholder.webp"}
            alt="user"
            className="w-28 aspect-square rounded-full"
          />
        </div>
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 pb-1">
            <h2 className="fw-medium user-name text-[23px] pb-0">{title}</h2>
            <div className="desktopview-header flex items-center">
              {isVerified && <VerificationBadge size={23} />}
            </div>
          </div>
          <div className="user-profile-header-detail">
            <div className="flex items-center gap-[6px] justify-center">
              <h5>@{username}</h5>
              {isVerified && <VerificationBadge />}
            </div>
          </div>
          <SocialLinks {...serverSocials} website_link={website_link} />
        </div>
      </div>

      <Navbar navState={navState} toggleShopOpen={toggleShopOpen} isFreePlan={isFreePlan} />

      {/* {productGroups.length > 0 && <div className={`flex flex-wrap pb-4 ${isShopOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
        {productGroups.map((group) => <ProductList key={group.id} products={group.datas!} />)}
      </div>} */}

      <div className={`flex-wrap ${serverProducts.length > 0 ? 'pb-4' : ''} ${isShopOpen ? 'animate-fade-in flex' : 'animate-fade-out'}`}>
        <IndividualProductList products={serverProducts} />
      </div>

      {/* "Based in" Section */}
      {serverLocations && serverLocations.length > 0 && (
        <div className="flex justify-center gap-4">
          <div className="flex justify-end items-center break-keep min-w-20 w-20">Based in</div>

          <div className="flex flex-row just flex-wrap gap-2">
            {serverLocations.map((location) => (
              <button
                key={location.location_id}
                className="nav-item nav-link border-0 profile-tab active !px-4 !py-1.5"
                onClick={() => handleScroll(`#id-${location.location_id}`)}
              >
                {location.locations.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="text-center flex flex-col gap-7">
        {description && <h5 className="text-xl">{description}</h5>}
        {(position !== "Other" || gdc_no || qualification) &&
          <div className="profile-address">
            {position !== "Other" && <div>{position}</div>}
            {gdc_no && <div>GDC No. {gdc_no}</div>}
            {qualification && <div>{qualification}</div>}
            {/* {location && location.full_address && location?.full_address} */}
          </div>}
      </div>
    </>
  );
}
