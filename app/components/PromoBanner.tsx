"use client";

import { useState, useEffect } from "react";
import { Transition } from "@headlessui/react";
import ClaimForm from "./home-page/ClaimForm";
import { Manrope } from "next/font/google";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const manrope = Manrope({ subsets: ["latin"] });

export default function PromoBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const domainConfig = useDomainConfig();
  // Handle the banner appearance on scroll
  const handleScroll = () => {
    if (window.scrollY > 800 && !hasScrolled) {
      setIsOpen(true);
      setHasScrolled(true);
    }
  };

  const closeBanner = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasScrolled]);

  return (
    <Transition
      show={isOpen}
      enter="transition-opacity duration-500"
      enterFrom="opacity-0 translate-y-10"
      enterTo="opacity-100 translate-y-0"
      leave="transition-opacity duration-500"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-10"
    >
      <div
        className={`${manrope.className} fixed inset-0 z-[34237463223232327432] flex items-center justify-center px-5`}
      >
        {/* Blurred Background */}
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg"></div>

        {/* White card */}
        <div className="relative bg-white text-black max-w-screen-lg lg:max-w-min w-full flex items-center justify-center flex-col px-4 py-6 md:px-10 md:py-10 rounded-[35px] z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <h3 className="text-[20px] md:text-[26px] font-semibold lg:whitespace-nowrap">
              Claim your unique {domainConfig.brandName} website username today
              before it’s taken! 🚀
            </h3>
          </div>
          <ClaimForm />

          {/* Close button - top right outside the card */}
          <button
            onClick={closeBanner}
            className="absolute -top-16 right-0  bg-black bg-opacity-90 text-white p-2 rounded-full transition-all z-[3423746327432]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-8 h-8 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  );
}
