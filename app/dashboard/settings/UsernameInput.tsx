"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./utils/supabaseClient";
import { registerUsernameSchema } from "@/lib/validation";
import { apiClient } from "@/services/apiClient";

interface UsernameInputProps {
  defaultUsername: string;
  userId: string;
  onChange?: (username: string, isUnique: boolean, checking: boolean) => void;
  disabled?: boolean;
}

const UsernameInput: React.FC<UsernameInputProps> = ({
  defaultUsername,
  userId,
  onChange,
  disabled,
}) => {
  const [username, setUsername] = useState(defaultUsername);
  const [isUnique, setIsUnique] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (username === defaultUsername) {
      setIsUnique(true);
      setError("");
      onChange && onChange(username, true, false);
      return;
    }

    setChecking(true);
    setError("");
    onChange && onChange(username, false, true);

    const timeout = setTimeout(async () => {
      try {
        const result = registerUsernameSchema.safeParse({ username });

        if (!result.success) {
          setIsUnique(false);
          setError(result.error.issues[0].message);
          onChange && onChange(username, false, false);

          return;
        }

        const data = await apiClient.get(
          `/api/check-username?username=${encodeURIComponent(username)}`,
        );

        if (!data.unique) {
          setIsUnique(false);
          setError("This username is already taken.");
          onChange && onChange(username, false, false);
        } else {
          setIsUnique(true);
          setError("");
          onChange && onChange(username, true, false);
        }
      } catch (e) {
        setIsUnique(false);
        setError("Error checking username.");
        onChange && onChange(username, false, false);
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [username, defaultUsername, onChange]);

  return (
    <div className="mb-3">
      <h6 className="mb-2 text-dark">Username</h6>
      <input
        name="username"
        className={`w-full rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 ${!isUnique ? "border border-red-500" : ""}`}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        autoComplete="off"
        disabled={disabled}
      />
      {checking && (
        <div className="text-xs text-gray-500 mt-1">Checking username...</div>
      )}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      {/* Hidden input to pass username to server action */}
      <input type="hidden" name="username" value={username} />
    </div>
  );
};

export default UsernameInput;
