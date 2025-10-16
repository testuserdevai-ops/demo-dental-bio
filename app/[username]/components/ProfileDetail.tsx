"use client";
import React, { useEffect, useState, useReducer } from "react";
import Navbar from "./Navbar";
import { createClient } from "@/utils/supabase/client";
import SocialLinks from "./SocialLinks";
import VerificationBadge from "@/app/components/VerificationBadge";
import IndividualProductList from "./IndividualProductList";

export default function ProfileDetail({
  userId,
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
}: {
  userId: string;
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
}) {
  const [productGroups, setProductGroups] = useState<GroupType[]>([]);
  const [products, setProducts] = useState<IndividualProductType[]>([]);
  const [locations, setLocations] = useState<any[] | null>(null);
  const [socialLinks, setSocialLinks] = useState<any>(null); // State for social links
  const [loading, setLoading] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isShopOpen, toggleShopOpen] = useReducer((state: boolean) => !state, false);

  // Fetch the location based on the dentistry_id
  useEffect(() => {
    async function fetchLocation() {
      const supabase = createClient();

      const { data: dentistryLocations, error: dentistryLocationError } =
        await supabase
          .from("dentistry_locations")
          .select(`
            location_id,
            locations (country, city, area, full_address, business_name)`
          )
          .eq("dentistry_id", dentistry_id)

      if (dentistryLocationError) {
        console.error("Error fetching location:", dentistryLocationError);
        setLoading(false);
        return;
      }

      setLocations(dentistryLocations);

      // setLocations(dentistryLocation.locations); // Store the location data
      fetchProfilePicture(dentistry_id);
      setLoading(false);
    }

    async function fetchSocialLinks() {
      const supabase = createClient();

      const { data: socials, error: socialsError } = await supabase
        .from("socials")
        .select(
          "twitter_link, instagram_link, facebook_link, tiktok_link"
        )
        .eq("dentistry_id", dentistry_id);

      if (socialsError) {
        console.error("Error fetching social links:", socialsError);
        return;
      }

      // Handle multiple rows (if needed)
      if (socials && socials.length > 0) {
        socials.forEach((social) => {
          setSocialLinks(social);
          return;
        });
      } else {
        console.log("No socials found for the given dentistry_id.");
      }

      if (socialsError) {
        console.error("Error fetching social links:", socialsError);
        return;
      }
    }

    fetchLocation();
    fetchSocialLinks();
  }, [dentistry_id]);

  useEffect(() => {
    async function fetchGroupList() {
      const query = [
        userId ? `userId=${userId}` : '', // Add userId if it exists
        'type=products'
      ]
        .filter(Boolean)                  // Remove empty strings
        .join('&');                       // Join with '&' to form a valid query string

      const response = await fetch(`/api/groups?${query}`, {
        method: 'GET'
      });
      const data = await response.json();

      setProductGroups(data);
    }

    fetchGroupList();
  }, [dentistry_id]);

  useEffect(() => {
    async function fetchProductList() {
      const query = userId ? `userId=${userId}` : '';

      const response = await fetch(`/api/individual-products?${query}`, {
        method: 'GET'
      });
      const data = await response.json();

      // setProductGroups(data);
      setProducts(data);
    }

    fetchProductList();
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
          <SocialLinks {...socialLinks} website_link={website_link} />
        </div>
      </div>

      <Navbar toggleShopOpen={toggleShopOpen} isFreePlan={isFreePlan} />

      {/* {productGroups.length > 0 && <div className={`flex flex-wrap pb-4 ${isShopOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
        {productGroups.map((group) => <ProductList key={group.id} products={group.datas!} />)}
      </div>} */}

      <div className={`flex-wrap ${products.length > 0 ? 'pb-4' : ''} ${isShopOpen ? 'animate-fade-in flex' : 'animate-fade-out'}`}>
        <IndividualProductList products={products} />
      </div>

      {/* "Based in" Section */}
      {locations && locations.length > 0 && (
        <div className="flex justify-center gap-4">
          <div className="flex justify-end items-center break-keep min-w-20 w-20">Based in</div>

          <div className="flex flex-row just flex-wrap gap-2">
            {locations.map((location) => (
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
        <h5 className="text-xl">{description}</h5>
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
