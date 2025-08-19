import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { Author } from "next/dist/lib/metadata/types/metadata-types";

// Function to fetch user and dentistry data based on the username
async function fetchUserAndDentistry(username: string) {
  const supabase = createClient();

  // Fetch the user by username
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", username)
    .single();

  if (userError || !userData) {
    return { username, dentistry: null };
  }

  // Fetch the dentistry data by user ID
  const { data: dentistryData, error: dentistryError } = await supabase
    .from("dentistries")
    .select("about_title, about_text")
    .eq("user_id", userData.id)
    .single();

  if (dentistryError || !dentistryData) {
    return { username: userData.username, dentistry: null };
  }

  return { username: userData.username, dentistry: dentistryData };
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
    throw new Error("Blog not found");
  }

  return {
    meta_title: blog.meta_title,
    meta_description: blog.meta_description,
    meta_image: blog.meta_image,  // Assuming there's a `meta_image` column
    content: blog.content,
  };
}

export async function generateMetadata({
  params: { username, slug },
}: {
  params: { username: string; slug: string };
}): Promise<Metadata> {
  const { username: fetchedUsername, dentistry } = await fetchUserAndDentistry(username);
  
  const { meta_title, meta_description, meta_image, content } = await fetchBlog(slug);
  
  const title = meta_title || dentistry?.about_title || username;
  const authors = [username] as Author[];
  const description = meta_description || content.slice(0, 200);
  const imageUrl = meta_image || "https://yourdefaultimage.com/default.jpg";

  return {
    title,
    authors,
    description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BASE_URL || "https://dental.bio"
    ),
    openGraph: {
      title,
      description,
      url: `https://dental.bio/${slug}`,
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