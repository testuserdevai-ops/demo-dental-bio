"use client";
import { login } from "./actions";
import { SubmitButton } from "./SubmitButton";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import XIcon from "@/app/components/XIcon";
import ErrorMessage from "@/app/components/ErrorMessage";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

export default function LoginPage() {
  const domainConfig = useDomainConfig();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await login(formData);
    if (result?.error) {
      setErrorMessage(result.error); // Set error message
    }
  }

  return (
    <div className="text-center flex flex-col justify-center items-center py-10 gap-5">
      <p className="font-semibold text-2xl md:text-3xl mt-20 max-w-screen-md w-full text-center bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent">
        Email successfully verified. <br />
        You can now log in.
      </p>

      <form action={handleSubmit} className="space-y-5 w-full max-w-md">
        {/* Styled email input */}
        <div className="relative z-50 left-1/2 top-5 transform -translate-x-1/2 max-w-lg w-full px-5 mt-5">
          <div className="max-w-lg w-full rounded-[30px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-3 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              className="w-full bg-transparent text-base text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
            />
          </div>
        </div>

        {/* Styled password input */}
        <div className="relative z-50 left-1/2 top-5 transform -translate-x-1/2 max-w-lg w-full px-5 mt-5">
          <div className="max-w-lg w-full rounded-[30px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-3 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              required
              className="w-full bg-transparent text-base text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
            />
          </div>
        </div>
        {errorMessage && (
          <div className="pt-6">
            <ErrorMessage errorMessage={errorMessage} />
          </div>
        )}
        <SubmitButton />
      </form>
      <Link href={"/"}>
        <Image
          src={domainConfig.logoPath}
          width={150}
          height={25}
          alt={`${domainConfig.brandName} navigation bar logo`}
          className="px-4 pt-20"
        />
      </Link>
    </div>
  );
}
