import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getDomainConfig,
  getDomainConfigByHostname,
  getCurrentHostname,
} from "@/utils/domainConfig";
import { isCustomDomainHost } from "@/lib/customDomain";
import { getBrandFavicon } from "@/lib/brandIcons";
import { BrandDomainProvider } from "../contexts/BrandDomainContext";
import GoogleAnalytics from "../components/GoogleAnalytics";
import "./bootstrap.min.css";
import { getPublicProfileIdentity } from "./_lib/public-profile";

/**
 * On a connected custom domain, branding must come from the brand the user
 * registered under (stored in users.registered_domain). Returns null on normal
 * brand domains so the client keeps using window.location.hostname.
 */
async function resolveBrandDomainOverride(
  username: string,
): Promise<string | null> {
  const host = getCurrentHostname(await headers());
  if (!isCustomDomainHost(host)) return null;

  const profile = await getPublicProfileIdentity(username);
  return profile?.user.registered_domain || "dental.bio";
}

// Dynamic metadata generator
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const headersList = await headers();

  const profile = await getPublicProfileIdentity(username);

  const host = getCurrentHostname(headersList);
  const domainConfig =
    isCustomDomainHost(host) && profile?.user.registered_domain
      ? getDomainConfigByHostname(profile.user.registered_domain)
      : getDomainConfig(headersList);

  const profileImage = profile?.profileImageUrl ?? null;

  const baseURL = domainConfig.baseUrl;

  const title = profile?.dentistry.about_title || username;
  const description =
    profile?.dentistry.about_text ||
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
      icon: getBrandFavicon(domainConfig.domain),
      apple: getBrandFavicon(domainConfig.domain),
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

  return (
    <BrandDomainProvider brandDomain={brandDomain}>
      {children}
    </BrandDomainProvider>
  );
}
