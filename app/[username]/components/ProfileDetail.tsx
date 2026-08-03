"use client";
import React, { useState, useReducer } from "react";
import Navbar from "./Navbar";
import SocialLinks from "./SocialLinks";
import VerificationBadge from "@/app/components/VerificationBadge";
import IndividualProductList from "./IndividualProductList";
import { TrackedButton } from "@/features/analytics/tracked-action";

export default function ProfileDetail({
  username,
  position,
  gdc_no,
  qualification,
  title,
  image_url,
  description,
  dentistry_id,
  isVerified,
  isFreePlan,
  website_link,
  navState,
  serverLocations,
  serverSocials,
  serverProducts,
}: {
  username: string;
  position: string;
  gdc_no: string;
  qualification: string;
  title: string;
  image_url: string;
  description: string;
  dentistry_id: string;
  isVerified: boolean;
  isFreePlan: boolean;
  website_link?: string;
  navState: NavBarStatusType;
  serverLocations: any[];
  serverSocials: any;
  serverProducts: IndividualProductType[];
}) {
  const [isShopOpen, toggleShopOpen] = useReducer(
    (state: boolean) => !state,
    false,
  );
  const [didToggle, setDidToggle] = useState(false);

  const handleToggle = () => {
    setDidToggle(true);
    toggleShopOpen();
  };

  const handleScroll = (target: string) => {
    const targetElement = document.querySelector(target);
    const offset = 120; // Adjust this value for your navbar height or desired gap
    const elementPosition =
      targetElement!.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth", // Enables smooth scrolling
    });
  };

  return (
    <>
      <div className="pt-4">
        <div className="flex justify-center mt-8 mb-4">
          <img
            src={image_url || "/placeholder.webp"}
            alt={title}
            className="w-28 aspect-square rounded-full"
          />
        </div>
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 pb-1">
            <h1 className="fw-medium user-name text-[23px] pb-0">{title}</h1>
            {isVerified && (
              <div className="desktopview-header flex items-center">
                <VerificationBadge size={23} />
              </div>
            )}
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

      <Navbar
        navState={navState}
        toggleShopOpen={handleToggle}
        isFreePlan={isFreePlan}
      />

      {/* {productGroups.length > 0 && <div className={`flex flex-wrap pb-4 ${isShopOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
        {productGroups.map((group) => <ProductList key={group.id} products={group.datas!} />)}
      </div>} */}

      <div
        className={`
          flex-wrap 
          ${serverProducts.length > 0 ? "pb-4" : ""}
          ${
            didToggle
              ? isShopOpen
                ? "animate-fade-in flex"
                : "animate-fade-out"
              : isShopOpen
                ? "flex" // initial open = shown without animation
                : "hidden" // initial closed = hidden without animation
          }
        `}
      >
        <IndividualProductList products={serverProducts} />
      </div>

      {/* "Based in" Section */}
      {serverLocations && serverLocations.length > 0 && (
        <div className="flex justify-center gap-4">
          <div className="flex justify-end items-center break-keep min-w-20 w-20">
            Based in
          </div>

          <div className="flex flex-row just flex-wrap gap-2">
            {serverLocations.map((location, index) => (
              <TrackedButton
                analytics={{
                  action: {
                    type: "navigation_click",
                    destination: "location",
                    locationId: location.location_id,
                  },
                  section: "profile",
                  position: index + 1,
                }}
                key={location.location_id}
                className="nav-item nav-link border-0 profile-tab active !px-4 !py-1.5"
                onClick={() =>
                  handleScroll(
                    `#location-wrapper-${location.location_id}-${index}`,
                  )
                }
              >
                {location.locations.city}
              </TrackedButton>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="text-center flex flex-col gap-7">
        {description && <h5 className="text-xl">{description}</h5>}
        {(position !== "Other" || gdc_no || qualification) && (
          <div className="profile-address">
            {position !== "Other" && <div>{position}</div>}
            {gdc_no && <div>GDC No. {gdc_no}</div>}
            {qualification && <div>{qualification}</div>}
            {/* {location && location.full_address && location?.full_address} */}
          </div>
        )}
      </div>
    </>
  );
}
