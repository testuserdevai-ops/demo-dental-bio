"use client";

import React from "react";
import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

type Props = {};

export default function Footer({}: Props) {
  const domainConfig = useDomainConfig();

  return (
    <footer className="w-full px-5 md:px-14 lg:px-20 py-10 mt-16 ">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between pb-10">
        {/* Left Column */}
        <div className="flex flex-col md:flex-row w-full md:gap-10">
          {/* Logo */}
          <div className="flex flex-col items-start w-full md:w-1/2 lg:w-1/4 mb-8 md:mb-0">
            <Image
              src={domainConfig.logoPath}
              width={150}
              height={40}
              alt="Footer logo"
            />
          </div>

          {/* Links List - Two Equal Columns */}
          <div className="flex w-full md:w-2/3 justify-start gap-10 font-medium">
            <div className="flex flex-col space-y-2">
              <Link href="/dashboard" className="text-base text-dark">
                Dashboard
              </Link>
              {/* <Link href="/features" className="text-base text-dark">
                Features
                </Link>
                <Link href="/faq" className="text-base text-dark">
                FAQ
                </Link> */}
              <Link
                target="_blank"
                rel="noreferrer"
                href="mailto:hello@dental.bio"
                className="text-base text-dark"
              >
                Contact
              </Link>
            </div>
            {/* <div className="flex flex-col space-y-2">
              <Link href="/story" className="text-base text-dark">
                Story
              </Link>
              <Link href="/affiliates" className="text-base text-dark">
                Affiliates
              </Link>
              <Link href="/blog" className="text-base text-dark">
                Blog
              </Link>
              <Link href="/brands" className="text-base text-dark">
                Brands
              </Link>
            </div> */}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex w-full justify-start mt-10 md:mt-0"></div>
      </div>

      {/* Footer Bottom Section */}
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between mt-10 border-t border-neutral-300 pt-5">
        {/* Left side - Terms and Conditions */}
        <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-neutral-300 py-3 text-center md:text-start">
          <Link href="/terms" className="hover:underline">
            Terms & Conditions
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy Notice
          </Link>
          <Link
            href={"https://digimax.dental"}
            target="_blank"
            className="text-dark"
          >
            A Digimax™ Project
          </Link>
        </div>

        {/* Right side - Empty Image tags */}
        <div className="flex space-x-4 items-center justify-center mt-7 md:mt-0">
          {/* <Image
            src="/logos/doctorsbio.svg"
            width={90}
            height={30}
            alt="Icon 1"
            className="h-3 w-auto"
          />
          <Image
            src="/logos/injectorbio.svg"
            width={90}
            height={30}
            alt="Icon 2"
            className="h-3 w-auto"
          />
          <Image
            src="/logos/pharmacistsbio.svg"
            width={90}
            height={30}
            alt="Icon 3"
            className="h-3 w-auto"
          /> */}
          <Image
            src={domainConfig.logoPath}
            width={90}
            height={30}
            alt="Icon 4"
            className="h-3 w-auto"
          />
        </div>
      </div>
    </footer>
  );
}
