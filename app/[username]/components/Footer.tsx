"use client";
import React from "react";
import ShareModal from "./ShareModal";
import SocialLinks from "./SocialLinks";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

export default function Footer({
  bookingLink,
  contact_email,
  socialLinks,
  title,
  username,
  useDentalBrand,
  website_link,
}: {
  bookingLink: string;
  contact_email: string;
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
}) {
  const domainConfig = useDomainConfig();

  return (
    <>
      <section>
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
          <div className="relative items-center">
            <div className="col-12 text-center">
              <div className="footer-logo">
                <Link href="/">
                  <img
                    src={safeMediaSrc(domainConfig.logoPath)}
                    alt={`${domainConfig.brandName} logo`}
                    className="img-fluid mx-auto"
                  />
                </Link>
              </div>
              <Link
                href="/"
                className="text-decoration-none text-black fw-semibold footer-dentalbio"
              >
                Join {title} on {domainConfig.brandName}
              </Link>
            </div>
            <div className="absolute w-[44px] top-0 right-0">
              <ShareModal username={username} />
            </div>
          </div>
        )}

        {/* {useDentalBrand && */}
        <div className="relative items-center">
          <div className="">
            <div className="col-12 text-center mt-10">
              <img
                src="../../Perks-logo.svg"
                alt="digimax"
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
            <div className="absolute w-[44px] top-0 right-0">
              <ShareModal username={username} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
