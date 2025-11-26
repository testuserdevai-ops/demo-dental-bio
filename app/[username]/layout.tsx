import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
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
      .select("about_title, about_text")
      .eq("user_id", user.id)
      .single();

    return {
      username: user.username,
      dentistry: dentistry ?? null,
    };
  } catch {
    return { username, dentistry: null };
  }
}

// Dynamic metadata generator
export async function generateMetadata({
  params: { username },
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username: resolvedUsername, dentistry } =
    await fetchUserAndDentistry(username);

  const baseURL =
    process.env.NEXT_PUBLIC_BASE_URL || "https://dental.bio";

  const title = dentistry?.about_title || resolvedUsername;
  const description =
    dentistry?.about_text ||
    "Learn more about this dentist and their professional profile.";

  const imageUrl = `${baseURL}/section-1.webp`;
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
    <html lang="en">
      <head>
        {/* Mobile responsiveness */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        {/* Google Search Console verification */}
        <meta
          name="google-site-verification"
          content="Pw4B8ek0e6LOZZqGHufiTdEs-IXcGHD3hFS1U8q9478"
        />

        {/* Performance optimizations */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://fonts.googleapis.com"
        />

        {/* Optional: preload hero image */}
        <link
          rel="preload"
          as="image"
          href="/section-1.webp"
        />
      </head>

      <body>
        {children}
      </body>
    </html>
  );
}
