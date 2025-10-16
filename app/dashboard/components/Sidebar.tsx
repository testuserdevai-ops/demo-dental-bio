"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Cookies from "js-cookie";
import { XIcon } from "@phosphor-icons/react";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import SignOutForm from "./Signout";
import SidebarItems from "./SidebarItems";
import { useDashboardUser } from "@/app/contexts/DashboardUserContext";

// Constants for storing keys in cookies
const COOKIE_USERNAME_KEY = "username";
const COOKIE_DENTISTRY_ID_KEY = "dentistry_id";

const Sidebar = ({ isMessageStateForStudent }: { isMessageStateForStudent: boolean }) => {
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

  const { user, loading } = useDashboardUser();

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

  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      if (loading) return;
      if (!user) {
        return router.push("/error?message=user_not_found");
      }
      const fetchedUsername = user.username as string;
      const userId = user.id as string;
      Cookies.set(COOKIE_USERNAME_KEY, fetchedUsername, { expires: 7 });
      setUsername(fetchedUsername);
      if ((user.subscription_status === "PRO" || user.subscription_status === "PREMIUM PRO"))
        setProAvailable(true);
      if (user.subscription_status === "PREMIUM PRO")
        setPremiumProAvailable(true);
      await hasTrialEnded(user.trial_end as string, user.current_period_end as string, userId);
      const { data: dentistryRecord, error: dentistryError } = await supabase
        .from("dentistries")
        .select("dentistry_id")
        .eq("user_id", userId)
        .single();
      if (dentistryError || !dentistryRecord) {
        console.error("Error fetching dentistry info:", dentistryError);
        return;
      }
      const fetchedDentistryId = dentistryRecord.dentistry_id as string;
      Cookies.set(COOKIE_DENTISTRY_ID_KEY, fetchedDentistryId, { expires: 7 });
      fetchProfilePicture(fetchedDentistryId);
    };
    run();
  }, [user, loading, router]);

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

        setProfilePicUrl(urlData?.publicUrl || "/placeholder.webp");
      } else {
        setProfilePicUrl("/placeholder.webp");
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePicUrl("/placeholder.webp");
    }
  };

  return (
    <div className="bg-[#f7fafc] rounded-[34px] py-5 px-4 mt-16 xxl:mt-0">
      <nav className="ng-white">
        <div className="container mx-auto p-0">
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
                <XIcon size={28} />
              </button>
            </div>

            <div className="w-full flex flex-col overflow-y-auto px-4 py-5">
              <SidebarItems setIsOpen={handleClose} proAvailable={proAvailable} premiumProAvailable={premiumProAvailable} targetUserId={targetUserId as string} />
            </div>
          </div>
          <div className="hidden xxl:block">
            {
              isMessageStateForStudent &&
              <div className="bg-[#e8edf2] rounded-[20px] px-8 py-5">
                <p className="font-bold">
                  Congrulates! You have unlocked pro plan for 6 months!
                </p>
              </div>
            }
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

      {announcements.title &&
        <div className="bg-[#e8edf2] rounded-[20px] px-8 py-5 mb-6">
          <p className="font-bold mb-4">
            {announcements.title}
          </p>
          <p className="mb-0">{announcements.content}</p>
        </div>}
      {!premiumProAvailable &&
        <Link
          href={"/upgrade"}
          target="_blank"
          className="no-underline add-btn upgrade-now-btn"
        >
          <button>Upgrade now</button>
        </Link>}

      <div className="memberpanel-profile flex items-center justify-start">
        <img
          src={profilePicUrl || "/placeholder.webp"}
          alt="Profile"
          className="img-fluid rounded-full w-16 h-16 object-cover"
        />
        <Link
          href={`https://dental.bio/${username}`}
          target="_blank"
          className="fw-bold mb-0 text-black no-underline hover:no-underline"
        >
          @{username ? username : "loading..."}
        </Link>
      </div>

      <SignOutForm />

      <ConfirmMessage
        title="Downgrade plan?"
        description="Are you sure you want to downgrade your plan?"
        okText="Delete"
        isOpen={isOpenDowngradeConfirmMessage}
        onClose={() => setIsOpenDowngradeConfirmMessage(false)}
        onOk={handleDowngrade}
      />
    </div>
  );
}

export default Sidebar;