"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { usePreview } from "@/app/contexts/PreviewContext";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useDashboardScope } from "@/app/contexts/DashboardScopeContext";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { apiClient } from "@/services/apiClient";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import {
  getPreviewSectionId,
  scrollPreviewToSection,
} from "./previewSectionFocus";

const RightPanelClient = ({
  username,
  shell,
}: {
  username: string;
  shell: DashboardShellViewModel;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [brandOverride, setBrandOverride] = useState<{
    sourceBrandStatus: boolean;
    useDentalBrand: boolean;
  } | null>(null);
  const [isUpdatingBrand, setIsUpdatingBrand] = useState(false);
  const isUpdatingBrandRef = useRef(false);

  const { reloadKey } = usePreview();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const router = useRouter();
  const { triggerReload } = usePreview();
  const domainConfig = useDomainConfig();
  const logoPath = safeMediaSrc(domainConfig.logoPath);
  const scope = useDashboardScope();
  const premiumProAvailable = shell.subscriptionStatus === "PREMIUM PRO";
  const isUsingBrand =
    brandOverride?.sourceBrandStatus === shell.useDentalBrand
      ? brandOverride.useDentalBrand
      : shell.useDentalBrand;

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const handleUpdate = useCallback(
    async (nextBrandStatus: boolean) => {
      if (isUpdatingBrandRef.current) return;

      const sourceBrandStatus = shell.useDentalBrand;
      setBrandOverride({
        sourceBrandStatus,
        useDentalBrand: nextBrandStatus,
      });
      isUpdatingBrandRef.current = true;
      setIsUpdatingBrand(true);
      try {
        const data = await apiClient.put("/api/user", {
          targetUserId,
          use_dental_brand: nextBrandStatus,
        });
        triggerReload();
        setBrandOverride({
          sourceBrandStatus,
          useDentalBrand: data.use_dental_brand,
        });
        router.refresh();
      } catch (err: any) {
        setBrandOverride(null);
        console.error(err.message);
      } finally {
        isUpdatingBrandRef.current = false;
        setIsUpdatingBrand(false);
      }
    },
    [router, shell.useDentalBrand, targetUserId, triggerReload],
  );

  const reloadPreview = useCallback((sectionId: string | null = null) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsReloading(true);
    iframe.onload = () => {
      const focusSection = () =>
        scrollPreviewToSection(
          iframe,
          sectionId,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );

      focusSection();
      window.setTimeout(focusSection, 100);
      setIsReloading(false);
    };
    iframe.src = iframe.src;
  }, []);

  useEffect(() => {
    scrollPreviewToSection(
      iframeRef.current,
      getPreviewSectionId(pathname),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, [pathname]);

  useEffect(() => {
    reloadPreview(getPreviewSectionId(pathnameRef.current));
  }, [reloadKey, reloadPreview]);

  useEffect(() => {
    const handlePreviewReady = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object" ||
        (event.data as { type?: unknown }).type !== "dentalbio:preview-ready"
      ) {
        return;
      }

      scrollPreviewToSection(
        iframeRef.current,
        getPreviewSectionId(pathnameRef.current),
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    };

    window.addEventListener("message", handlePreviewReady);
    return () => window.removeEventListener("message", handlePreviewReady);
  }, []);

  // Client-side function to reload iframe and show spinner.
  const handleRefreshClick = () => {
    reloadPreview(getPreviewSectionId(pathname));
  };

  const handleHideLogo = () => {
    if (premiumProAvailable) {
      void handleUpdate(!isUsingBrand);
    } else {
      toast.info(
        scope.canManageSubscription ? (
          <span>
            Upgrade your plan to hide the {domainConfig.brandName} logo.{" "}
            <Link
              href="/upgrade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              Upgrade
            </Link>
          </span>
        ) : (
          `Upgrade your plan to hide the ${domainConfig.brandName} logo`
        ),
      );
    }
  };

  // Global event listener to reload iframe (triggered from anywhere)
  useEffect(() => {
    const handleIframeRefresh = () => {
      reloadPreview(getPreviewSectionId(pathnameRef.current));
    };

    window.addEventListener("iframeRefresh", handleIframeRefresh);

    return () => {
      window.removeEventListener("iframeRefresh", handleIframeRefresh);
    };
  }, [reloadPreview]);

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
        <div className="no-underline add-btn upgrade-now-btn absolute bottom-44 z-5 right-4 cursor-pointer">
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
        </div>
        <button
          type="button"
          className="absolute left-1/2 bottom-24 transform -translate-x-1/2 flex justify-center items-center gap-2 cursor-pointer"
          onClick={handleHideLogo}
          disabled={isUpdatingBrand}
          aria-busy={isUpdatingBrand || undefined}
        >
          <span className="text-base text-gray-600 font-medium whitespace-nowrap">
            {isUsingBrand ? "Hide" : "Show"} {domainConfig.brandName} logo
          </span>
          {!premiumProAvailable && (
            <LockSimple className="text-gray-dark-text" weight="bold" />
          )}
        </button>
      </div>
      <div className="footer-logo text-center mb-0 -mt-40 flex flex-col items-center justify-center">
        <Link href="/" target="_blank">
          {logoPath && (
            <Image
              src={logoPath}
              alt={`${domainConfig.brandName} logo`}
              width={235}
              height={38}
              className="img-fluid"
            />
          )}
        </Link>
      </div>
    </>
  );
};

export default RightPanelClient;
