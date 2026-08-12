"use client";
import React from "react";
import ShareModal from "./ShareModal";
import SocialLinks from "./SocialLinks";
import Link from "next/link";
import Image from "next/image";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

export default function Footer({
  bookingLink,
  contact_email,
  profileId,
  socialLinks,
  title,
  username,
  useDentalBrand,
  website_link,
  presentation = "legacy",
}: {
  bookingLink: string;
  contact_email: string;
  profileId: string;
  socialLinks: {
    twitter_link?: string;
    instagram_link?: string;
    facebook_link?: string;
    tiktok_link?: string;
    linkedin_link?: string;
  } | null;
  title: string;
  username: string;
  useDentalBrand: boolean;
  website_link?: string;
  presentation?: "legacy" | "template";
}) {
  const domainConfig = useDomainConfig();
  const logoPath = safeMediaSrc(domainConfig.logoPath);

  return (
    <>
      <section data-profile-footer={presentation === "template" || undefined}>
        <div className="row section-wrapper-contact">
          <div className="col-12 text-center">
            {contact_email && (
              <TrackedLink
                analytics={[
                  { action: { type: "email_click" }, section: "footer" },
                  {
                    action: { type: "cta_click", ctaType: "email" },
                    section: "footer",
                  },
                ]}
                href={`mailto:${contact_email}`}
                className="no-underline custom-outline-btn contact-btn inline-flex"
              >
                Contact me
              </TrackedLink>
            )}
            <SocialLinks
              {...socialLinks}
              website_link={website_link}
              analyticsSection="footer"
            />
          </div>
        </div>

        {useDentalBrand && (
          <div
            className={`relative items-center ${presentation === "template" ? "px-14 sm:px-16" : ""}`}
          >
            <div
              className={`col-12 text-center ${presentation === "template" ? "min-w-0" : ""}`}
            >
              <div className="footer-logo">
                <Link href="/">
                  {logoPath && (
                    <Image
                      src={logoPath}
                      alt={`${domainConfig.brandName} logo`}
                      width={235}
                      height={38}
                      className="img-fluid mx-auto"
                    />
                  )}
                </Link>
              </div>
              <Link
                href="/"
                className={
                  presentation === "template"
                    ? "footer-dentalbio block min-w-0 break-words font-semibold no-underline"
                    : "text-decoration-none text-black fw-semibold footer-dentalbio"
                }
                style={
                  presentation === "template"
                    ? { color: "var(--profile-text, #000000)" }
                    : undefined
                }
              >
                Join {title} on {domainConfig.brandName}
              </Link>
            </div>
            <div className="absolute right-0 top-0 w-[44px]">
              <ShareModal profileId={profileId} username={username} />
            </div>
          </div>
        )}

        {/* {useDentalBrand && */}
        <div
          className={`relative items-center ${presentation === "template" ? "px-14 sm:px-16" : ""}`}
        >
          <div className={presentation === "template" ? "min-w-0" : ""}>
            <div className="col-12 text-center mt-10">
              <Image
                src="/Perks-logo.svg"
                alt="digimax"
                width={51}
                height={33}
                className="img-fluid mx-auto w-10"
              />
              <p>
                A{" "}
                <Link href="https://digimax.dental/" target="_blank">
                  Digimax
                </Link>{" "}
                Project
              </p>
            </div>
          </div>
          {!useDentalBrand && (
            <div className="absolute right-0 top-0 w-[44px]">
              <ShareModal profileId={profileId} username={username} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
