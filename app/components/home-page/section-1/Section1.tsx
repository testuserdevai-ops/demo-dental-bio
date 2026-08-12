"use client";

import Image from "@/app/components/Image/SafeImage";
import ClaimForm from "../ClaimForm";
import { Manrope } from "next/font/google";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const manrope = Manrope({ subsets: ["latin"] });

export default function Section1({ sectionOneData }: any) {
  const domainConfig = useDomainConfig();
  return (
    <div className="max-w-screen-2xl w-full px-5 md:px-10 xl:px-32 md:mt-14 gap-6 md:gap-10 xl:gap-14 mx-auto flex flex-col-reverse md:flex-row items-center  text-center md:text-start justify-center">
      <Image
        src={domainConfig.heroImage}
        width={550}
        height={550}
        alt={`Dentists holding phone with ${domainConfig.brandName} website`}
        className="aspect-square rounded-3xl w-[326px] md:w-[300px] lg:w-[450px] xl:w-[550px]"
      />

      <div className="flex w-full min-w-0 flex-1 flex-col items-center md:items-start">
        <h2
          className={`${manrope.className} text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-[45px] md:whitespace-nowrap font-semibold leading-tight xl:leading-tight mb-6 text-primary-3`}
        >
          {sectionOneData.title}
        </h2>
        <p className=" text-lg md:text-xl px-4 md:px-0 text-dark font-medium -mt-5 md:-mt-3 ">
          {sectionOneData.description}
        </p>
        <div className="mt-6 w-full">
          <ClaimForm />
        </div>
      </div>
    </div>
  );
}
