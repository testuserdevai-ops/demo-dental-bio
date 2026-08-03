"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ShareModal from "./ShareModal";
import SocialLinks from "./SocialLinks";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/features/analytics/tracked-action";

export default function Footer({
  dentistryId,
  bookingLink,
  contact_email,
  title,
  username,
  useDentalBrand,
  website_link,
}: {
  dentistryId: string;
  bookingLink: string;
  contact_email: string;
  title: string;
  username: string;
  useDentalBrand: boolean;
  website_link?: string;
}) {
  const [socialLinks, setSocialLinks] = useState<any>(null);
  const domainConfig = useDomainConfig();

  useEffect(() => {
    // Fetch social links
    async function fetchSocialLinks() {
      const supabase = createClient();
      const { data: socials, error: socialsError } = await supabase
        .from("socials")
        .select("twitter_link, instagram_link, facebook_link, tiktok_link")
        .eq("dentistry_id", dentistryId)
        .single();

      if (socialsError) {
        console.error("Error fetching social links:", socialsError);
        return;
      }

      setSocialLinks(socials);
    }

    fetchSocialLinks();
  }, [dentistryId]);

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
