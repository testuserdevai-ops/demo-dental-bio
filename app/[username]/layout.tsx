import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import {
  getDomainConfig,
  getDomainConfigByHostname,
  getCurrentHostname,
} from "@/utils/domainConfig";
import { isCustomDomainHost } from "@/lib/customDomain";
import { BrandDomainProvider } from "../contexts/BrandDomainContext";
import GoogleAnalytics from "../components/GoogleAnalytics";
import "./bootstrap.min.css";

// Fetch profile data (cached per-request so generateMetadata and the layout
// render share a single round-trip).
const fetchUserAndDentistry = cache(async (username: string) => {
  const supabase = await createClient();

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, username, registered_domain")
      .ilike("username", username)
      .single();

    if (!user) return { username, registeredDomain: null, dentistry: null };

    const { data: dentistry } = await supabase
      .from("dentistries")
      .select("dentistry_id, about_title, about_text")
      .eq("user_id", user.id)
      .single();

    return {
      username: user.username,
      registeredDomain: user.registered_domain ?? null,
      dentistry: dentistry ?? null,
    };
  } catch {
    return { id: null, username, registeredDomain: null, dentistry: null };
  }
});

/**
 * On a connected custom domain, branding must come from the brand the user
 * registered under (stored in users.registered_domain). Returns null on normal
 * brand domains so the client keeps using window.location.hostname.
 */
async function resolveBrandDomainOverride(username: string): Promise<string | null> {
  const host = getCurrentHostname(await headers());
  if (!isCustomDomainHost(host)) return null;

  const { registeredDomain } = await fetchUserAndDentistry(username);
  return registeredDomain || "dental.bio";
}

// Fetch existing profile picture
async function fetchProfilePicture(dentistryId: string) {
  const supabase = await createClient();

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
export async function generateMetadata({ params }: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const headersList = await headers();

  const { username: resolvedUsername, registeredDomain, dentistry } =
    await fetchUserAndDentistry(username);

  const host = getCurrentHostname(headersList);
  const domainConfig =
    isCustomDomainHost(host) && registeredDomain
      ? getDomainConfigByHostname(registeredDomain)
      : getDomainConfig(headersList);

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
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const brandDomain = await resolveBrandDomainOverride(username);

  return <BrandDomainProvider brandDomain={brandDomain}>{children}</BrandDomainProvider>;
}
