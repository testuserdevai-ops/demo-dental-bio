import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../link-page.css";

import Link from "next/link";
import { notFound } from "next/navigation";

import BlogImage from "@/app/components/Image/BlogImage";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { resolveAnalyticsRenderContext } from "@/lib/analytics/server-context";
import { formatDate } from "@/utils/formatDate";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import WorkLocation from "../../components/WorkLocation";
import { getPublicBlogPage } from "./_lib/public-blog-query";

// This route reads request-bound host and preview context. It remains dynamic in
// Next 16 until the Phase 7 tagged-cache boundary can exclude those contexts.
export const dynamic = "force-dynamic";

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ analyticsContext?: string }>;
}) {
  const [{ username, slug }, { analyticsContext: requestedAnalyticsContext }] =
    await Promise.all([params, searchParams]);
  const page = await getPublicBlogPage({ username, slug });

  if (!page) notFound();

  const { profile, blog, dentistry, profilePictureUrl } = page;
  const analyticsContext = await resolveAnalyticsRenderContext(
    requestedAnalyticsContext,
    profile.id,
  );

  return (
    <AnalyticsProvider
      profileId={profile.id}
      renderContext={analyticsContext}
      consent="unknown"
    >
      <div className="wrapper">
        <div className="profile-wrapper">
          <Header
            username={profile.username}
            title={dentistry?.aboutTitle ?? ""}
            contact_email={dentistry?.contactEmail ?? ""}
            image_url={profilePictureUrl}
            isOtherPage={true}
            isVerified={profile.isVerified ?? false}
            useDentalBrand={profile.useDentalBrand ?? true}
          />

          <div className="text-center mt-20">
            {blog.imageUrl && (
              <BlogImage
                src={blog.imageUrl}
                alt="Blog Image"
                className="w-full mb-4 rounded-[6px]"
              />
            )}

            <h1 className="text-[23px] md:text-[26px] font-semibold">
              {blog.title}
            </h1>

            <div className="w-full flex justify-center my-4">
              <div className="flex items-center gap-2 text-left">
                <img
                  src={profilePictureUrl}
                  alt="user"
                  className="w-[50px] h-[50px] rounded-full"
                />
                <div>
                  <div className="text-xs">{`${profile.title === "N/A" ? "" : (profile.title ?? "")} ${profile.firstName ?? ""} ${profile.lastName ?? ""}`}</div>
                  <div className="text-[10px] text-[#9D9D9D] text-left">
                    {formatDate(blog.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="text-[#9d9d9d] text-[14px] break-words"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>

          <div className="w-full flex justify-center mt-4 mb-6">
            <Link
              href={`/${profile.username}`}
              className="w-[93px] h-[41px] rounded-[10px] border text-[14px] text-center no-underline text-black px-6 py-2"
            >
              <span>Back</span>
            </Link>
          </div>

          {dentistry && (
            <>
              <WorkLocation
                dentistry={{
                  dentistry_id: dentistry.dentistryId,
                  about_title: dentistry.aboutTitle,
                  about_text: dentistry.aboutText,
                  phone: dentistry.phone,
                  booking_link: dentistry.bookingLink,
                  contact_email: dentistry.contactEmail,
                  location_title: dentistry.locationTitle,
                }}
              />
              <Footer
                bookingLink={dentistry.bookingLink ?? ""}
                contact_email={dentistry.contactEmail ?? ""}
                username={profile.username}
                title={dentistry.aboutTitle ?? ""}
                useDentalBrand={profile.useDentalBrand ?? true}
                socialLinks={null}
              />
            </>
          )}
        </div>
      </div>
    </AnalyticsProvider>
  );
}
