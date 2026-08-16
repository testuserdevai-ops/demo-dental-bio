"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { createClient } from "@/utils/supabase/client";
import { XIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import SignOutForm from "./Signout";
import SidebarItems from "./SidebarItems";
import { useDashboardScope } from "@/app/contexts/DashboardScopeContext";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import useIsMobile from "@/utils/hooks/useIsMobile";
import { apiClient } from "@/services/apiClient";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import DashboardOnboardingProgressCard, {
  type DashboardOnboardingProgress,
} from "../_components/DashboardOnboardingProgressCard";

// Constants for storing keys in cookies
const COOKIE_USERNAME_KEY = "username";
const COOKIE_DENTISTRY_ID_KEY = "dentistry_id";
const PROFILE_PLACEHOLDER_URL = "/placeholder.webp";
const profilePictureUrls = new Map<string, string>();
const profilePictureListeners = new Map<string, Set<() => void>>();
const pendingProfilePictureRequests = new Set<string>();

function notifyProfilePictureListeners(dentistryId: string) {
  profilePictureListeners.get(dentistryId)?.forEach((listener) => listener());
}

async function loadProfilePicture(dentistryId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("profile-pics")
      .list(dentistryId);

    if (error) throw error;

    if (data.length > 0) {
      const fileName = data[0].name;
      const { data: urlData } = await supabase.storage
        .from("profile-pics")
        .getPublicUrl(`${dentistryId}/${fileName}`);
      profilePictureUrls.set(
        dentistryId,
        urlData?.publicUrl || PROFILE_PLACEHOLDER_URL,
      );
    } else {
      profilePictureUrls.set(dentistryId, PROFILE_PLACEHOLDER_URL);
    }
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    profilePictureUrls.set(dentistryId, PROFILE_PLACEHOLDER_URL);
  } finally {
    pendingProfilePictureRequests.delete(dentistryId);
    notifyProfilePictureListeners(dentistryId);
  }
}

function subscribeToProfilePicture(dentistryId: string, listener: () => void) {
  const listeners = profilePictureListeners.get(dentistryId) ?? new Set();
  listeners.add(listener);
  profilePictureListeners.set(dentistryId, listeners);

  if (
    !profilePictureUrls.has(dentistryId) &&
    !pendingProfilePictureRequests.has(dentistryId)
  ) {
    pendingProfilePictureRequests.add(dentistryId);
    void loadProfilePicture(dentistryId);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) profilePictureListeners.delete(dentistryId);
  };
}

function useProfilePicture(dentistryId: string) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToProfilePicture(dentistryId, listener),
    [dentistryId],
  );
  const getSnapshot = useCallback(
    () => profilePictureUrls.get(dentistryId) ?? null,
    [dentistryId],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

const isSixMonthsOrMore = (shell: DashboardShellViewModel) => {
  if (shell.position !== "Student" || !shell.createdAt || !shell.trialEnd) {
    return false;
  }
  const createdAt = new Date(shell.createdAt);
  const trialEnd = new Date(shell.trialEnd);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(trialEnd.getTime())) {
    return false;
  }
  return (
    (trialEnd.getFullYear() - createdAt.getFullYear()) * 12 +
      (trialEnd.getMonth() - createdAt.getMonth()) >=
    6
  );
};

