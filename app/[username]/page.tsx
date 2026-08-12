import "./link-page.css";

import Image from "@/app/components/Image/SafeImage";
import Link from "next/link";
import PreviewScrollReceiver from "./components/PreviewScrollReceiver";
import {
  getDomainConfig,
  getDomainConfigByHostname,
  getCurrentHostname,
} from "@/utils/domainConfig";
import { isCustomDomainHost } from "@/lib/customDomain";
import { headers } from "next/headers";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { PublicProfileViewTracker } from "@/app/components/analytics/PublicProfileViewTracker";
import { resolveAnalyticsRenderContext } from "@/lib/analytics/server-context";
import { getPublicProfile } from "./_lib/public-profile";
import PublicProfileTemplate from "./_components/PublicProfileTemplate";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ analyticsContext?: string }>;
};

export default async function HomePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { analyticsContext: requestedAnalyticsContext } = await searchParams;

  const headersList = await headers();
  const requestHostname = getCurrentHostname(headersList);
  const onCustomDomain = isCustomDomainHost(requestHostname);
  let domainConfig = getDomainConfig(headersList);

  const profile = await getPublicProfile(username);

  // When served from a user's connected custom domain, the hostname won't match
  // any brand, so resolve branding from the brand they registered under instead.
  if (profile && onCustomDomain && profile.user.registered_domain) {
    domainConfig = getDomainConfigByHostname(profile.user.registered_domain);
  }
  const baseUrl = domainConfig.baseUrl;

  // Handle error or no user case
  if (!profile) {
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

  const { user, dentistry, profileImageUrl } = profile;

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
      consent="not_required"
    >
      <PublicProfileViewTracker profileId={user.id} />
      <PreviewScrollReceiver />
      <div className="wrapper">
        <PublicProfileTemplate username={username} profile={profile} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </AnalyticsProvider>
  );
}
