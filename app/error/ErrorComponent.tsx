'use client'
import { useEffect } from "react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useError } from "../contexts/ErrorContext";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const manrope = Manrope({ subsets: ["latin"] });

export default function ErrorComponent() {
  const { errorMessage, setErrorMessage } = useError();
  const domainConfig = useDomainConfig();
  const domain = domainConfig.domain;
  useEffect(() => {
    if (errorMessage.show && errorMessage.message) {
      toast.error(errorMessage.message);
      setErrorMessage({ message: "", show: false });
    }
  }, [errorMessage.show])

  return (
    <div
      className={`${manrope.className} text-center flex flex-col justify-center items-center py-20 gap-5`}
    >
      <h1 className="text-3xl pb-2 font-extrabold bg-gradient-to-r from-[#8866e9] via-[#cb7470] to-[#ed8b39] bg-clip-text text-transparent">
        Something went wrong
      </h1>

      <span className=" mt-10 max-w-lg text-dark">
        Please email&nbsp;
        <Link href={"mailto:support@dental.bio"} className=" font-semibold">
          support@dental.bio
        </Link>&nbsp;
        with details of what went wrong, along with the browser and device you
        were using at the time. As we are a new platform, we greatly appreciate
        your patience and error reporting, and we will do our best to resolve
        the issue promptly.
      </span>
      <Link href={"/"}>
        <Image
          src={domainConfig.logoPath}
          width={150}
          height={25}
          alt={`${domainConfig.brandName} navigation bar logo`}
          className="px-4 pt-20"
        />
      </Link>

      <ToastContainer />
    </div>
  );
}
