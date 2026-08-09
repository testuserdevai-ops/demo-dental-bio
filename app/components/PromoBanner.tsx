"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ClaimForm from "./home-page/ClaimForm";
import { Manrope } from "next/font/google";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

const manrope = Manrope({ subsets: ["latin"] });

export default function PromoBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const domainConfig = useDomainConfig();

  const handleScroll = useCallback(() => {
    if (window.scrollY > 800 && !hasScrolled) {
      previouslyFocusedElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setIsOpen(true);
      setHasScrolled(true);
    }
  }, [hasScrolled]);

  const closeBanner = () => {
    setIsOpen(false);
    requestAnimationFrame(() => {
      previouslyFocusedElementRef.current?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeBanner();
      }}
    >
      <DialogContent
        className={`${manrope.className} max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto rounded-[35px] bg-white px-4 py-6 text-black md:px-10 md:py-10`}
      >
        <DialogHeader className="mb-8 pr-10 text-center">
          <DialogTitle className="text-balance text-[20px] font-semibold leading-tight md:text-[26px]">
            Claim your unique {domainConfig.brandName} website username today
            before it’s taken! 🚀
          </DialogTitle>
          <DialogDescription className="sr-only">
            Claim your website username before it is taken.
          </DialogDescription>
        </DialogHeader>
        <ClaimForm />
      </DialogContent>
    </Dialog>
  );
}