const Sidebar = ({
  progress = {
    completedStepIds: [],
    hasAppearanceDraft: false,
    templateId: "basic",
  },
  shell,
}: {
  progress?: DashboardOnboardingProgress;
  shell: DashboardShellViewModel;
}) => {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const domainConfig = useDomainConfig();
  const domain = domainConfig.domain;
  const scope = useDashboardScope();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState({
    title: "",
    content: "",
  });
  const proAvailable =
    shell.subscriptionStatus === "PRO" ||
    shell.subscriptionStatus === "PREMIUM PRO";
  const premiumProAvailable = shell.subscriptionStatus === "PREMIUM PRO";
  const isMessageStateForStudent = isSixMonthsOrMore(shell);
  const [isDowngradeConfirmationOpen, setIsDowngradeConfirmationOpen] =
    useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const isMobile = useIsMobile();
  const username = scope.username;
  const profilePicUrl = useProfilePicture(scope.dentistryId);
  const reconciliationStarted = useRef(false);
  const downgradeTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchAnnouncements = async () => {
      try {
        const fetchData = await apiClient.get("/api/announcements");
        if (active) setAnnouncements(fetchData);
      } catch {
        // Announcements are optional; keep the empty state on fetch failure.
      }
    };

    void fetchAnnouncements();
    return () => {
      active = false;
    };
  }, []);

  const handleDowngrade = async () => {
    if (!scope.canManageSubscription || isDowngrading) return;

    setIsDowngrading(true);
    try {
      await apiClient.delete("/api/subscription");
      router.refresh();
      setIsDowngradeConfirmationOpen(false);
    } catch {
      // Keep the confirmation open so the owner can retry the authoritative action.
    } finally {
      setIsDowngrading(false);
    }
  };

  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    Cookies.set(COOKIE_USERNAME_KEY, scope.username, { expires: 7 });
    Cookies.set(COOKIE_DENTISTRY_ID_KEY, scope.dentistryId, { expires: 7 });
  }, [scope.dentistryId, scope.username]);

  useEffect(() => {
    if (
      reconciliationStarted.current ||
      !scope.canManageSubscription ||
      shell.subscriptionStatus === "FREE" ||
      !shell.trialEnd ||
      !shell.currentPeriodEnd
    )
      return;
    const trialEnd = new Date(shell.trialEnd);
    const subscriptionEnd = new Date(shell.currentPeriodEnd);
    if (trialEnd >= new Date() || subscriptionEnd >= new Date()) return;

    reconciliationStarted.current = true;
    const reconcileExpiredSubscription = async () => {
      try {
        await apiClient.put("/api/subscription", {
          subscription_status: "FREE",
        });
        router.refresh();
      } catch {
        // The owner-authorized server route preserves the current state on failure.
      }
    };
    void reconcileExpiredSubscription();
  }, [
    router,
    scope.canManageSubscription,
    scope.effectiveUserId,
    shell.currentPeriodEnd,
    shell.subscriptionStatus,
    shell.trialEnd,
  ]);

  return (
    <>
      <DashboardOnboardingProgressCard
        className="mb-4 hidden xxl:block"
        progress={progress}
        targetUserId={targetUserId}
      />
      <div className="bg-surface-light rounded-[34px] py-5 px-4 mt-16 xxl:mt-0">
        <nav className="ng-white">
          <div className="container mx-auto p-0">
            {/* Offcanvas Sidebar */}
            <div
              className={`fixed top-0 left-0 h-full w-full max-w-[400px bg-white shadow-lg transform ${
                isOpen ? "translate-x-0" : "-translate-x-full"
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
            </div>
            <div className="hidden xxl:block">
              {isMessageStateForStudent && (
                <div className="bg-sidebar-border rounded-[20px] px-8 py-5">
                  <p className="font-bold">
                    Congrulates! You have unlocked pro plan for 6 months!
                  </p>
                </div>
              )}
              {!isMobile && (
                <div className="py-5 w-full flex flex-col overflow-y-auto">
                  <SidebarItems
                    setIsOpen={handleClose}
                    proAvailable={proAvailable}
                    premiumProAvailable={premiumProAvailable}
                    targetUserId={targetUserId as string}
                  />
                </div>
              )}
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

        {announcements.title && (
          <div className="bg-sidebar-border rounded-[20px] px-8 py-5 mb-6">
            <p className="font-bold mb-4">{announcements.title}</p>
            <p className="mb-0">{announcements.content}</p>
          </div>
        )}
        {scope.canManageSubscription && !premiumProAvailable && (
          <Link
            href="/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline upgrade-now-btn flex justify-center items-center px-[20px] py-[10px] font-bold text-white rounded-[26px] bg-primary-1 hover:bg-deep-purple transition-all ease-in-out"
          >
            Upgrade now
          </Link>
        )}
        {scope.canManageSubscription && proAvailable && (
          <div ref={downgradeTriggerRef} className="w-full">
            <FullRoundedButton
              type="button"
              onClick={() => setIsDowngradeConfirmationOpen(true)}
              buttonType="warning"
              className="w-full my-4 text-[20px]"
            >
              Cancel Current Plan
            </FullRoundedButton>
          </div>
        )}

        <div className="memberpanel-profile flex items-center justify-start">
          <Image
            src={profilePicUrl || "/placeholder.webp"}
            alt="Profile"
            width={64}
            height={64}
            unoptimized
            loader={({ src }) => src}
            className="img-fluid rounded-full w-16 h-16 object-cover"
          />
          <Link
            href={`https://${domain}/${username}`}
            target="_blank"
            className="fw-bold mb-0 text-black no-underline hover:no-underline"
          >
            @{username ? username : "loading..."}
          </Link>
        </div>

        <SignOutForm />

        {scope.canManageSubscription && (
          <AlertDialog
            open={isDowngradeConfirmationOpen}
            onOpenChange={(open) => {
              if (!isDowngrading) setIsDowngradeConfirmationOpen(open);
            }}
          >
            <AlertDialogContent
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                downgradeTriggerRef.current
                  ?.querySelector<HTMLButtonElement>("button")
                  ?.focus();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Downgrade plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to downgrade your plan?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel autoFocus disabled={isDowngrading}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDowngrading}
                  aria-busy={isDowngrading || undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDowngrade();
                  }}
                >
                  {isDowngrading ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  );
};

export default Sidebar;
