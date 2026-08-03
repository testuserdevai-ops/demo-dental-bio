"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ShareModal from "./ShareModal";
import SocialLinks from "./SocialLinks";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { safeMediaSrc } from "@/app/components/Image/SafeImage";

export default function Footer({
  dentistryId,
  bookingLink,
  contact_email,
  title,
  username,
  useDentalBrand,
  website_link
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
        .select(
          "twitter_link, instagram_link, facebook_link, tiktok_link"
        )
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
            {bookingLink && (
              <Link href={`mailto:${contact_email}`}>
                <button className="no-underline custom-outline-btn contact-btn">
                  Contact me
                </button>
              </Link>
            )}
            <SocialLinks {...socialLinks} website_link={website_link} />
          </div>
        </div>

        {useDentalBrand &&
          <div className="relative items-center">
            <div className="col-12 text-center">
              <div className="footer-logo">
                <Link href="/">
                  <img src={safeMediaSrc(domainConfig.logoPath)} alt={`${domainConfig.brandName} logo`} className="img-fluid mx-auto" />
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
          </div>}

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
          {!useDentalBrand &&
            <div className="absolute w-[44px] top-0 right-0">
              <ShareModal username={username} />
            </div>}
        </div>
      </section >
    </>
  );
}
