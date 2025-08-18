import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import "./bootstrap.min.css";

// Utility function to fetch user and dentistry data
async function fetchUserAndDentistry(username: string) {
  const supabase = createClient();

  try {
    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", username)
      .single();

    if (userError || !user) {
      return { username, dentistry: null };
    }

    const {
      data: dentistry,
      error: dentistryError,
    } = await supabase
      .from("dentistries")
      .select("about_title, about_text")
      .eq("user_id", user.id)
      .single();

    return {
      username: user.username,
      dentistry: dentistryError || !dentistry ? null : dentistry,
    };
  } catch (error) {
    console.error("Error in [username]/layout:", error);
    return { username, dentistry: null };
  }
}

// Metadata generator for dynamic username pages
export async function generateMetadata({
  params: { username },
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username: resolvedUsername, dentistry } = await fetchUserAndDentistry(username);

  return {
    title: dentistry?.about_title || resolvedUsername,
    description:
      dentistry?.about_text || "Learn more about this user and their expertise.",
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BASE_URL || "https://dental.bio"
    ),
  };
}

// Default layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
