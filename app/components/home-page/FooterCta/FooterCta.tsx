"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import { ParallaxProvider, Parallax } from "react-scroll-parallax";
import { replaceInString } from "@/utils/functions/functions";
import { getDomainConfig } from "@/utils/domainConfig";

type Props = { footerCtaData: any };

// Slide up effect for the primary image
const slideUpVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

// Fade-in effect for the blurred background
const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, delay: 0.2 } },
};

export default function FooterCta({ footerCtaData }: Props) {
  return (
    <ParallaxProvider>
      <div className="max-w-screen-2xl z-0 relative w-full px-5 md:px-14 lg:px-20 mt-20 flex items-center justify-center">
        <div className="relative flex flex-col justify-start max-h-[850px] rounded-3xl items-center max-w-screen-xl w-full bg-[#f1f1f1] overflow-clip p-16 gap-10">
          {/* Title */}
          <div className="text-3xl z-[99999] md:text-5xl lg:text-6xl font-medium max-w-xl text-center py-2 leading-snug bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent">
            {replaceInString(footerCtaData?.title, "{{brand}}", getDomainConfig().brandName)}
          </div>
          {/* CTA Button */}
          <Link
            href={"/register"}
            className="bg-primary-3 z-[99999] px-4 py-2 rounded-full hover:bg-opacity-80 transition-all text-base whitespace-nowrap text-white"
          >
            Sign up free
          </Link>

          {/* Primary Image with Slide-Up Effect */}
          <motion.div
            className="relative z-[99999]"
            variants={slideUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ transition: "transform 0.2s ease" }}
          >

              <Image
                src="/previews/primary.webp"
                alt="Primary"
                className=" mb-32 md:mb-0"
                width={400}
                height={1000}
              />

          </motion.div>

          {/* Blurred Background with Fade-in Effect */}
          <div
            className="blured-bg-cta top-60 z-10 absolute"
          />
        </div>
      </div>
    </ParallaxProvider>
  );
}
