// app/sitemap.xml/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);
  const domain = domainConfig.domain;
  const supabase = await createClient();
  const SITE_URL = `https://${domain}`;
  // Fetch active users
  const { data: profiles, error: profileError } = await supabase
    .from("public_profiles")
    .select("profile_id, username");

  // Fetch published blog posts
  const { data: blogs, error: blogError } = await supabase.from("blogs")
    .select(`
        slug,
        blog_groups:blog_groups (
            user_id
        )
    `);

  if (profileError || blogError) {
    return new NextResponse("Failed to generate sitemap", { status: 500 });
  }

  const usernameByProfileId = new Map(
    (profiles || []).map((profile) => [profile.profile_id, profile.username]),
  );

  const urls = [
    { loc: SITE_URL },
    ...(profiles || []).map((profile) => ({
      loc: `${SITE_URL}/${profile.username}`,
    })),
    ...(blogs || []).flatMap((post) => {
      const username = usernameByProfileId.get(post?.blog_groups?.user_id);
      return username
        ? [{ loc: `${SITE_URL}/${username}/blog/${post.slug}` }]
        : [];
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `<url>
  <loc>${url.loc}</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
