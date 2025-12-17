'use client';
import Image from "next/image";

import { Manrope } from "next/font/google";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const manrope = Manrope({ subsets: ["latin"] });

export default function Section3({ sectionThreeData }: any) {
  const domainConfig = useDomainConfig();
  return (
    <div className="max-w-screen-2xl w-full px-5 md:px-10 xl:px-32 mt-14 gap-6 md:gap-14 mx-auto flex flex-col-reverse md:flex-row items-center  text-center md:text-start justify-center">
      <Image
        src={"/section-3-1.webp"}
        width={550}
        height={550}
        alt={`Dentists ${domainConfig.brandName} article examples`}
        className="aspect-square rounded-3xl w-full md:w-[400px] lg:w-[550px]"
      />

      <div className="flex flex-col items-center md:items-start">
        <h2
          className={`${manrope.className} text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-[45px] md:whitespace-nowrap font-semibold leading-tight xl:leading-tight mb-6 text-primary-3`}
        >
          {sectionThreeData.title}
        </h2>
        <p className=" text-lg md:text-xl px-4 md:px-0 text-dark font-medium -mt-5 md:-mt-3 ">
          {sectionThreeData.description}
        </p>
        <Image
          src={"/section-3-2.svg"}
          width={700}
          height={550}
          alt={`Google ranking of ${domainConfig.brandName} website`}
          className="rounded-3xl p-0 mt-3 md:mt-8"
        />
      </div>
    </div>
  );
}
