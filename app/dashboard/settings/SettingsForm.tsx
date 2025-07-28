"use client";

import React, { useState, useCallback } from "react";
import SaveButton from "../components/SaveButton";
import UsernameInput from "./UsernameInput";
import { titles } from "@/utils/global_constants";
import { CaretDown } from "@phosphor-icons/react";

export default function SettingsForm({ user, targetUserId }: { user: any, targetUserId?: string }) {
  const [usernameUnique, setUsernameUnique] = useState(true);
  const [username, setUsername] = useState(user?.username || "");

  // Handler to receive uniqueness from UsernameInput
  const handleUsernameChange = useCallback((value: string, unique: boolean) => {
    setUsername(value);
    setUsernameUnique(unique);
  }, []);

  return (
    <form action="/dashboard/settings/update" method="post" className="mb-10 ml-2">
      <input type="hidden" name="targetUserId" value={targetUserId || ''} />
      <div className="mb-3 relative">
        <h6 className="mb-2 text-dark">Title</h6>
        <div className="relative">
          <select
            name="title"
            className="w-full appearance-none rounded-[26px] py-2 text-base px-3 text-neutral-800 pr-10"
            defaultValue={user?.title || ""}
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
      </div>

      {/* Username */}
      <UsernameInput defaultUsername={user?.username || ""} userId={user?.id} onChange={handleUsernameChange} />

      {/* First Name */}
      <div className="mb-3">
        <h6 className="mb-2 text-dark">First Name</h6>
        <input
          name="first_name"
          className="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user?.first_name || ""}
          placeholder="First Name"
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
        />
      </div>

      <div className="mb-3">
        <h6 className="mb-2 text-dark">Birthday</h6>
        <input
          name="birthday"
          className="w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user?.birthday || ""}
          type="date"
        />
      </div>

      <div className="mb-3">
        <h6 className="mb-2 text-dark">Offer Code</h6>
        <input
          name="offer_code"
          className="w-full rounded-[26px] text-base py-2 px-3 placeholder:text-neutral-500 text-neutral-800"
          defaultValue={user?.offer_code || ""}
          placeholder="Offer Code"
        />
      </div>

      {/* Save Button */}
      <div className="w-full flex items-end justify-end">
        <SaveButton disabled={!usernameUnique} />
      </div>
    </form>
  );
} 