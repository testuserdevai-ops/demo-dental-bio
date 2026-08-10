import type { Metadata } from "next";
import type { Author } from "next/dist/lib/metadata/types/metadata-types";
import { headers } from "next/headers";

import { isCustomDomainHost } from "@/lib/customDomain";
import {
  getCurrentHostname,
  getDomainConfig,
  getDomainConfigByHostname,
} from "@/utils/domainConfig";

import { getPublicBlogPage } from "./_lib/public-blog-query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const page = await getPublicBlogPage({ username, slug });
  const headersList = await headers();
  const host = getCurrentHostname(headersList);
  const domainConfig =
    isCustomDomainHost(host) && page?.profile.registeredDomain
      ? getDomainConfigByHostname(page.profile.registeredDomain)
      : getDomainConfig(headersList);
  const baseUrl = domainConfig.baseUrl;

  if (!page) {
    return {
      title: username,
      metadataBase: new URL(baseUrl),
    };
  }

  const { profile, blog, dentistry } = page;
  const title = blog.metaTitle || dentistry?.aboutTitle || profile.username;
  const description =
    blog.metaDescription || blog.content.replace(/<[^>]*>/g, "").slice(0, 200);
  const imageUrl = blog.imageUrl || `${baseUrl}/placeholder.webp`;

  return {
    title,
    authors: [profile.username] as Author[],
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${profile.username}/blog/${blog.slug}`,
      images: [{ url: imageUrl }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
