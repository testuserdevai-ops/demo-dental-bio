import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { getDomainConfig } from "@/utils/domainConfig";
import GoogleAnalytics from "../components/GoogleAnalytics";
import "./bootstrap.min.css";

// Fetch profile data
async function fetchUserAndDentistry(username: string) {
  const supabase = createClient();

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", username)
      .single();

    if (!user) return { username, dentistry: null };

    const { data: dentistry } = await supabase
      .from("dentistries")
      .select("dentistry_id, about_title, about_text")
      .eq("user_id", user.id)
      .single();

    return {
      username: user.username,
      dentistry: dentistry ?? null,
    };
  } catch {
    return { id: null, username, dentistry: null };
  }
}

// Fetch existing profile picture
async function fetchProfilePicture(dentistryId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.storage
      .from("profile-pics")
      .list(dentistryId);

    if (error) throw error;

    if (data.length > 0) {
      const sortedFiles = data.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
      );

      const latestFile = sortedFiles[0];
      const fileName = latestFile.name;

      const { data: urlData } = supabase.storage
        .from("profile-pics")
        .getPublicUrl(`${dentistryId}/${fileName}`);

      return urlData?.publicUrl
        ? `${urlData.publicUrl}?t=${Date.now()}`
        : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching profile picture:", error);
  }
}

// Dynamic metadata generator
export async function generateMetadata({
  params: { username },
}: {
  params: { username: string };
}): Promise<Metadata> {
  const headersList = headers();
  const domainConfig = getDomainConfig(headersList);

  const { username: resolvedUsername, dentistry } =
    await fetchUserAndDentistry(username);

  const profileImage = await fetchProfilePicture(dentistry?.dentistry_id)

  const baseURL = domainConfig.baseUrl;

  const title = dentistry?.about_title || resolvedUsername;
  const description =
    dentistry?.about_text ||
    "Learn more about this dentist and their professional profile.";

  const imageUrl = profileImage || domainConfig.heroImage;
  const pageUrl = `${baseURL}/${username}`;

  return {
    title,
    description,
    metadataBase: new URL(baseURL),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: imageUrl }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/favicon.ico",
    },
  };
}

// Root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
