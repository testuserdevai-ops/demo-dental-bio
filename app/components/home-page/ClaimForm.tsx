"use client";
import React, { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/app/lib/supabaseClient";
import ErrorMessage from "../ErrorMessage";
import { Manrope } from "next/font/google";
import { registerUsernameSchema } from "@/lib/validation";

const manrope = Manrope({ subsets: ["latin"] });

function ChevRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

// Restricted Usernames Lists
const restrictedUsernames: string[] = [
  "Admin",
  "Administrator",
  "Help",
  "Support",
  "Info",
  "Contact",
  "Webmaster",
  "Moderator",
  "System",
  "Root",
  "Mail",
  "Email",
  "User",
  "Username",
  "Host",
  "Server",
  "Postmaster",
  "Noreply",
  "Feedback",
  "Privacy",
  "Security",
  "Legal",
  "Terms",
  "Abuse",
  "Staff",
  "Team",
  "Owner",
  "Manager",
  "Network",
  "Guest",
  "Register",
  "Signup",
  "Profile",
  "Account",
  "Success",
];


const offensiveUsernames: string[] = [
  "Fuck",
  "Fucker",
  "Bitch",
  "Bastard",
  "Asshole",
  "Ass",
  "Dick",
  "Pussy",
  "Shit",
  "Cunt",
  "Nigger",
  "Faggot",
  "Whore",
  "Slut",
  "Cum",
  "Suck",
  "Anal",
  "Rape",
  "Kill",
  "Murder",
  "Die",
  "Nazi",
  "Hitler",
  "Satan",
  "Devil",
  "Jesus",
  "Christ",
  "God",
  "Allah",
  "Buddha",
  "Mohammed",
  "Isis",
  "Jihad",
  "Terrorist",
  "Bomb",
  "Pedo",
  "Pedophile",
  "Molest",
  "Molester",
  "Incest",
  "Heroin",
  "Cocaine",
  "Meth",
  "Weed",
  "Porn",
  "Pornstar",
];


const brandNames: string[] = [
  "Google",
  "Facebook",
  "Instagram",
  "Twitter",
  "X",
  "LinkedIn",
  "Snapchat",
  "WhatsApp",
  "Microsoft",
  "Apple",
  "Amazon",
  "Netflix",
  "Spotify",
  "YouTube",
  "TikTok",
  "Adobe",
  "Oracle",
  "IBM",
  "Samsung",
  "Intel",
  "Sony",
  "Huawei",
  "Dell",
  "HP",
  "Nike",
  "Adidas",
  "Puma",
  "Reebok",
  "CocaCola",
  "Pepsi",
  "McDonalds",
  "BurgerKing",
  "Starbucks",
  "Disney",
  "Marvel",
  "WarnerBros",
];


const inappropriatePatterns: string[] = [
  "Fck",
  "Fcuk",
  "Fxck",
  "Btch",
  "B1tch",
  "Bstard",
  "A$$",
  "D1ck",
  "Sh!t",
  "N*gger",
  "Wh*re",
  "C*m",
  "R*pe",
  "K*ll",
  "N*zi",
  "J*sus",
  "G*d",
  "All*h",
  "M*ther",
  "Is!s",
  "J!had",
];


export default function ClaimForm() {

  const searchParams = useSearchParams();
  const inviteUserId = searchParams.get("referral");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subErrorMessage, setSubErrorMessage] = useState<string | null>(null);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isRestrictedUsername = (username: string): boolean => {
    const loweredUsername = username.toLowerCase().trim(); // Ensure we are using a trimmed, lowercase version

    return (
      restrictedUsernames.map(name => name.toLowerCase()).includes(loweredUsername) ||  // Check restricted usernames
      offensiveUsernames.some((word) =>
        loweredUsername.includes(word.toLowerCase()) // Check offensive words
      ) ||
      brandNames.map(name => name.toLowerCase()).includes(loweredUsername) ||  // Check brand names
      inappropriatePatterns.some((pattern) =>
        loweredUsername.includes(pattern.toLowerCase()) // Check inappropriate patterns
      )
    );
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = registerUsernameSchema.safeParse({ username });

    if (!result.success) {
      setErrorMessage(result.error.issues[0].message);
      return;
    }

    if (!username) {
      setErrorMessage("Please enter a username.");
      return;
    }

    if (isRestrictedUsername(username)) {
      setErrorMessage("This username is not allowed.");
      return;
    }

    setErrorMessage(null); // Reset error message

    try {
      // Convert the input username to lowercase for comparison
      const loweredUsername = username.toLowerCase();

      // Check if a case-insensitive match exists in the database
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .ilike("username", loweredUsername); // Use ilike for case-insensitive matching

      if (error) {
        console.error("Error fetching username:", error.message);
        setErrorMessage("An error occurred while checking the username.");
        return;
      }

      if (data && data.length > 0) {
        setErrorMessage("Oops! That username is taken.");
        setSubErrorMessage("Choose a different one or get creative!");
        return;
      }

      // If the username is available, store the original case-sensitive username and proceed
      if (inviteUserId) {
        router.replace(`/register/?username=${username}&referral=${inviteUserId}`)
      } else router.replace(`/register/?username=${username}`)
    } catch (err) {
      console.error("Unexpected error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\s+/g, "");
    setUsername(input.toLowerCase());
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <form
        onSubmit={handleSubmit}
        className={`${manrope.className} max-w-[350px] md:max-w-[400px] w-full font-normal rounded-full border-[0.6px] shadow-sm bg-white z-50 border-[#8d8d8d] p-1 flex items-center justify-between transition-all duration-300 ease-in-out`}
      >
        <div
          className="flex-1 flex items-center gap-0.5 mt-0 cursor-text pl-1"
          onClick={focusInput}
        >
          <span className="text-[20px] md:text-[22px] text-gray-500 pl-2">
            dental.bio/
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="yourname"
            value={username}
            onChange={handleUsernameChange} // Updated to handle spaces
            className="w-full bg-transparent placeholder:text-[20px] md:placeholder:text-[22px] text-[20px] md:text-[22px] border-none focus:outline-none py-2 pl-0 px-3 text-gray-700"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <button
          className="relative flex gap-2 items-center justify-between bg-gradient-to-r from-[#e1768b] via-[#e78f82] to-[#f5be5d] cursor-pointer select-none text-white rounded-full py-3 px-5 pr-3 mr-[0.4px] text-[20px] md:text-[22px]"
          type="submit"
        >
          <span>Claim</span>
          <ChevRight />
        </button>
      </form>

      {errorMessage && (
        <div className="pt-6 mx-auto">
          <ErrorMessage
            errorMessage={errorMessage}
            subError={subErrorMessage || ""}
          />
        </div>
      )}
    </div>
  );
}
