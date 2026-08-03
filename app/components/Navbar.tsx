"use client";
import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

export default function Navbar() {
  const domainConfig = useDomainConfig();

  return (
    <nav className="fixed z-[999999999] left-1/2 top-4 transform -translate-x-1/2 md:max-w-[600px] max-w-lg w-full px-5">
      <div className="max-w-[600px] w-full rounded-[30px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-1 px-2 flex flex-row items-center justify-between transition-all duration-300 ease-in-out h-[60px]">
        {/* Top Row with Logo and Hamburger */}
        <div className="w-full flex justify-between items-center">
          {/* Logo on the left */}
          <Link href={"/"}>
            {domainConfig.logoPath && (
              <Image
                src={domainConfig.logoPath}
                width={150}
                height={30}
                alt={`${domainConfig.brandName} navigation bar logo`}
                className="px-3 "
              />
            )}
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2.5 mt-0">
          <Link
            href={"/#features"}
            className="bg-transparent px-4 py-2.5 rounded-full hidden md:block transition-all text-base whitespace-nowrap text-dark"
          >
            Features
          </Link>
          <Link
            href={"/register"}
            className="bg-primary-3 px-4 py-2.5 rounded-full hidden sm:block hover:bg-opacity-80 transition-all text-base whitespace-nowrap text-white"
          >
            Join free
          </Link>
          <Link
            href={"https://digimax.uk/dentalbio/"}
            target="_blank"
            className="bg-primary-4 px-4 py-2.5 rounded-full hover:bg-opacity-80 transition-all text-base whitespace-nowrap text-white"
          >
            Example
          </Link>
          <Link
            href={"/login"}
            className="bg-primary-3 px-4 py-2.5 rounded-full hover:bg-opacity-80 transition-all text-base whitespace-nowrap text-white"
          >
            Log in
          </Link>
        </div>
      </div>
    </nav>
  );
}
