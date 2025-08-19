"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Cookies from "js-cookie";
import { Gear, MapPin, Heart, LinkSimple, House, ShoppingCartSimple, LinkBreak, List, X } from "@phosphor-icons/react";
import { CheckSquare, Globe, Image, LockSimple, Newspaper, SealCheck, Video, } from "@phosphor-icons/react/dist/ssr";
// import { useAdmin } from "@/utils/functions/useAdmin";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import SignOutForm from "./Signout";
import SidebarItems from "./SidebarItems";

// Constants for storing keys in cookies
const COOKIE_USERNAME_KEY = "username";
const COOKIE_DENTISTRY_ID_KEY = "dentistry_id";

const MobileNavbar = () => {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId')

  // const { getTargetUserId } = useAdmin();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState({ title: '', content: '' });
  const [proAvailable, setProAvailable] = useState<boolean>(false);
  const [premiumProAvailable, setPremiumProAvailable] = useState<boolean>(false);
  const [isOpenDowngradeConfirmMessage, setIsOpenDowngradeConfirmMessage] = useState<boolean>(false);

  const pathname = usePathname();

  // Fetch user info on component mount
  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const response = await fetch('/api/announcements', {
        method: 'GET',
      });

      const fetchData = await response.json();
      setAnnouncements(fetchData);
    }

    fetchAnnouncements();
  }, [])

  const handleDowngrade = async () => {
    const response = await fetch("/api/subscribe", {
      method: "DELETE",
    });

    const data = await response.json();

    setProAvailable(false);
    setPremiumProAvailable(false);
  }

  // Function to toggle the sidebar visibility
  const handleToggle = () => setIsOpen(!isOpen);
  const handleClose = () => setIsOpen(false);

  // Fetch logged-in user's email and username, and set it in cookies
  const fetchUserInfo = async () => {
    const supabase = createClient();
    const response = await fetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
    const userRecord = await response.json();

    if (!userRecord) {
      return router.push("/error?message=user_not_found");
    }

    const fetchedUsername = userRecord.username;
    const userId = userRecord.id;

    // Store the username in cookies for future usage
    Cookies.set(COOKIE_USERNAME_KEY, fetchedUsername, { expires: 7 });
    setUsername(fetchedUsername);

    if ((userRecord.subscription_status === "PRO" || userRecord.subscription_status === "PREMIUM PRO"))
      setProAvailable(true);
    if (userRecord.subscription_status === "PREMIUM PRO")
      setPremiumProAvailable(true);

    await hasTrialEnded(userRecord.trial_end, userRecord.current_period_end, userId);

    // Fetch the `dentistry_id` using the user ID
    const { data: dentistryRecord, error: dentistryError } = await supabase
      .from("dentistries")
      .select("dentistry_id")
      .eq("user_id", userId)
      .single();

    if (dentistryError || !dentistryRecord) {
      console.error("Error fetching dentistry info:", dentistryError);
      return;
    }

    const fetchedDentistryId = dentistryRecord.dentistry_id;

    // Store the `dentistry_id` in cookies for future usage
    Cookies.set(COOKIE_DENTISTRY_ID_KEY, fetchedDentistryId, { expires: 7 });

    // Fetch the profile picture using the `dentistry_id`
    fetchProfilePicture(fetchedDentistryId);
  };

  const hasTrialEnded = async (trialEndDate: string, currentPeriodEnd: string, userId: string) => {
    const supabase = createClient();
    const today = new Date();
    const trialEnd = new Date(trialEndDate);
    const subscriptionEnd = new Date(currentPeriodEnd)
    if (trialEnd < today && subscriptionEnd < today) {
      await supabase
        .from("users")
        .update({ subscription_status: "FREE" })
        .eq("id", userId);
      setProAvailable(false);
      setPremiumProAvailable(false);
    }
  }

  // Function to fetch profile picture from Supabase storage using dentistryId
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

        setProfilePicUrl(urlData?.publicUrl || "/placeholder.png");
      } else {
        setProfilePicUrl("/placeholder.png");
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePicUrl("/placeholder.png");
    }
  };

  return (
    <>
      <nav className="ng-white xxl:hidden">
        <div className="container mx-auto p-0">
          <button
            className="xxl:hidden absolute right-0 -top-4 p-4"
            onClick={handleToggle}
          >
            <List size={32} className="text-gray-700" />
          </button>

          {/* Offcanvas Sidebar */}
          <div
            className={`fixed top-0 left-0 h-full w-[399px] bg-white shadow-lg transform ${isOpen ? "translate-x-0" : "-translate-x-full"
              } transition-transform duration-300 ease-in-out z-50`}
          >
            <div className="xxl:hidden w-full flex justify-end items-center p-3">
              <button
                type="button"
                className="text-gray-700"
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={28} />
              </button>
            </div>

            <div className="w-full flex flex-col overflow-y-auto px-4 py-5">
              <SidebarItems setIsOpen={handleClose} proAvailable={proAvailable} premiumProAvailable={premiumProAvailable} targetUserId={targetUserId as string} />
            </div>
          </div>
          <div className="hidden xxl:block">
            <div className="py-5 w-full flex flex-col overflow-y-auto">
              <SidebarItems setIsOpen={handleClose} proAvailable={proAvailable} premiumProAvailable={premiumProAvailable} targetUserId={targetUserId as string} />
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleClose}
        ></div>
      )}
    </>
  );
}

export default MobileNavbar;