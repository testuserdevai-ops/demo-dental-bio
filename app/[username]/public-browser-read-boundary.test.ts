import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const publicComponentSource = [
  "components/WorkLocation.tsx",
  "components/Footer.tsx",
]
  .map((relativePath) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  )
  .join("\n");

const publicProfileDataSource = [
  "_lib/public-profile.ts",
  "blog/[slug]/_lib/public-blog-query.ts",
  "../../utils/lookupDomainUser.ts",
  "../sitemap.xml/route.js",
]
  .map((relativePath) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  )
  .join("\n");

test("public profile components render server-provided data without browser Supabase reads", () => {
  expect(publicComponentSource).not.toContain("@/utils/supabase/client");
  expect(publicComponentSource).not.toContain("@/lib/supabase/browser");
  expect(publicComponentSource).not.toMatch(
    /\.from\(["'](?:socials|dentistry_locations)["']\)/,
  );
});

test("public profile routing reads the approved directory instead of private user records", () => {
  expect(publicProfileDataSource).toContain('.from("public_profiles")');
  expect(publicProfileDataSource).toContain("profile_presentation");
  expect(publicProfileDataSource).toContain("profile_presentation_revision");
  expect(publicProfileDataSource).not.toMatch(/\.from\(["']users["']\)/);
  expect(publicProfileDataSource).not.toContain("/rest/v1/users");
});
