import { createClient } from "contentful";
import { createClient as supabaseClient } from "@/utils/supabase/server";
import Navbar from "./components/Navbar";
import Hero from "./components/home-page/Hero";
import Section from "./components/home-page/section/Section";
import Section1 from "./components/home-page/section-1/Section1";
import Section2 from "./components/home-page/section-2/Section2";
import Section3 from "./components/home-page/section-3/Section3";
import Features from "./components/home-page/features/Features";
import PricingTable from "./components/home-page/pricing/PricingTable";
import FooterCta from "./components/home-page/FooterCta/FooterCta";
import Footer from "./components/Footer";
import PromoBanner from "./components/PromoBanner";
import { checkSession } from "@/utils/supabase/checkSession";
import { redirect } from "next/navigation";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || "",
  environment: process.env.CONTENTFUL_ENVIRONMENT || "master",
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || "",
});

export default async function HomePage() {

  const user = await checkSession();
  if (user) {
    return redirect('/dashboard')
  }

  const entryId = process.env.CONTENTFUL_ENTRY_ID;

  if (!entryId) {
    console.error("Entry ID not provided");
    return <p>Error: Entry ID is missing.</p>;
  }

  // Fetch the landing page entry
  const landingPage = await client.getEntry(entryId);
  const {
    heroSection,
    sectionOne,
    sectionTwo,
    sectionThree,
    featuresSection,
    footerCta,
  } = landingPage.fields;

  let heroData = null;
  let sectionData = null;
  let sectionOneData = null;
  let sectionTwoData = null;
  let sectionThreeData = null;
  let featuresData = null;
  let footerCtaData = null;

  // Fetch hero section if it exists
  if (heroSection) {
    // @ts-ignore
    const heroEntry = await client.getEntry(heroSection.sys.id);
    heroData = {
      hero_title: heroEntry.fields.heroTitle,
      hero_subtitle_bold: heroEntry.fields.heroBoldSubtitle,
      hero_subtitle_regular: heroEntry.fields.heroRegularSubtitle,
    };

    // If Section data exists inside the hero section, fetch it
    sectionData = {
      section_title: heroEntry.fields.sectionTitle || "",
      section_text_items: heroEntry.fields.sectionTextItems
        ? // @ts-ignore
        heroEntry.fields.sectionTextItems.map(
          (item: string, index: number) => ({
            id: index,
            section_text_item: item,
          })
        )
        : [],
    };
  }

  // Fetch features section if it exists
  if (featuresSection) {
    // @ts-ignore
    const featuresEntry = await client.getEntry(featuresSection.sys.id);
    featuresData = {
      section_title: featuresEntry.fields.sectionTitle || "",
      section_text_items: featuresEntry.fields.sectionTextItems
        ? // @ts-ignore
        featuresEntry.fields.sectionTextItems.map(
          (item: string, index: number) => ({
            id: index,
            section_text_item: item,
          })
        )
        : [],
    };
  }

  // Fetch features section if it exists
  if (footerCta) {
    // @ts-ignore
    const footerCtaEntry = await client.getEntry(footerCta.sys.id);
    footerCtaData = {
      title: footerCtaEntry.fields.title || "",
    };
  }

  // Fetch Section One if it exists
  if (sectionOne) {
    // @ts-ignore
    const sectionOneEntry = await client.getEntry(sectionOne.sys.id);
    sectionOneData = {
      title: sectionOneEntry.fields.title || "",
      description: sectionOneEntry.fields.description || "",
    };
  }

  // Fetch Section Two if it exists
  if (sectionTwo) {
    // @ts-ignore
    const sectionTwoEntry = await client.getEntry(sectionTwo.sys.id);
    sectionTwoData = {
      title: sectionTwoEntry.fields.title || "",
      description: sectionTwoEntry.fields.description || "",
    };
  }

  // Fetch Section Three if it exists
  if (sectionThree) {
    // @ts-ignore
    const sectionThreeEntry = await client.getEntry(sectionThree.sys.id);
    sectionThreeData = {
      title: sectionThreeEntry.fields.title || "",
      description: sectionThreeEntry.fields.description || "",
    };
  }

  return (
    <>
      <PromoBanner />
      <Navbar />
      <div className="flex flex-col items-center justify-center h-full w-full overflow-x-clip">
        {/* Render Hero component */}
        {heroData && <Hero heroData={heroData} />}

        {/* Render Section component */}
        {sectionData && <Section section={sectionData} />}

        {/* Render Section1, Section2, and Section3 components */}
        {sectionOneData && <Section1 sectionOneData={sectionOneData} />}
        {sectionTwoData && <Section2 sectionTwoData={sectionTwoData} />}
        {sectionThreeData && <Section3 sectionThreeData={sectionThreeData} />}

        {/* Render Features component */}
        {featuresData && <Features featuresData={featuresData} />}
        <PricingTable />
        {footerCtaData && <FooterCta footerCtaData={footerCtaData} />}
      </div>
      <Footer />
    </>
  );
}
