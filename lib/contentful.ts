import { createClient } from "contentful";
import { unstable_cache } from "next/cache";

// ─── Contentful client ───────────────────────────────────────────────
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || "",
  environment: process.env.CONTENTFUL_ENVIRONMENT || "master",
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || "",
});

// ─── Data shapes ─────────────────────────────────────────────────────
export interface HeroSectionData {
  hero_title: string;
  hero_subtitle_bold: string;
  hero_subtitle_regular: string;
}

export interface SectionTextItem {
  id: number;
  section_text_item: string;
}

export interface SectionData {
  section_title: string;
  section_text_items: SectionTextItem[];
}

export interface TitleDescriptionData {
  title: string;
  description: string;
}

export interface FooterCtaData {
  title: string;
}

export interface LandingPageContent {
  title: string;
  description: string;
  heroData: HeroSectionData | null;
  sectionData: SectionData | null;
  sectionOneData: TitleDescriptionData | null;
  sectionTwoData: TitleDescriptionData | null;
  sectionThreeData: TitleDescriptionData | null;
  featuresData: SectionData | null;
  footerCtaData: FooterCtaData | null;
}

// ─── Placeholder data (used when Contentful is unavailable) ──────────
// TODO: Replace placeholder values with your real content
const PLACEHOLDER_DATA: LandingPageContent = {
  title:
    "Your FREE personalised {{vertical}} website | {{brand}} - Your dental identity, simplified",
  description:
    "Build and personalise your {{brand}} website in minutes. Perfect for all {{vertical}} professionals—share your expertise, grow your brand, and connect effortlessly on platforms like Instagram, LinkedIn, and more. Sign up for FREE today!",
  heroData: {
    hero_title:
      "Your {{vertical}} identity, simplified. One link, countless possibilities.",
    hero_subtitle_bold: "Personalise your FREE {{brand}} website in minutes.",
    hero_subtitle_regular:
      "Be found, express yourself, and grow your personal brand.",
  },
  sectionData: {
    section_title: "For everyone in Dentistry",
    section_text_items: [
      { id: 0, section_text_item: "Associates" },
      { id: 1, section_text_item: "Students" },
      { id: 2, section_text_item: "Therapists" },
      { id: 3, section_text_item: "Principals" },
      { id: 4, section_text_item: "Practices" },
      { id: 5, section_text_item: "Nurses" },
      { id: 6, section_text_item: "Specialists" },
      { id: 7, section_text_item: "Hygienists" },
      { id: 8, section_text_item: "Founders" },
      { id: 9, section_text_item: "Labs" },
      { id: 10, section_text_item: "Managers" },
      { id: 11, section_text_item: "TCOs" },
    ],
  },
  sectionOneData: {
    title: "Your website, without the effort.",
    description: "Share as much or as little as you like.",
  },
  sectionTwoData: {
    title: "Place it on Instagram® Place it on emails",
    description: "Place it anywhere, including Linkedin, X and TikTok",
  },
  sectionThreeData: {
    title: "Write blogs and rank on Google®",
    description: "Answer your patients’ most asked questions, easily.",
  },
  featuresData: {
    section_title: "Share as much as you like",
    section_text_items: [
      { id: 0, section_text_item: "Treatments" },
      { id: 1, section_text_item: "Locations" },
      { id: 2, section_text_item: "Qualifications" },
      { id: 3, section_text_item: "Bio" },
      { id: 4, section_text_item: "Reviews" },
      { id: 5, section_text_item: "Videos" },
      { id: 6, section_text_item: "Shop" },
      { id: 7, section_text_item: "Blogs" },
      { id: 8, section_text_item: "Website" },
      { id: 9, section_text_item: "Gallery" },
      { id: 10, section_text_item: "Instagram" },
      { id: 11, section_text_item: "LinkedIn" },
      { id: 12, section_text_item: "X" },
      { id: 13, section_text_item: "TikTok" },
    ],
  },
  footerCtaData: {
    title: "Start creating your {{brand}} today",
  },
};

// ─── Fetch + transform (single API call with nested resolution) ──────
async function fetchLandingPageContent(): Promise<LandingPageContent> {
  const entryId = process.env.CONTENTFUL_ENTRY_ID;

  if (!entryId) {
    console.warn("Contentful entry ID not set — using placeholder data");
    return PLACEHOLDER_DATA;
  }

  try {
    // include: 2 resolves nested references in ONE call instead of 6
    const landingPage = await client.getEntry(entryId, { include: 2 });
    const fields = landingPage.fields as Record<string, any>;

    // ── Extract hero ────────────────────────────────────────────────
    let heroData: HeroSectionData | null = null;
    let sectionData: SectionData | null = null;

    if (fields.heroSection) {
      const heroFields = fields.heroSection.fields;
      heroData = {
        hero_title: heroFields.heroTitle || "",
        hero_subtitle_bold: heroFields.heroBoldSubtitle || "",
        hero_subtitle_regular: heroFields.heroRegularSubtitle || "",
      };
      sectionData = {
        section_title: heroFields.sectionTitle || "",
        section_text_items: heroFields.sectionTextItems
          ? heroFields.sectionTextItems.map((item: string, index: number) => ({
              id: index,
              section_text_item: item,
            }))
          : [],
      };
    }

    // ── Extract features ────────────────────────────────────────────
    let featuresData: SectionData | null = null;
    if (fields.featuresSection) {
      const ff = fields.featuresSection.fields;
      featuresData = {
        section_title: ff.sectionTitle || "",
        section_text_items: ff.sectionTextItems
          ? ff.sectionTextItems.map((item: string, index: number) => ({
              id: index,
              section_text_item: item,
            }))
          : [],
      };
    }

    // ── Extract footer CTA ──────────────────────────────────────────
    let footerCtaData: FooterCtaData | null = null;
    if (fields.footerCta) {
      footerCtaData = { title: fields.footerCta.fields.title || "" };
    }

    // ── Helper for simple title/description sections ────────────────
    const extractTitleDesc = (ref: any): TitleDescriptionData | null => {
      if (!ref) return null;
      return {
        title: ref.fields.title || "",
        description: ref.fields.description || "",
      };
    };

    return {
      title: fields.title || PLACEHOLDER_DATA.title,
      description: fields.description || PLACEHOLDER_DATA.description,
      heroData,
      sectionData,
      sectionOneData: extractTitleDesc(fields.sectionOne),
      sectionTwoData: extractTitleDesc(fields.sectionTwo),
      sectionThreeData: extractTitleDesc(fields.sectionThree),
      featuresData,
      footerCtaData,
    };
  } catch (error) {
    console.error(
      "Contentful fetch failed — falling back to placeholder data:",
      error,
    );
    return PLACEHOLDER_DATA;
  }
}

// ─── Cached version (revalidates every 1 hour) ──────────────────────
// This means Contentful is called at most once per hour instead of on
// every request. Adjust the revalidation period as needed.
export const getLandingPageContent = unstable_cache(
  fetchLandingPageContent,
  ["contentful-landing-page"],
  { revalidate: 3600 }, // 1 hour in seconds
);
