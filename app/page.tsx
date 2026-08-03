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
import { getLandingPageContent } from "@/lib/contentful";

export default async function HomePage() {
  const user = await checkSession();
  if (user) {
    return redirect("/dashboard");
  }

  const {
    heroData,
    sectionData,
    sectionOneData,
    sectionTwoData,
    sectionThreeData,
    featuresData,
    footerCtaData,
  } = await getLandingPageContent();

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
