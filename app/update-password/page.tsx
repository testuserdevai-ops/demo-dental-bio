"use client";

import { Manrope } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import FullRoundedButton from "../components/Button/FullRoundedButton";
import { toast } from 'react-toastify';

const manrope = Manrope({ subsets: ["latin"] });

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (!error) {
      toast.success("Password updated successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 2000); // Redirect after 3 seconds
    } else toast.error(`Failed to update password: ${error.message}`)
    setIsLoading(false)
  }

  return (
    <div className={`${manrope.className} text-center flex flex-col items-center py-20 gap-5 h-screen`}>
      <span className="text-dark font-medium text-sm -mb-2">Reset your password</span>
      <h1 className="text-3xl pb-2 font-extrabold bg-gradient-to-r from-[#8866e9] via-[#cb7470] to-[#ed8b39] bg-clip-text text-transparent">
        Update Password
      </h1>

      <form onSubmit={handleUpdatePassword} className="space-y-5 w-full max-w-xl">

        {/* New Password Field */}
        <div className="relative z-50 font-semibold left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
          <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
            <input
              type="password"
              name="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
            />
          </div>

          <FullRoundedButton
            className="mt-10 w-full text-2xl font-semibold bg-gradient-to-r from-[#d47e8b] via-[#d47e8b] to-[#e09f7e] text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent !py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
            isLoading={isLoading}
            type="submit"
          >
            Update Password
          </FullRoundedButton>
        </div>
      </form>

      <Link href={"/"}>
        <Image
          src={"/logo.svg"}
          width={150}
          height={25}
          alt="Logo"
          className="px-4 pt-20"
        />
      </Link>
    </div>
  );
}
