"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutForm() {
  const router = useRouter();
  const supabase = createClient(); // Client-side supabase client

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="hover:bg-orange-200 text-orange-500 px-3 py-2 rounded-lg text-sm font-light transition-all"
    >
      Sign Out
    </button>
  );
}
