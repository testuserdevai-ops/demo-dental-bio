import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const directTemplates = [
  "BasicProfileTemplate.tsx",
  "DirectBookingProfileTemplate.tsx",
  "ServicesCatalogueProfileTemplate.tsx",
  "CosmeticTransformationProfileTemplate.tsx",
  "TrustFirstFamilyProfileTemplate.tsx",
  "SpecialistAssessmentProfileTemplate.tsx",
  "ClinicCommerceProfileTemplate.tsx",
  "ExpertEducatorProfileTemplate.tsx",
] as const;

const ownerTitles = [
  ["template-basic", "More reviews from our patients"],
  ["template-direct-booking", "More reviews before you book"],
  ["template-location-router", "More reviews from every location"],
  ["template-services-catalogue", "More reviews of our services"],
  ["template-cosmetic-results", "More smile transformation reviews"],
  ["template-trust-first", "More family dentistry reviews"],
  ["template-specialist-assessment", "More specialist care reviews"],
  ["template-clinic-commerce", "More reviews of our clinic"],
  ["template-expert-educator", "More educational and clinical reviews"],
] as const;

describe("owner-managed external review section titles", () => {
  it("passes the projected owner title through every public template", () => {
    for (const file of directTemplates) {
      const source = read(`app/[username]/_components/${file}`);
      expect(source).toContain("externalReviewSectionTitle={");
      expect(source).toContain("external_review_section_title");
    }

    const routerTemplate = read(
      "app/[username]/_components/LocationRouterProfileTemplate.tsx",
    );
    const routerReviews = read(
      "app/[username]/_components/LocationRouterReviews.tsx",
    );
    expect(routerTemplate).toContain(
      "externalReviewSectionTitle={dentistry.external_review_section_title}",
    );
    expect(routerReviews).toContain(
      "externalReviewSectionTitle={externalReviewSectionTitle}",
    );
  });

  it("loads only the public projection value and has no static section fallback", () => {
    const loader = read("app/[username]/_lib/public-profile.ts");
    const section = read(
      "app/[username]/_components/ProfileReviewsSection.tsx",
    );
    expect(loader).toContain(
      "service_section_title, external_review_section_title",
    );
    expect(loader).toContain("directory.external_review_section_title");
    expect(section).toContain("resolveExternalReviewSectionTitle");
    expect(section).toContain("aria-labelledby=");
    expect(section).not.toContain('aria-label="External review pages"');
    expect(section).not.toContain(">More reviews<");
  });

  it("seeds an exact owner-authored heading for all nine showcases", () => {
    const seed = read(
      "supabase/seeds/template-showcases/zz-external-review-section-titles.sql",
    );
    for (const [username, title] of ownerTitles) {
      expect(seed).toContain(`('${username}', '${title}')`);
    }
    expect(seed.match(/\('template-/g)).toHaveLength(9);
  });
});
