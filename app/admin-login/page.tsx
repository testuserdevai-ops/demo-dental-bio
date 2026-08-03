"use client";

import { useState, useEffect } from "react";
import { login } from "./actions";
import { SubmitButton } from "./SubmitButton";
import { Manrope } from "next/font/google";
import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import ErrorMessage from "@/app/components/ErrorMessage"; // Assuming you have this component
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const manrope = Manrope({ subsets: ["latin"] });
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 1 * 60 * 1000; // 1 minute in milliseconds

const LoginPage = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subErrorMessage, setSubErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const domainConfig = useDomainConfig();
  const domain = domainConfig.domain;
  useEffect(() => {
    const savedAttempts = localStorage.getItem("loginAttempts");
    const savedLockoutEndTime = localStorage.getItem("lockoutEndTime");

    if (savedAttempts) {
      setAttempts(Number(savedAttempts));
    }

    if (savedLockoutEndTime) {
      const lockoutEnd = Number(savedLockoutEndTime);
      if (lockoutEnd > Date.now()) {
        setIsLocked(true);
        setLockoutEndTime(lockoutEnd);
      }
    }
  }, []);

  useEffect(() => {
    if (isLocked && lockoutEndTime) {
      const timer = setTimeout(() => {
        setIsLocked(false);
        setAttempts(0);
        localStorage.removeItem("lockoutEndTime");
        localStorage.removeItem("loginAttempts");
      }, lockoutEndTime - Date.now());

      return () => clearTimeout(timer);
    }
  }, [isLocked, lockoutEndTime]);

  async function handleSubmit(formData: FormData) {
    if (isLocked) {
      setErrorMessage("Too many unsuccessful attempts.");
      setSubErrorMessage("Please wait a few minutes before trying again.");
      return;
    }

    const result = await login(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("loginAttempts", newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutEnd = Date.now() + LOCKOUT_TIME;
        setIsLocked(true);
        setLockoutEndTime(lockoutEnd);
        localStorage.setItem("lockoutEndTime", lockoutEnd.toString());
        setErrorMessage("Too many unsuccessful attempts.");
        setSubErrorMessage("Please wait a few minutes before trying again.");
      } else {
        setErrorMessage(result.error);
        // setSubErrorMessage("Please try again.");
      }
    } else {
      // Reset attempts on successful login
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("lockoutEndTime");
      setAttempts(0);
    }
  }

  return (
    <div
      className={`${manrope.className} text-center flex flex-col justify-center items-center py-20 gap-5`}
    >
      <span className="text-dark font-medium text-sm -mb-2">Welcome back!</span>
      <h1 className="text-3xl pb-2 font-extrabold bg-gradient-to-r from-gradient-purple via-gradient-coral to-gradient-orange bg-clip-text text-transparent">
        Login as Admin
      </h1>

      <form action={handleSubmit} className="space-y-5 w-full max-w-xl">
        {/* Styled email input */}
        <div className="relative z-50 font-semibold left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
          <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
              required
            />
          </div>
        </div>

        {/* Styled password input */}
        <div className="relative z-50 font-semibold left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
          <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
              required
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="pt-6">
            <ErrorMessage errorMessage={errorMessage} />
          </div>
        )}

        {/* Submit button */}
        <SubmitButton disabled={isLocked} />
      </form>

      <span className=" mt-10">
        <Link href={"/forgot-password"} className="underline">
          Forgot password?
        </Link>
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
    </div>
  );
};

export default LoginPage;
