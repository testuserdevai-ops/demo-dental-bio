"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./utils/supabaseClient";

interface UsernameInputProps {
  defaultUsername: string;
  userId: string;
  onChange?: (username: string, isUnique: boolean) => void;
}

const UsernameInput: React.FC<UsernameInputProps> = ({ defaultUsername, userId, onChange }) => {
  const [username, setUsername] = useState(defaultUsername);
  const [isUnique, setIsUnique] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) {
      setIsUnique(false);
      setError("Username is required.");
      onChange && onChange(username, false);
      return;
    }
    setChecking(true);
    setError("");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        // If the username is the same as the user's current username, allow it
        if (username === defaultUsername) {
          setIsUnique(true);
          setError("");
          onChange && onChange(username, true);
        } else if (!data.unique) {
          setIsUnique(false);
          setError("This username is already taken.");
          onChange && onChange(username, false);
        } else {
          setIsUnique(true);
          setError("");
          onChange && onChange(username, true);
        }
      } catch (e) {
        setIsUnique(false);
        setError("Error checking username.");
        onChange && onChange(username, false);
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
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
        autoComplete="off"
      />
      {checking && <div className="text-xs text-gray-500 mt-1">Checking username...</div>}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      {/* Hidden input to pass username to server action */}
      <input type="hidden" name="username" value={username} />
    </div>
  );
};

export default UsernameInput; 