import "@fortawesome/fontawesome-free/css/all.min.css";
import "./link-page.css";

import Header from "./components/Header";
import ProfileDetail from "./components/ProfileDetail";
import Treatments from "./components/Treatments";
import WorkLocation from "./components/WorkLocation";
import Footer from "./components/Footer";
import supabase from "../lib/supabaseClient";
import Links from "./components/Links";
import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import { unstable_noStore } from "next/cache"; // Import noStore to prevent caching
import Gallery from "./components/Gallery";
import Services from "./components/Services";
import Reviews from "./components/Reviews";
import BlogGroupList from "./components/BlogGroupList";
import VideoGroupList from "./components/VideoGroupList";
import {
  getDomainConfig,
  getDomainConfigByHostname,
  getCurrentHostname,
} from "@/utils/domainConfig";
import { isCustomDomainHost } from "@/lib/customDomain";
import { headers } from "next/headers";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { resolveAnalyticsRenderContext } from "@/lib/analytics/server-context";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ analyticsContext?: string }>;
};

export default async function HomePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { analyticsContext: requestedAnalyticsContext } = await searchParams;

  unstable_noStore();

  const headersList = await headers();
  const requestHostname = getCurrentHostname(headersList);
  const onCustomDomain = isCustomDomainHost(requestHostname);
  let domainConfig = getDomainConfig(headersList);

  // Fetch the user from Supabase based on the username slug
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      "id, position, first_name, last_name, title, gdc_no, qualification, isVerified, use_dental_brand, subscription_status, email, registered_domain",
    )
    .ilike("username", username)
    .single();

  // When served from a user's connected custom domain, the hostname won't match
  // any brand, so resolve branding from the brand they registered under instead.
  if (user && onCustomDomain && user.registered_domain) {
    domainConfig = getDomainConfigByHostname(user.registered_domain);
  }
  const baseUrl = domainConfig.baseUrl;

  // Handle error or no user case
  if (!user || userError) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-screen gap-10 text-center mx-auto px-10`}
      >
        <span className="bg-gradient-to-r from-gradient-purple via-gradient-coral to-gradient-orange bg-clip-text text-transparent">
          <span className="flex items-center mb-4 justify-center flex-col text-6xl md:text-8xl font-bold">
            {domainConfig.brandName}/
            <span className="font-bold">{username}</span>
          </span>
          <span className="text-[23px] md:text-[26px] font-semibold max-w-screen-md w-full mx-auto bg-clip-text text-transparent">
            is available!
          </span>
        </span>

        <Link
          href={"/"}
          className="w-full text-2xl whitespace-nowrap mx-auto py-2 font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent max-w-80 no-underline px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
        >
          Claim
        </Link>

        <p className="text-md font-bold text-2xl md:text-3xl leading-normal md:leading-normal md:mt-[50px] max-w-screen-md w-full text-center text-gradient-purple">
          Grab it before its taken!
        </p>

        <Link href={"/"}>
          {domainConfig.logoPath && (
            <Image
              src={domainConfig.logoPath}
              width={200}
              height={25}
              alt={`${domainConfig.brandName} navigation bar logo`}
              className="px-4 py-3 pt-5"
            />
          )}
        </Link>
      </div>
    );
  }

  // Fetch the dentistry data using the user's ID
  let { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const [
    { data: treatmentsData },
    { data: linkGroupsData },
    { data: blogGroupsData },
    { data: productsData },
    { data: videoGroupsData },
    { data: galleriesData },
    { data: generalGalleriesData },
    { data: reviewsData },
    { data: reviewPagesData },
    { data: locationsData },
    { data: socialsData },
  ] = await Promise.all([
    supabase
      .from("dentistry_treatments")
      .select(
        "treatment_id, rank, treatments ( title, description, isService )",
      )
      .eq("dentistry_id", dentistry.dentistry_id)
      .order("rank"),
    supabase
      .from("link_groups")
      .select(
        `
        link_group_id,
        heading,
        rank,
        dentistry_links ( 
          links ( link_id, title, link, is_active, rank, click_counter ) 
        )
      `,
      )
      .eq("dentistry_id", dentistry?.dentistry_id)
      .order("rank"),
    supabase
      .from("blog_groups")
      .select(`id, name, blogs (*)`)
      .eq("user_id", user.id),
    supabase
      .from("products")
      .select(
        "id, name, link, platform, image_url, price, currency, rank, enabled",
      )
      .eq("user_id", user.id),
    supabase
      .from("groups")
      .select("id, name, datas:videos (*)")
      .eq("user_id", user.id)
      .eq("type", "videos"),
    supabase
      .from("galleries")
      .select(
        "id, before_image_url, after_image_url, title, before_image_label, after_image_label",
      )
      .eq("user_id", user.id),
    supabase
      .from("general_galleries")
      .select("id, image_url, title")
      .eq("user_id", user.id),
    supabase.from("reviews").select("*").eq("user_id", user.id),
    supabase
      .from("external_review_pages")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false }),
    supabase
      .from("dentistry_locations")
      .select(
        `
        location_id,
        locations (country, city, area, latitude, longitude, full_address, business_name)
      `,
      )
      .eq("dentistry_id", dentistry?.dentistry_id),
    supabase
      .from("socials")
      .select("twitter_link, instagram_link, facebook_link, tiktok_link")
      .eq("dentistry_id", dentistry?.dentistry_id),
  ]);

  const { data, error } = await supabase.storage
    .from("profile-pics")
    .list(dentistry?.dentistry_id);

  if (error) throw error;

  let profileImageUrl = "";

  if (data.length > 0) {
    const fileName = data[0].name;
    const { data: urlData } = await supabase.storage
      .from("profile-pics")
      .getPublicUrl(`${dentistry?.dentistry_id}/${fileName}`);

    profileImageUrl = urlData?.publicUrl || "/placeholder.webp"; // Set the image URL or placeholder
  } else {
    profileImageUrl = "/placeholder.webp"; // Use placeholder if no profile pic
  }

  const reviews = reviewsData || [];
  const reviewPages = reviewPagesData || [];

  const navState: NavBarStatusType = {
    Links: (linkGroupsData && linkGroupsData.length > 0) || false,
    Blog:
      (blogGroupsData &&
        blogGroupsData.some((g) => g.blogs && g.blogs.length > 0)) ||
      false,
    Gallery:
      (galleriesData && galleriesData.length > 0) ||
      (generalGalleriesData && generalGalleriesData.length > 0) ||
      false,
    Videos:
      (videoGroupsData &&
        videoGroupsData.some((g) => g.datas && g.datas.length > 0)) ||
      false,
    Reviews: reviews.length > 0 || false,
    Shop: (productsData && productsData.length > 0) || false,
    Location: (locationsData && locationsData.length > 0) || false,
  };

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${user.first_name} ${user.last_name}`,
    url: `${baseUrl}/${username}`,
    image: profileImageUrl,
    jobTitle: user.position,
  };

  const analyticsContext = await resolveAnalyticsRenderContext(
    requestedAnalyticsContext,
    user.id,
  );

  return (
    <AnalyticsProvider
      profileId={user.id}
      renderContext={analyticsContext}
      consent="unknown"
    >
      <div className="wrapper">
        <div className="profile-wrapper flex flex-col gap-8">
          <Header
            username={username}
            title={dentistry.about_title}
            image_url={profileImageUrl}
            contact_email={dentistry.contact_email}
            isVerified={user.isVerified}
            useDentalBrand={user.use_dental_brand}
          />

          {dentistry.about_title && (
            <ProfileDetail
              username={username}
              position={user.position}
              gdc_no={user.gdc_no}
              qualification={user.qualification}
              title={dentistry.about_title}
              image_url={profileImageUrl}
              description={dentistry.about_text}
              dentistry_id={dentistry.dentistry_id}
              website_link={dentistry.website}
              isVerified={user.isVerified}
              isFreePlan={
                ["PRO", "PREMIUM PRO"].includes(user.subscription_status) ===
                false
              }
              // server-provided datasets
              navState={navState}
              serverLocations={locationsData || []}
              serverSocials={
                socialsData && socialsData.length ? socialsData[0] : null
              }
              serverProducts={productsData || []}
            />
          )}
          <Treatments serverTreatments={treatmentsData || []} />
          <Services serverTreatments={treatmentsData || []} />
          <Links serverLinkGroups={linkGroupsData || []} />
          <BlogGroupList
            username={username}
            serverBlogGroups={blogGroupsData || []}
          />
          <VideoGroupList serverVideoGroups={videoGroupsData || []} />
          <Gallery
            serverGalleries={galleriesData || []}
            serverGeneralGalleries={generalGalleriesData || []}
          />
          <Reviews
            serverReviews={reviews}
            serverExternalReviewPages={reviewPages || []}
          />
          <WorkLocation
            dentistry={dentistry}
            serverLocations={locationsData || []}
          />
          <Footer
            dentistryId={dentistry.dentistry_id}
            bookingLink={dentistry.booking_link}
            contact_email={dentistry.contact_email}
            username={username}
            title={dentistry.about_title}
            useDentalBrand={user.use_dental_brand}
            website_link={dentistry.website}
          />
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </AnalyticsProvider>
  );
}
