"use client";
import { motion } from "framer-motion";
import ClaimForm from "./ClaimForm";
import HeroImages from "./HeroImages";
import { Manrope } from "next/font/google";
import { replaceInString } from "@/utils/functions/functions";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";


const manrope = Manrope({ subsets: ["latin"] });


// Flip effect for text elements (rotating from X axis)
const flipUpVariants = {
  hidden: { opacity: 0, rotateX: -90 },
  visible: { opacity: 1, rotateX: 0, transition: { duration: 0.8 } },
};

export default function Hero({ heroData }: any) {
  const domainConfig = useDomainConfig();

  return (
    <div className="hero-section text-center mt-32 md:mt-40 z-0">
      {/* This div wraps the text elements */}
      <motion.div
        className="max-w-screen-xl z-0 bg-transparent px-5 lg:px-32 mx-auto"
        initial="hidden"
        animate="visible"
        variants={flipUpVariants} // Apply the flip-up effect
      >
        <motion.h1
          className={`${manrope.className} text-3xl sm:text-4xl lg:text-[64px] font-bold md:leading-[1.2] lg:leading-[1.2] 2xl:leading-[1.2] mb-5 bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent px-3 sm:px-5 md:px-20 lg:px-2 sm:max-w-screen-md md:max-w-screen-lg mx-auto`}
          variants={flipUpVariants} // Flip up the title
        >
          {replaceInString(heroData.hero_title, "{{vertical}}", domainConfig.vertical)}
        </motion.h1>
        {/* <ExampleBtn /> */}
        <div className=" mx-auto mt-10 z-[99999] bg-transparent mb-12 flex items-center justify-center">
          <ClaimForm />
        </div>
        <motion.h2
          className=" text-base sm:text-lg z-0 bg-transparent md:text-xl leading-snug md:leading-tight px-3 md:px-2 font-semibold text-dark mt-8"
          variants={flipUpVariants} // Flip up the subtitle
        >
          {replaceInString(heroData.hero_subtitle_bold, "{{brand}}", domainConfig.brandName)}
        </motion.h2>
        <motion.p
          className=" text-base sm:text-lg md:text-xl z-0 bg-transparent leading-snug md:leading-tight px-3 lg:pt-1.5 md:px-2 text-dark"
          variants={flipUpVariants} // Flip up the regular subtitle
        >
          {heroData.hero_subtitle_regular}
        </motion.p>
      </motion.div>

      {/* The HeroImages component is still here, working fine */}
      <HeroImages menuImage={domainConfig.menuImage}/>
    </div>
  );
}
