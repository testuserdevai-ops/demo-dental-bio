import {
  getDomainConfig,
  getDomainConfigByHostname,
  getCurrentHostname,
} from "@/utils/domainConfig";
import { isCustomDomainHost } from "@/lib/customDomain";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { Author } from "next/dist/lib/metadata/types/metadata-types";
import { headers } from "next/headers";

// Function to fetch user and dentistry data based on the username
async function fetchUserAndDentistry(username: string) {
  const supabase = createClient();

  // Fetch the user by username
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, username, registered_domain")
    .eq("username", username)
    .single();

  if (userError || !userData) {
    return { username, registeredDomain: null, dentistry: null };
  }

  // Fetch the dentistry data by user ID
  const { data: dentistryData, error: dentistryError } = await supabase
    .from("dentistries")
    .select("about_title, about_text")
    .eq("user_id", userData.id)
    .single();

  if (dentistryError || !dentistryData) {
    return { username: userData.username, registeredDomain: userData.registered_domain ?? null, dentistry: null };
  }

  return { username: userData.username, registeredDomain: userData.registered_domain ?? null, dentistry: dentistryData };
}

// Function to fetch blog data based on the slug
async function fetchBlog(slug: string) {
  const supabase = createClient();

  // Fetch the blog by slug
  const { data: blog, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !blog) {
    return null;
  }

  return {
    meta_title: blog.meta_title,
    meta_description: blog.meta_description,
    image_url: blog.image_url,
    content: blog.content,
  };
}

export async function generateMetadata({
  params: { username, slug },
}: {
  params: { username: string; slug: string };
}): Promise<Metadata> {
  const { username: fetchedUsername, registeredDomain, dentistry } = await fetchUserAndDentistry(username);
  const blog = await fetchBlog(slug);

  const headersList = headers();
  const host = getCurrentHostname(headersList);
  const domainConfig =
    isCustomDomainHost(host) && registeredDomain
      ? getDomainConfigByHostname(registeredDomain)
      : getDomainConfig(headersList);
  const baseUrl = domainConfig.baseUrl;

  const title = blog?.meta_title || dentistry?.about_title || username;
  const authors = [username] as Author[];
  const description = blog?.meta_description || blog?.content?.replace(/<[^>]*>/g, '').slice(0, 200) || '';
  const imageUrl = blog?.image_url || `${baseUrl}/placeholder.webp`;

  return {
    title,
    authors,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${fetchedUsername}/blog/${slug}`,
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
  children: any;
}>) {
  return <>{children}</>;
}