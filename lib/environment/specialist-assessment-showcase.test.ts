import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import { usernameSchema } from "@/lib/auth/schemas";

const root = process.cwd();
const username = "template-specialist-assessment";

describe("Specialist Assessment local showcase", () => {
  test("uses a stable route inside the username boundary", () => {
    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
  });

  test("seeds the private source with controlled assessment answers and rich relationships", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/specialist-assessment.sql",
      ),
      "utf8",
    );

    for (const expected of [
      "do $template_specialist_assessment_seed$",
      "template-specialist-assessment@dentalbio.local",
      '"username":"template-specialist-assessment"',
      '"templateId":"specialist-assessment"',
      '"themeId":"modern-specialist"',
      '"primaryPath":"assessment"',
      '"referralRequired":true',
      "insert into public.dentistry_treatments",
      "insert into public.link_groups",
      "insert into public.general_galleries",
      "insert into public.reviews",
      "from public.users source",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("ships a dedicated high-resolution WebP clinician portrait", async () => {
    const image = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/5a5e5500-0000-4000-8000-000000000002/specialist-assessment-profile.webp",
      ),
    );

    expect(image.subarray(0, 4).toString()).toBe("RIFF");
    expect(image.byteLength).toBeGreaterThan(50_000);
  });
});
