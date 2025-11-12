"use client";

import React, { useState, useCallback, useEffect } from "react";
import SaveButton from "../components/SaveButton";
import UsernameInput from "./UsernameInput";
import { titles } from "@/utils/global_constants";
import { CaretDown } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useRef } from "react";
import { usePreview } from "@/app/contexts/PreviewContext";
import CustomInput from "@/app/register/CustomInput";
import Dropdown from "@/app/components/Dropdown";
import { parseAnyDate } from "@/utils/functions/functions";

export default function SettingsForm({ user, targetUserId }: { user: any, targetUserId?: string }) {
  const [usernameUnique, setUsernameUnique] = useState(true);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [loading, setLoading] = useState(false);
  const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday) : null);
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const { triggerReload } = usePreview();

  // Hide calendar when clicking outside
  useEffect(() => {
    if (!showCalendar) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  // Format date as yyyy-mm-dd for input display
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handler to receive uniqueness from UsernameInput
  const handleUsernameChange = useCallback((value: string, unique: boolean, checking: boolean) => {
    setUsername(value);
    setUsernameUnique(unique);
    setUsernameChecking(checking);
  }, []);

  const router = useRouter();

  // Client-side handler to update user details
  const updateUserDetails = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const targetUserId = formData.get('targetUserId') as string;
      const supabase = createClient();
      let userId;
      try {
        userId = await getEffectiveUserId({ supabase, targetUserId });
      } catch (err) {
        router.replace("/login");
        return;
      }
      if (!userId) {
        router.replace("/login");
        return;
      }

      // Calculate age for subscription status
      const calculateAge = (birthday: string) => {
        const today = new Date();
        const birthDate = new Date(birthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const is_subscription_status = () => {
        if (calculateAge(formData.get("birthday") as string) > 27) return "FREE";
        return "PRO";
      };

      const updatedUserDetails = {
        first_name: formData.get("first_name") as string,
        middle_name: formData.get("middle_name") as string,
        last_name: formData.get("last_name") as string,
        title: formData.get("title") as string,
        birthday: formData.get("birthday") as string,
        username: formData.get("username") as string,
        subscription_status: is_subscription_status()
      };

      const { error: updateError } = await supabase
        .from("users")
        .update(updatedUserDetails)
        .eq("id", userId);
      if (updateError) {
        router.replace("/error?message=failed_to_update_user_details");
        return;
      }
      triggerReload();
    } finally {
      setLoading(false);
    }
  }, [router, triggerReload]);

  return (
    <form onSubmit={updateUserDetails} className="mb-10 ml-2" aria-disabled={loading}>
      <input type="hidden" name="targetUserId" value={targetUserId || ''} disabled={loading} />

      <Dropdown
        label="Title"
        name="title"
        selected={user.title}
        options={titles}
        size="sm"
        className="mb-3"
      />

      {/* <div className="mb-3 relative">
        <h6 className="mb-2 text-dark">Title</h6>
        <div className="relative">
          <select
            name="title"
            className="w-full appearance-none rounded-[26px] py-2 text-base px-3 text-neutral-800 pr-10"
            defaultValue={user?.title || ""}
            disabled={loading}
          >
            {titles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <CaretDown
            size={20}
            weight="bold"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
        </div>
      </div> */}

      {/* Username */}
      <UsernameInput defaultUsername={user?.username || ""} userId={user?.id} onChange={handleUsernameChange} disabled={loading} />

      {/* First Name */}
      <div className="mb-3">
        <h6 className="mb-2 text-dark">First Name</h6>
        <input
          name="first_name"
          className="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user?.first_name || ""}
          placeholder="First Name"
          disabled={loading}
        />
      </div>

      {/* Middle Name */}
      <div className="mb-3">
        <h6 className="mb-2 text-dark">Middle Name (optional)</h6>
        <input
          name="middle_name"
          className="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user.middle_name || ""}
          placeholder="Middle Name (optional)"
          disabled={loading}
        />
      </div>

      {/* Last Name */}
      <div className="mb-3">
        <h6 className="mb-2 text-dark">Last Name</h6>
        <input
          name="last_name"
          className="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user?.last_name || ""}
          placeholder="Last Name"
          disabled={loading}
        />
      </div>

      <div className="mb-3 relative">
        <h6 className="mb-2 text-dark">Birthday</h6>
        <CustomInput
          type="date"
          value={birthday ? `${String(birthday.getDate()).padStart(2, "0")}/${String(birthday.getMonth() + 1).padStart(2, "0")}/${birthday.getFullYear()}` : ""}
          onChange={(value) => {
            const parsedDate = parseAnyDate(value)
            const validDate = parsedDate! > new Date() ? new Date() : parsedDate!

            console.log(validDate);

            setBirthday(validDate);
          }}
          variant="unstyled"
          placeholder="Birthday"
          containerClassName="w-full"
          dateGroupClassName="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 bg-white"
          dateSegmentClassName="text-base"
          dateSeparatorClassName="text-neutral-500"
          calendarWrapperClassName="left-0"
          showFormatHint={false}
        />
        <input type="hidden" name="birthday" value={birthday ? formatDate(birthday) : ""} />
      </div>

      {/* Save Button */}
      <div className="w-full flex items-end justify-end">
        <FullRoundedButton type="submit" disabled={!usernameUnique || loading || usernameChecking} isLoading={loading}>
          Save
        </FullRoundedButton>
      </div>
    </form>
  );
} 