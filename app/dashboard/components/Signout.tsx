"use client";

import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { createClient } from "@/utils/supabase/client";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
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
    <FullRoundedButton
      onClick={handleSignOut}
      buttonType="danger"
      className="w-full my-6"
    >
      Sign Out
      <SignOut size={22} weight="bold" className="ml-2" />
    </FullRoundedButton>
  );
}
