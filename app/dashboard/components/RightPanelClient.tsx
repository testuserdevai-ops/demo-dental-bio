"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { usePreview } from "@/app/contexts/PreviewContext";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessage } from "@/app/contexts/MessageContext";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { apiClient } from "@/services/apiClient";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";

const RightPanelClient = ({
  username,
  shell,
}: {
  username: string;
  shell: DashboardShellViewModel;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isUsingBrand, setIsUsingBrand] = useState<boolean>(true);
  const [originalBrandStatus, setOriginalBrandStatus] = useState<boolean>(true);
  const [premiumProAvailable, setPremiumProAvailable] =
    useState<boolean>(false);

  const { setNotificationMessage, closeMessage } = useMessage();

  const { reloadKey } = usePreview();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const router = useRouter();
  const { triggerReload } = usePreview();
  const domainConfig = useDomainConfig();

  const handleUpdate = async () => {
    try {
      const data = await apiClient.put("/api/user", {
        targetUserId,
        use_dental_brand: isUsingBrand,
      });
      triggerReload();
      setOriginalBrandStatus(data.use_dental_brand);
      router.refresh();
    } catch (err: any) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    setOriginalBrandStatus(shell.useDentalBrand);
    setIsUsingBrand(shell.useDentalBrand);
    setPremiumProAvailable(shell.subscriptionStatus === "PREMIUM PRO");
  }, [shell]);

  useEffect(() => {
    handleRefreshClick();
  }, [reloadKey]);

  useEffect(() => {
    if (isUsingBrand !== originalBrandStatus) {
      handleUpdate();
    }
  }, [isUsingBrand]);

  // Client-side function to reload iframe and show spinner
  const handleRefreshClick = async () => {
    if (iframeRef.current) {
      setIsReloading(true); // Start spinner immediately when button is clicked
      iframeRef.current.src = iframeRef.current.src;

      // Wait for the iframe to finish loading before stopping the spinner
      iframeRef.current.onload = () => {
        setIsReloading(false); // Stop spinner when iframe is reloaded
      };
    }
  };

  const handleHideLogo = async () => {
    if (premiumProAvailable) {
      setIsUsingBrand((prev) => {
        return !prev;
      });
    } else {
      setNotificationMessage({
        message: `Upgrade your plan to hide the ${domainConfig.brandName} logo`,
        type: "info",
        extraButtons: (
          <>
            <Link href="/upgrade" target="_blank" className="no-underline">
              <FullRoundedButton onClick={() => closeMessage()}>
                Upgrade
              </FullRoundedButton>
            </Link>
          </>
        ),
      });
    }
  };

  // Global event listener to reload iframe (triggered from anywhere)
  useEffect(() => {
    const handleIframeRefresh = () => {
      if (iframeRef.current) {
        setIsReloading(true);
        iframeRef.current.src = iframeRef.current.src;
        iframeRef.current.onload = () => setIsReloading(false);
      }
    };

    window.addEventListener("iframeRefresh", handleIframeRefresh);

    return () => {
      window.removeEventListener("iframeRefresh", handleIframeRefresh);
    };
  }, []);

  return (
    <>
      <div className="memberpanel-index relative">
        {username ? (
          <iframe
            id="myIframe"
            ref={iframeRef}
            src={`/${username}?analyticsContext=preview`}
            frameBorder={0}
            style={{
              transform: "scale(0.75)",
              transformOrigin: "0 0",
              width: "133%",
              height: "750px",
            }}
          />
        ) : (
          <iframe
            id="myIframe"
            ref={iframeRef}
            frameBorder={0}
            style={{
              transform: "scale(0.75)",
              transformOrigin: "0 0",
              width: "133%",
              height: "750px",
            }}
          />
        )}
        <form className="no-underline add-btn upgrade-now-btn absolute bottom-44 z-5 right-4 cursor-pointer">
          <button
            type="button"
            className="aspect-square cursor-pointer"
            onClick={handleRefreshClick}
          >
            <ArrowsClockwise
              size={24}
              className={isReloading ? "animate-spin" : ""}
            />{" "}
          </button>
        </form>
        <div
          className="absolute left-1/2 bottom-24 transform -translate-x-1/2 flex justify-center items-center gap-2 cursor-pointer"
          onClick={handleHideLogo}
        >
          <span className="text-base text-gray-600 font-medium whitespace-nowrap">
            {isUsingBrand ? "Hide" : "Show"} {domainConfig.brandName} logo
          </span>
          {!premiumProAvailable && (
            <LockSimple className="text-gray-dark-text" weight="bold" />
          )}
        </div>
      </div>
      <div className="footer-logo text-center mb-0 -mt-40 flex flex-col items-center justify-center">
        <Link href="/" target="_blank">
          <img
            src={safeMediaSrc(domainConfig.logoPath)}
            alt={`${domainConfig.brandName} logo`}
            className="img-fluid"
          />
        </Link>
      </div>
    </>
  );
};

export default RightPanelClient;
