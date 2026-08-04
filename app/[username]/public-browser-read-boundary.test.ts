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

test("public profile components render server-provided data without browser Supabase reads", () => {
  expect(publicComponentSource).not.toContain("@/utils/supabase/client");
  expect(publicComponentSource).not.toContain("@/lib/supabase/browser");
  expect(publicComponentSource).not.toMatch(
    /\.from\(["'](?:socials|dentistry_locations)["']\)/,
  );
});
