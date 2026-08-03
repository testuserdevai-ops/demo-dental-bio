"use client";

import React, { useState, useCallback } from "react";
import UsernameInput from "./UsernameInput";
import { titles } from "@/utils/global_constants";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { usePreview } from "@/app/contexts/PreviewContext";
import { useDashboardUser } from "@/app/contexts/DashboardUserContext";
import CustomInput from "@/app/register/CustomInput";
import Dropdown from "@/app/components/Dropdown";
import { parseAnyDate } from "@/utils/functions/functions";
import { settingsSchema } from "@/lib/validation";

export default function SettingsForm({ user, targetUserId }: { user: any, targetUserId?: string }) {
  const [usernameUnique, setUsernameUnique] = useState(true);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday) : null);
  const { triggerReload } = usePreview();
  const { setUser } = useDashboardUser();

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

    const formData = new FormData(e.currentTarget);

    const validation = settingsSchema.safeParse({
      first_name: formData.get("first_name"),
      middle_name: formData.get("middle_name"),
      last_name: formData.get("last_name"),
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    
    try {
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

      const newUsername = formData.get("username") as string;

      const updatedUserDetails: Record<string, any> = {
        first_name: formData.get("first_name") as string,
        middle_name: formData.get("middle_name") as string,
        last_name: formData.get("last_name") as string,
        title: formData.get("title") as string,
        birthday: formData.get("birthday") as string || null,
        username: newUsername,
      };

      const { error: updateError } = await supabase
        .from("users")
        .update(updatedUserDetails)
        .eq("id", userId);
      if (updateError) {
        router.replace("/error?message=failed_to_update_user_details");
        return;
      }
      setUser((prev) => ({ ...(prev || {}), username: newUsername }));
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

      {/* Username */}
      <UsernameInput defaultUsername={user?.username || ""} userId={user?.id} onChange={handleUsernameChange} disabled={loading} />

      {/* First Name */}
      <div className="mb-3">
        <label htmlFor="settings-first-name" className="mb-2 block text-dark">First Name</label>
        <input
          id="settings-first-name"
          name="first_name"
          className={`w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 ${fieldErrors.first_name ? 'ring-1 ring-red-500' : ''}`}
          defaultValue={user?.first_name || ""}
          placeholder="First Name"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.first_name)}
          aria-describedby={fieldErrors.first_name ? "settings-first-name-error" : undefined}
        />
        {fieldErrors.first_name && <p id="settings-first-name-error" role="alert" className="text-red-500 text-sm mt-1 pl-4">{fieldErrors.first_name}</p>}
      </div>

      {/* Middle Name */}
      <div className="mb-3">
        <label htmlFor="settings-middle-name" className="mb-2 block text-dark">Middle Name (optional)</label>
        <input
          id="settings-middle-name"
          name="middle_name"
          className={`w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 ${fieldErrors.middle_name ? 'ring-1 ring-red-500' : ''}`}
          defaultValue={user.middle_name || ""}
          placeholder="Middle Name (optional)"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.middle_name)}
          aria-describedby={fieldErrors.middle_name ? "settings-middle-name-error" : undefined}
        />
        {fieldErrors.middle_name && <p id="settings-middle-name-error" role="alert" className="text-red-500 text-sm mt-1 pl-4">{fieldErrors.middle_name}</p>}
      </div>

      {/* Last Name */}
      <div className="mb-3">
        <label htmlFor="settings-last-name" className="mb-2 block text-dark">Last Name</label>
        <input
          id="settings-last-name"
          name="last_name"
          className={`w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 ${fieldErrors.last_name ? 'ring-1 ring-red-500' : ''}`}
          defaultValue={user?.last_name || ""}
          placeholder="Last Name"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.last_name)}
          aria-describedby={fieldErrors.last_name ? "settings-last-name-error" : undefined}
        />
        {fieldErrors.last_name && <p id="settings-last-name-error" role="alert" className="text-red-500 text-sm mt-1 pl-4">{fieldErrors.last_name}</p>}
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
