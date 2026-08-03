"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Manrope } from "next/font/google";
import React, { useState, useEffect, useCallback } from "react";
import Dropdown from "../components/Dropdown";
import CustomInput from "./CustomInput";
import CustomButton from "./CustomButton";
import ClaimForm from "../components/home-page/ClaimForm";
import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import ErrorMessage from "../components/ErrorMessage";
import OtpInput from "../components/OtpInput";
import { countries, positions, titles } from "@/utils/global_constants";
import { getUserLocation } from "../../utils/functions/getUserIp";
import { passwordRules, registerSchema } from "@/lib/validation";
import { isValidUsername, parseAnyDate } from "@/utils/functions/functions";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { useDeviceFingerprint } from "@/utils/hooks/useDeviceFingerprint";
import { getDomainConfigByHostname } from "@/utils/domainConfig";

const manrope = Manrope({ subsets: ["latin"] });

export default function Page() {
  const searchParams = useSearchParams();
  const usernameFromUrl = searchParams.get("username");
  const inviteUserName = searchParams.get("referral");
  const requestedDomain = searchParams.get("domain");
  const router = useRouter();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const detectedDomainConfig = useDomainConfig();
  const requestedDomainConfig = requestedDomain
    ? getDomainConfigByHostname(requestedDomain)
    : null;
  const domainConfig =
    requestedDomainConfig?.domain === requestedDomain
      ? requestedDomainConfig
      : detectedDomainConfig;
  const deviceFingerprint = useDeviceFingerprint();

  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    lastName: "",
    birthday: "",
    offerCode: "",
    position: "",
    country: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [detailedErrorMessage, setDetailedErrorMessage] = useState<
    Record<string, string>
  >({
    title: "",
    firstName: "",
    lastName: "",
    birthday: "",
    offerCode: "",
    position: "",
    country: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordRequirements, setPasswordRequirements] =
    useState<{ id: string; label: string; passed: boolean }[]>();

  const [isMessageForStudent, setIsMessageForStudent] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subErrorMessage, setSubErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  // OTP states
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState<string[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);

  const COOLDOWN_TIME = 60 * 1000; // 1-minute cooldown

  // Handle input changes
  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (submittedOnce) {
      setTimeout(() => {
        handleValidation();
      }, 500);
    }
  }, [formData]);

  useEffect(() => {
    setTimeout(() => {
      checkPasswordRules();
    }, 500);
  }, [formData.password]);

  useEffect(() => {
    const setInitialCountry = async () => {
      const country: string = await getUserLocation();
      setLocation(country);
      setFormData((prev) => ({ ...prev, country }));
    };

    setInitialCountry();
    checkPasswordRules();
  }, []);

  // OTP cooldown effect
  useEffect(() => {
    const savedCooldown = localStorage.getItem("registerCooldown");

    if (savedCooldown) {
      const timeLeft = Number(savedCooldown) - Date.now();
      if (timeLeft > 0) {
        setCooldown(timeLeft);

        const countdownInterval = setInterval(() => {
          setCooldown((prev) => {
            if (prev === null || prev <= 1000) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1000;
          });
        }, 1000);

        return () => clearInterval(countdownInterval);
      }
    }
  }, []);

  useEffect(() => {
    if (parseAnyDate(formData.birthday)! > new Date()) {
      handleInputChange("birthday", new Date().toString());
    }
  }, [formData.birthday]);

  // Handle OTP change from component
  const handleOtpChange = (newOtp: string[]) => {
    setOtp(newOtp);
  };

  // Handle OTP completion
  const handleOtpComplete = (otpString: string) => {
    verifyOtp(otpString);
  };

  const handleValidation = () => {
    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      console.log(result);

      setErrorMessage("Oops! It looks like you missed some fields.");
      setSubErrorMessage(result.error.issues[0].message);

      const parsedError = result.error.issues.reduce<Record<string, string>>(
        (acc, item) => {
          acc[item.path[0] as string] = item.message;
          return acc;
        },
        {},
      );

      setDetailedErrorMessage(parsedError);

      return false;
    }

    setErrorMessage("");
    setSubErrorMessage("");
    setDetailedErrorMessage({});

    return true;
  };

  const checkPasswordRules = () => {
    setPasswordRequirements(
      passwordRules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        passed: rule.validate(formData.password),
      })),
    );
  };

  // Handle form submission - now sends OTP instead of registering directly
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmittedOnce(true);

    const isValid = handleValidation();

    if (!isValid) {
      return;
    }

    if (!isValidUsername(usernameFromUrl!)) {
      setErrorMessage("Oops! It looks like you missed some fields.");
      setSubErrorMessage(
        "Username must be 3–30 characters and can only include letters, numbers, dots, underscores, and hyphens.",
      );

      return;
    }

    if (cooldown) {
      setErrorMessage("Please wait before requesting another OTP.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // Send OTP to email
    const response = await fetch("/api/register/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isResend: false,
        email: formData.email,
        password: formData.password,
        username: usernameFromUrl || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthday: formData.birthday ? formData.birthday : null,
        position: formData.position,
        offerCode: formData.offerCode,
        country: formData.country,
        title: formData.title,
        inviteUserName,
        location,
        domain: domainConfig.domain,
        brand: domainConfig.brandName,
        vertical: domainConfig.vertical,
        deviceFingerprint,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setStep("otp");
      setOtp([]);
      setCooldown(COOLDOWN_TIME);
      localStorage.setItem(
        "registerCooldown",
        (Date.now() + COOLDOWN_TIME).toString(),
      );

      // Start the countdown
      const countdownInterval = setInterval(() => {
        setCooldown((prev) => {
          if (prev === null || prev <= 1000) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1000;
        });
      }, 1000);

      // Clear countdown after timeout
      setTimeout(() => {
        setCooldown(null);
        localStorage.removeItem("registerCooldown");
        clearInterval(countdownInterval);
      }, COOLDOWN_TIME);
    } else {
      setErrorMessage(data.error || "There was an issue sending OTP.");
      setSubErrorMessage("Please try again.");
    }
    setLoading(false);
  };

  // Verify OTP and complete registration
  const verifyOtp = async (otpString?: string) => {
    setOtpLoading(true);
    setErrorMessage("");

    const response = await fetch("/api/register/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        username: usernameFromUrl || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthday: formData.birthday ? formData.birthday : null,
        position: formData.position,
        offerCode: formData.offerCode,
        country: formData.country,
        title: formData.title,
        otp: otpString || otp.join(""),
        inviteUserName,
        location,
        domain: domainConfig.domain,
        brand: domainConfig.brandName,
        vertical: domainConfig.vertical,
        deviceFingerprint,
      }),
    });

    const data = await response.json();
    setOtpLoading(false);

    if (response.ok) {
      router.push(`/dashboard`);
    } else {
      setErrorMessage(
        data.error || "Invalid or expired OTP. Please try again or resend.",
      );
      setOtp([]);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    const response = await fetch("/api/register/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isResend: true,
        email: formData.email,
        password: formData.password,
        username: usernameFromUrl || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthday: formData.birthday ? formData.birthday : null,
        position: formData.position,
        offerCode: formData.offerCode,
        country: formData.country,
        title: formData.title,
        inviteUserName,
        location,
        domain: domainConfig.domain,
        brand: domainConfig.brandName,
        vertical: domainConfig.vertical,
        deviceFingerprint,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      setOtp([]);
    } else {
      setErrorMessage(data.error || "Error resending OTP.");
    }
  };

  // Go back to form
  const handleBackToForm = () => {
    setStep("form");
    setOtp([]);
    setErrorMessage(null);
  };

  useEffect(() => {
    const isEligible = () => {
      // Parse the "dd/mm/YY" format correctly
      const [day, month, year] = formData.birthday.split("/").map(Number);

      const birthday = new Date(year, month - 1, day); // Month is 0-based
      const now = new Date();

      // Calculate age
      let age = now.getFullYear() - birthday.getFullYear();

      // Adjust if birthday hasn't occurred yet this year
      const hasBirthdayPassed =
        now.getMonth() > birthday.getMonth() ||
        (now.getMonth() === birthday.getMonth() &&
          now.getDate() >= birthday.getDate());

      if (!hasBirthdayPassed) {
        age -= 1;
      }
      return age < 27 && formData.position === "Student";
    };

    setIsMessageForStudent(isEligible());
  }, [formData.birthday, formData.position]);

  return (
    <>
      <div
        className={`${manrope.className} text-center flex flex-col justify-start items-center py-10 gap-5 pt-20 min-h-screen`}
      >
        {!usernameFromUrl ? (
          <div className=" h-full text-center flex flex-col justify-between items-center py-10 gap-32">
            <div className="flex flex-col justify-center items-center gap-5">
              <span className="text-[23px] md:text-[26px] font-semibold bg-gradient-to-r mb-3 from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent">
                Choose your username
              </span>
              <ClaimForm />
            </div>
            <Link href={"/"} className=" mt-20">
              <Image
                src={domainConfig.logoPath}
                width={150}
                height={40}
                alt="Footer logo"
                className="mb-10 mt-20"
              />
            </Link>
          </div>
        ) : step === "form" ? (
          <>
            <span className="text-dark font-medium text-sm -mb-2">
              Congratulations!
            </span>
            <span className="max-w-full px-5 text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gradient-purple via-gradient-coral to-gradient-orange bg-clip-text text-transparent break-words">
              {domainConfig.domain}/{usernameFromUrl}
            </span>
            <span className="text-dark font-medium text-sm -mt-2">
              is available, make it yours:
            </span>
            <span className="text-3xl md:text-4xl font-bold text-dark mt-4 -mb-6">
              Almost there
            </span>

            <div className="space-y-7 max-w-screen-sm w-full">
              <Dropdown
                selected={formData.title}
                onSelect={(value) => handleInputChange("title", value)}
                options={titles}
                label="Title"
                size="lg"
                showLabel={false}
                errorMessage={detailedErrorMessage.title}
              />
              <CustomInput
                value={formData.email}
                onChange={(value) => handleInputChange("email", value)}
                placeholder="Email"
                name="email"
                type="email"
                errorMessage={detailedErrorMessage.email}
                required
              />
              <CustomInput
                value={formData.firstName}
                onChange={(value) => handleInputChange("firstName", value)}
                placeholder="First Name"
                name="firstName"
                errorMessage={detailedErrorMessage.firstName}
                required
              />
              <CustomInput
                value={formData.lastName}
                onChange={(value) => handleInputChange("lastName", value)}
                placeholder="Last Name"
                name="lastName"
                errorMessage={detailedErrorMessage.lastName}
                required
              />
              <CustomInput
                value={formData.birthday}
                onChange={(value) => handleInputChange("birthday", value)}
                type="date"
                placeholder="Date of Birth"
                errorMessage={detailedErrorMessage.birthday}
                required
              />
              <Dropdown
                selected={formData.position}
                onSelect={(value) => handleInputChange("position", value)}
                options={domainConfig.positions}
                label="Position"
                size="lg"
                showLabel={false}
                isLabelBottom={isMessageForStudent}
                labelBottom="Congratulations! You have unlock pro plan for 6 months"
                errorMessage={detailedErrorMessage.position}
              />
              <Dropdown
                selected={formData.country}
                onSelect={(value) => handleInputChange("country", value)}
                options={countries}
                label="Country"
                size="lg"
                showLabel={false}
                searchable={true}
                errorMessage={detailedErrorMessage.country}
              />
              <CustomInput
                value={formData.offerCode}
                onChange={(value) => handleInputChange("offerCode", value)}
                placeholder="Offer Code"
                name="offerCode"
                labelBottom="If you have received an offer code from your university or colleague, please enter it here to enjoy extended trial perks."
                errorMessage={detailedErrorMessage.offerCode}
              />
              <CustomInput
                value={formData.password}
                onChange={(value) => handleInputChange("password", value)}
                placeholder="Password"
                type="password"
                errorMessage={detailedErrorMessage.password}
                required
              />
              <div className="relative top-1 left-1/2 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 text-left pl-12">
                {passwordRequirements?.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-2 ${rule.passed ? "text-primary-green-1" : "text-red-500"}`}
                  >
                    {rule.passed ? <CheckCircleIcon /> : <XCircleIcon />}
                    {rule.label}
                  </div>
                ))}
              </div>
              <CustomInput
                value={formData.confirmPassword}
                onChange={(value) =>
                  handleInputChange("confirmPassword", value)
                }
                placeholder="Confirm Password"
                type="password"
                errorMessage={detailedErrorMessage.confirmPassword}
                containerClassName="!top-0"
                required
              />
              {errorMessage && (
                <div className="pt-8 text-center px-5">
                  <ErrorMessage
                    errorMessage={errorMessage}
                    subError={subErrorMessage || ""}
                  />
                </div>
              )}
              <CustomButton
                text={loading ? "Sending OTP..." : `Claim @${usernameFromUrl}`}
                onClick={handleSubmit}
              />
            </div>
            <span className=" mt-10">
              Already have an account?{" "}
              <Link href={"/login"} className="underline">
                Log in
              </Link>
            </span>
            <Link href={"/"}>
              <Image
                src={domainConfig.logoPath}
                width={150}
                height={40}
                alt="Footer logo"
                className="mb-10 mt-20"
              />
            </Link>
          </>
        ) : (
          // OTP Step
          <>
            <span className="text-dark font-medium text-sm -mb-2">
              Verify your email
            </span>
            <span className="max-w-full px-5 text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gradient-purple via-gradient-coral to-gradient-orange bg-clip-text text-transparent break-words">
              {domainConfig.domain}/{usernameFromUrl}
            </span>
            <span className="text-dark font-medium text-sm -mt-2">
              is almost yours!
            </span>
            <span className="max-w-full break-words px-2.5 text-2xl font-bold text-dark mt-4">
              Enter the 6-digit code sent to
              <br />
              {formData.email}
            </span>

            <OtpInput
              length={6}
              onOtpChange={handleOtpChange}
              onComplete={handleOtpComplete}
              disabled={otpLoading}
              loading={otpLoading}
              className="mt-6"
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter the 6-digit code sent to your email.
            </p>

            {otpLoading && (
              <div className="flex justify-center items-center mt-4 mb-2">
                <svg
                  className="animate-spin h-7 w-7 text-btn-gradient-rose"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="ml-2 text-btn-gradient-rose font-medium text-lg">
                  Verifying...
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="pt-2 text-red-600">
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="flex flex-col justify-center items-center w-full px-5">
              <button
                onClick={handleResendOtp}
                disabled={loading || otpLoading || cooldown !== null}
                className="mt-4 max-w-xl w-full text-lg font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Resending..."
                  : cooldown !== null
                    ? `Try again in ${Math.ceil(cooldown / 1000)}s`
                    : "Resend OTP"}
              </button>
              <button
                onClick={handleBackToForm}
                className="mt-2 max-w-xl w-full text-lg font-semibold bg-white text-btn-gradient-rose rounded-[40px] border-[0.6px] border-btn-gradient-rose shadow-sm py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
              >
                Back to Form
              </button>
            </div>

            <Link href={"/"}>
              <Image
                src={domainConfig.logoPath}
                width={150}
                height={40}
                alt="Footer logo"
                className="mb-10 mt-20"
              />
            </Link>
          </>
        )}
      </div>
    </>
  );
}
